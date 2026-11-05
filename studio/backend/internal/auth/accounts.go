package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

const bodyLimit = 16 << 10

// usernamePattern: letters, digits, dot, dash and underscore, 2 to 40 of them (no spaces: it is typed
// at every sign-in). Usernames are told apart without regard to case.
var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9._-]{2,40}$`)

// emailPattern is a plain check (one @, a dot after it, no spaces): Google says whether it is real.
var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// Problem codes of an account, beside the password's (PasswordProblem).
const (
	UsernameBad   = "username-bad"
	UsernameTaken = "username-taken"
	NameBlank     = "name-blank"
	EmailBad      = "email-bad"
	EmailTaken    = "email-taken"
	NoSignIn      = "no-sign-in"
)

// ErrAccount is a refused account: Code says why, in the API's codes.
type ErrAccount struct{ Code string }

func (e ErrAccount) Error() string { return detailOf(e.Code) }

func detailOf(code string) string {
	switch code {
	case UsernameBad:
		return "A username has 2 to 40 letters, digits, dots, dashes or underscores"
	case UsernameTaken:
		return "This username is taken"
	case NameBlank:
		return "Say whose account it is (a name)"
	case EmailBad:
		return "This is not an email address"
	case EmailTaken:
		return "Another account has this email"
	case NoSignIn:
		return "Give the account a Google email, a password, or both: it needs a way to sign in"
	}
	if d, ok := passwordDetails[code]; ok {
		return d
	}
	return code
}

// AccountIn is a new account. Email is the person's Google email (they sign in with Google); Password
// is the fallback. One of the two is enough; both is usual.
type AccountIn struct {
	Username, Name, Email, Password string
	Admin                           bool
}

// cleanEmail is an email as stored (trimmed, lower case; "" for none), or a problem code.
func cleanEmail(s string) (string, string) {
	s = strings.ToLower(strings.TrimSpace(s))
	if s != "" && (len(s) > 254 || !emailPattern.MatchString(s)) {
		return "", EmailBad
	}
	return s, ""
}

func nullable(s string) sql.NullString { return sql.NullString{String: s, Valid: s != ""} }

// emailFree says whether no account but self has email.
func emailFree(ctx context.Context, q *store.Queries, email string, self int64) (bool, error) {
	u, err := q.GetUserByEmail(ctx, nullable(email))
	if errors.Is(err, sql.ErrNoRows) {
		return true, nil
	}
	return err == nil && u.ID == self, err
}

// NewAccount checks and adds an account; the API and the `casestudio user add` command both use it.
func NewAccount(ctx context.Context, q *store.Queries, in AccountIn, now string) (store.User, error) {
	username, name := strings.TrimSpace(in.Username), strings.TrimSpace(in.Name)
	if !usernamePattern.MatchString(username) {
		return store.User{}, ErrAccount{UsernameBad}
	}
	if name == "" {
		return store.User{}, ErrAccount{NameBlank}
	}
	email, code := cleanEmail(in.Email)
	if code != "" {
		return store.User{}, ErrAccount{code}
	}
	if email == "" && in.Password == "" {
		return store.User{}, ErrAccount{NoSignIn}
	}
	if in.Password != "" {
		if code := PasswordProblem(in.Password, username); code != "" {
			return store.User{}, ErrAccount{code}
		}
	}
	if _, err := q.GetUserByUsername(ctx, username); err == nil {
		return store.User{}, ErrAccount{UsernameTaken}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return store.User{}, err
	}
	if email != "" {
		if free, err := emailFree(ctx, q, email, 0); err != nil {
			return store.User{}, err
		} else if !free {
			return store.User{}, ErrAccount{EmailTaken}
		}
	}
	hash := ""
	if in.Password != "" {
		var err error
		if hash, err = HashPassword(in.Password); err != nil {
			return store.User{}, err
		}
	}
	return q.CreateUser(ctx, store.CreateUserParams{Username: username, Name: name, Email: nullable(email),
		PasswordHash: hash, Admin: in.Admin, Now: now})
}

// NewEmail checks and sets an account's Google email ("" for none). A new email unties the Google
// account (the next Google sign-in is matched by it), so the account's sessions end.
func NewEmail(ctx context.Context, q *store.Queries, u store.User, email, now string) error {
	email, code := cleanEmail(email)
	if code != "" {
		return ErrAccount{code}
	}
	if email == u.Email.String {
		return nil
	}
	if email == "" && u.PasswordHash == "" {
		return ErrAccount{NoSignIn}
	}
	if email != "" {
		if free, err := emailFree(ctx, q, email, u.ID); err != nil {
			return err
		} else if !free {
			return ErrAccount{EmailTaken}
		}
	}
	_, err := q.SetEmail(ctx, store.SetEmailParams{Email: nullable(email), Now: now, ID: u.ID})
	return err
}

// NewPassword checks and sets an account's password (by an admin, the account itself, or the
// `casestudio user password` command). Every other session of the account ends with it.
func NewPassword(ctx context.Context, q *store.Queries, u store.User, password, now string) error {
	if code := PasswordProblem(password, u.Username); code != "" {
		return ErrAccount{code}
	}
	hash, err := HashPassword(password)
	if err != nil {
		return err
	}
	_, err = q.SetPassword(ctx, store.SetPasswordParams{PasswordHash: hash, Now: now, ID: u.ID})
	return err
}

func refuseAccount(w http.ResponseWriter, s *Service, err error) {
	var e ErrAccount
	if errors.As(err, &e) {
		status := http.StatusUnprocessableEntity
		if e.Code == UsernameTaken || e.Code == EmailTaken {
			status = http.StatusConflict
		}
		httpx.Refuse(w, status, detailOf(e.Code), e.Code)
		return
	}
	httpx.Fail(w, s.log, err)
}

// Mount registers sign-in and the accounts' routes.
func (s *Service) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/auth/session", s.session)
	mux.HandleFunc("POST /api/auth/signin", s.signIn)
	mux.HandleFunc("POST /api/auth/signout", s.signOut)
	mux.HandleFunc("PUT /api/auth/password", s.ownPassword)
	mux.HandleFunc("GET /api/users", s.listUsers)
	mux.HandleFunc("POST /api/users", s.createUser)
	mux.HandleFunc("PUT /api/users/{id}", s.updateUser)
	mux.HandleFunc("PUT /api/users/{id}/password", s.resetPassword)
	mux.HandleFunc("PUT /api/users/{id}/email", s.setEmail)
	mux.HandleFunc("DELETE /api/users/{id}/google", s.unlinkGoogle)
	mux.HandleFunc("GET /api/auth/google/start", s.googleStart)
	mux.HandleFunc("GET /api/auth/google/callback", s.googleCallback)
}

// session says who is signed in ({"user": null} when nobody) and whether Google sign-in is on, and
// gives the page its CSRF token.
func (s *Service) session(w http.ResponseWriter, r *http.Request) {
	ensureCSRFCookie(w, r)
	httpx.JSON(w, http.StatusOK, map[string]any{"user": FromContext(r.Context()), "google": s.google != nil})
}

func (s *Service) signIn(w http.ResponseWriter, r *http.Request) {
	var in struct{ Username, Password string }
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	ip := clientIP(r)
	keys := []string{pairKey(in.Username, ip), userKey(in.Username), ipKey(ip)}
	if wait := s.throttle.take(keys...); wait > 0 {
		minutes := int(math.Ceil(wait.Minutes()))
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
		httpx.JSON(w, http.StatusTooManyRequests, map[string]any{
			"detail": fmt.Sprintf("Too many wrong passwords: try again in %d minutes", minutes),
			"code":   "throttled", "minutes": minutes,
		})
		return
	}
	row, err := s.q().GetUserByUsername(r.Context(), strings.TrimSpace(in.Username))
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		httpx.Fail(w, s.log, err)
		return
	}
	if !CheckPassword(row.PasswordHash, in.Password) {
		s.log.Info("sign-in refused", "ip", ip)
		httpx.Refuse(w, http.StatusUnauthorized, "The username or password is wrong", "wrong")
		return
	}
	s.throttle.giveBack(keys, pairKey(in.Username, ip))
	if !row.Active {
		httpx.Refuse(w, http.StatusForbidden, "This account is switched off: ask an admin", "inactive")
		return
	}
	s.setSession(w, r, row.ID, credential(row))
	s.log.Info("signed in", "user", row.ID)
	httpx.JSON(w, http.StatusOK, map[string]any{"user": userOf(row)})
}

func (s *Service) signOut(w http.ResponseWriter, r *http.Request) {
	clearSession(w, r)
	w.WriteHeader(http.StatusNoContent)
}

// ownPassword changes the caller's password, after their current one (none is asked when the account
// has no password yet: signed in with Google, they set a fallback): the session goes on, every other
// session of theirs ends.
func (s *Service) ownPassword(w http.ResponseWriter, r *http.Request) {
	me := FromContext(r.Context())
	var in struct{ Current, Next string }
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	if wait := s.throttle.take(ownKey(me.Username)); wait > 0 {
		httpx.Refuse(w, http.StatusTooManyRequests, fmt.Sprintf("Too many wrong passwords: try again in %d minutes",
			int(math.Ceil(wait.Minutes()))), "throttled")
		return
	}
	row, err := s.q().GetUser(r.Context(), me.ID)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	if row.PasswordHash != "" && !CheckPassword(row.PasswordHash, in.Current) {
		httpx.Refuse(w, http.StatusUnprocessableEntity, "The current password is wrong", "wrong")
		return
	}
	s.throttle.giveBack(nil, ownKey(me.Username))
	if err := NewPassword(r.Context(), s.q(), row, in.Next, s.stamp()); err != nil {
		refuseAccount(w, s, err)
		return
	}
	row, err = s.q().GetUser(r.Context(), me.ID)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	s.setSession(w, r, row.ID, credential(row))
	w.WriteHeader(http.StatusNoContent)
}

// Account is an account as an admin sees it.
type Account struct {
	User
	Active    bool   `json:"active"`
	CreatedAt string `json:"createdAt"`
}

func accountOf(u store.User) Account {
	return Account{User: *userOf(u), Active: u.Active, CreatedAt: u.CreatedAt}
}

func (s *Service) listUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListUsers(r.Context())
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	out := make([]Account, len(rows))
	for i, u := range rows {
		out[i] = accountOf(u)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Service) createUser(w http.ResponseWriter, r *http.Request) {
	var in AccountIn
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	u, err := NewAccount(r.Context(), s.q(), in, s.stamp())
	if err != nil {
		refuseAccount(w, s, err)
		return
	}
	s.log.Info("account added", "user", u.ID, "by", FromContext(r.Context()).ID)
	httpx.JSON(w, http.StatusCreated, accountOf(u))
}

func (s *Service) target(w http.ResponseWriter, r *http.Request) (store.User, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err == nil {
		var u store.User
		if u, err = s.q().GetUser(r.Context(), id); err == nil {
			return u, true
		}
		if !errors.Is(err, sql.ErrNoRows) {
			httpx.Fail(w, s.log, err)
			return store.User{}, false
		}
	}
	httpx.Refuse(w, http.StatusNotFound, "No such account", "not-found")
	return store.User{}, false
}

// updateUser changes an account's name, whether it is an admin, and whether it is on. An admin
// cannot take their own admin away or switch themself off, and one active admin always remains.
func (s *Service) updateUser(w http.ResponseWriter, r *http.Request) {
	u, ok := s.target(w, r)
	if !ok {
		return
	}
	var in struct {
		Name          string
		Admin, Active bool
	}
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		httpx.Refuse(w, http.StatusUnprocessableEntity, detailOf(NameBlank), NameBlank)
		return
	}
	me := FromContext(r.Context())
	if u.ID == me.ID && (!in.Admin || !in.Active) {
		httpx.Refuse(w, http.StatusUnprocessableEntity, "You cannot switch off your own account or your own admin rights", "self")
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	defer tx.Rollback()
	q := store.New(tx)
	updated, err := q.UpdateUser(r.Context(), store.UpdateUserParams{Name: strings.TrimSpace(in.Name), Admin: in.Admin,
		Active: in.Active, Now: s.stamp(), ID: u.ID})
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	if n, err := q.CountActiveAdmins(r.Context()); err != nil || n == 0 {
		if err != nil {
			httpx.Fail(w, s.log, err)
			return
		}
		httpx.Refuse(w, http.StatusUnprocessableEntity, "One active admin must remain", "last-admin")
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	s.log.Info("account changed", "user", u.ID, "by", me.ID, "admin", in.Admin, "active", in.Active)
	httpx.JSON(w, http.StatusOK, accountOf(updated))
}

// resetPassword sets another account's password (they are told it, then change it themselves); their
// sessions end with it.
func (s *Service) resetPassword(w http.ResponseWriter, r *http.Request) {
	u, ok := s.target(w, r)
	if !ok {
		return
	}
	var in struct{ Password string }
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	if err := NewPassword(r.Context(), s.q(), u, in.Password, s.stamp()); err != nil {
		refuseAccount(w, s, err)
		return
	}
	s.log.Info("password reset", "user", u.ID, "by", FromContext(r.Context()).ID)
	s.renewOwn(w, r, u.ID)
	w.WriteHeader(http.StatusNoContent)
}

// renewOwn gives the caller a session bound to their new credential when the account changed is
// their own (their other sessions end).
func (s *Service) renewOwn(w http.ResponseWriter, r *http.Request, id int64) {
	if id != FromContext(r.Context()).ID {
		return
	}
	if row, err := s.q().GetUser(r.Context(), id); err == nil {
		s.setSession(w, r, row.ID, credential(row))
	}
}

// setEmail sets an account's Google email ({"email": ""} removes it); a new one unties the Google
// account, and the account's sessions end.
func (s *Service) setEmail(w http.ResponseWriter, r *http.Request) {
	u, ok := s.target(w, r)
	if !ok {
		return
	}
	var in struct{ Email string }
	if err := httpx.Decode(w, r, &in, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return
	}
	if err := NewEmail(r.Context(), s.q(), u, in.Email, s.stamp()); err != nil {
		refuseAccount(w, s, err)
		return
	}
	s.log.Info("email changed", "user", u.ID, "by", FromContext(r.Context()).ID)
	s.renewOwn(w, r, u.ID)
	s.answerAccount(w, r, u.ID)
}

// unlinkGoogle unties the account's Google account (the person's Google account was replaced): the
// next Google sign-in with the account's email ties it again. The account's sessions end.
func (s *Service) unlinkGoogle(w http.ResponseWriter, r *http.Request) {
	u, ok := s.target(w, r)
	if !ok {
		return
	}
	if _, err := s.q().UnlinkGoogle(r.Context(), store.UnlinkGoogleParams{Now: s.stamp(), ID: u.ID}); err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	s.log.Info("google untied", "user", u.ID, "by", FromContext(r.Context()).ID)
	s.renewOwn(w, r, u.ID)
	s.answerAccount(w, r, u.ID)
}

func (s *Service) answerAccount(w http.ResponseWriter, r *http.Request, id int64) {
	row, err := s.q().GetUser(r.Context(), id)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	httpx.JSON(w, http.StatusOK, accountOf(row))
}
