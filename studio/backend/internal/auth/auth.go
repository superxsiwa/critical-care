// Package auth is who is calling: the credential (a JWT in an httpOnly cookie), the guard every /api/
// request passes (CSRF on writes, the caller resolved once, the cookie sliding forward, admin-only
// routes), sign-in with Google (google.go) or a password with throttling, and the accounts an admin
// manages. Nobody signs up.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

// The cookies: the credential (httpOnly), and the CSRF double-submit token our page's script reads
// and echoes in a header (Angular's HttpClient does it by itself, with these names).
const (
	SessionCookie = "casestudio_session"
	CSRFCookie    = "XSRF-TOKEN"
	CSRFHeader    = "X-XSRF-TOKEN"
)

// Idle is how long a session lasts without a request; renewAfter is how old a token gets before a
// request slides it forward.
const (
	Idle       = 12 * time.Hour
	renewAfter = 10 * time.Minute
)

// User is the signed-in caller. Google says whether a Google account is tied to it; HasPassword
// whether it has a password (a Google-only account has none).
type User struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Admin       bool   `json:"admin"`
	Google      bool   `json:"google"`
	HasPassword bool   `json:"hasPassword"`
}

func userOf(u store.User) *User {
	return &User{ID: u.ID, Username: u.Username, Name: u.Name, Email: u.Email.String, Admin: u.Admin,
		Google: u.GoogleSub.Valid, HasPassword: u.PasswordHash != ""}
}

// credential is what a session is bound to: the password hash and the Google tie.
func credential(u store.User) string { return u.PasswordHash + "|" + u.GoogleSub.String }

type ctxKey struct{}

// FromContext is the caller the guard resolved, or nil on the routes open to everybody.
func FromContext(ctx context.Context) *User {
	u, _ := ctx.Value(ctxKey{}).(*User)
	return u
}

// Service is sign-in and the accounts.
type Service struct {
	db       *sql.DB
	log      *slog.Logger
	token    token
	now      func() time.Time // the record clock (created_at, updated_at)
	throttle *throttle
	google   *googleSignIn // nil: Google sign-in is not set up (no client id)
}

// New makes the service. secret signs the sessions (LoadSecret); now is the record clock; google
// turns Google sign-in on when it has a client id.
func New(db *sql.DB, log *slog.Logger, secret []byte, now func() time.Time, google GoogleConfig) *Service {
	s := &Service{db: db, log: log, token: token{secret: secret, lifetime: Idle, now: time.Now}, now: now,
		throttle: newThrottle()}
	if google.ClientID != "" {
		s.google = newGoogleSignIn(google, secret)
	}
	return s
}

func (s *Service) q() *store.Queries { return store.New(s.db) }

func (s *Service) stamp() string { return s.now().UTC().Format(time.RFC3339) }

// open are the /api routes that answer without a session: the app's facts, who is signed in, signing
// in or out, and the published cases the app follows.
func open(path string) bool {
	switch path {
	case "/api/meta", "/api/auth/session", "/api/auth/signin", "/api/auth/signout",
		"/api/auth/google/start", "/api/auth/google/callback",
		"/api/published": // the app's feed (step 10): what is published is public, read only
		return true
	}
	return strings.HasPrefix(path, "/api/published/")
}

// Guard checks every /api request: a write must come from our own page (CSRF), a closed route needs
// a signed-in caller who is still active, /api/users needs an admin. The caller is put in the request
// context, and the session slides forward.
func (s *Service) Guard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		if !safeMethod(r.Method) {
			if problem := csrfProblem(r); problem != "" {
				s.log.Warn("csrf refused", "path", r.URL.Path, "why", problem)
				httpx.Refuse(w, http.StatusForbidden, "This request did not come from the studio's own page: reload it", "csrf")
				return
			}
		}
		u, issued, cred := s.current(r)
		if u == nil {
			if !open(r.URL.Path) {
				httpx.Refuse(w, http.StatusUnauthorized, "Sign in first", "signed-out")
				return
			}
			next.ServeHTTP(w, r)
			return
		}
		if (r.URL.Path == "/api/users" || strings.HasPrefix(r.URL.Path, "/api/users/")) && !u.Admin {
			httpx.Refuse(w, http.StatusForbidden, "Only an admin can manage accounts", "admin-only")
			return
		}
		if time.Since(issued) > renewAfter && r.URL.Path != "/api/auth/signout" {
			s.setSession(w, r, u.ID, cred)
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, u)))
	})
}

// current is the caller of r, the time their token was issued and their credential, or nil: a valid
// token, an account that exists and is on, and the credential the token was issued under.
func (s *Service) current(r *http.Request) (*User, time.Time, string) {
	c, err := r.Cookie(SessionCookie)
	if err != nil || c.Value == "" {
		return nil, time.Time{}, ""
	}
	p, err := s.token.parse(c.Value)
	if err != nil {
		return nil, time.Time{}, ""
	}
	row, err := s.q().GetUser(r.Context(), p.userID)
	if err != nil || !row.Active {
		return nil, time.Time{}, ""
	}
	want := sessionAuthHash(s.token.secret, credential(row))
	if subtle.ConstantTimeCompare([]byte(want), []byte(p.sah)) != 1 {
		return nil, time.Time{}, ""
	}
	return userOf(row), p.issuedAt, credential(row)
}

func (s *Service) setSession(w http.ResponseWriter, r *http.Request, userID int64, cred string) {
	raw, exp, err := s.token.issue(userID, cred)
	if err != nil {
		s.log.Error("issue session", "err", err)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: SessionCookie, Value: raw, Path: "/", Expires: exp, HttpOnly: true,
		Secure: IsHTTPS(r), SameSite: http.SameSiteLaxMode})
}

func clearSession(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: SessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true,
		Secure: IsHTTPS(r), SameSite: http.SameSiteLaxMode})
}

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

// csrfProblem is why a write is refused, or "". Double submit: another site can make the browser
// send our cookie but cannot read it, so it cannot write the header. And when the browser names an
// Origin, it must be the host it called.
func csrfProblem(r *http.Request) string {
	if origin := r.Header.Get("Origin"); origin != "" && origin != "null" {
		u, err := url.Parse(origin)
		if err != nil || u.Host == "" {
			return "bad origin"
		}
		if !strings.EqualFold(u.Host, r.Host) {
			return "cross-origin"
		}
	}
	c, err := r.Cookie(CSRFCookie)
	if err != nil || c.Value == "" {
		return "no csrf cookie"
	}
	h := r.Header.Get(CSRFHeader)
	if h == "" || subtle.ConstantTimeCompare([]byte(h), []byte(c.Value)) != 1 {
		return "csrf token mismatch"
	}
	return ""
}

// ensureCSRFCookie gives the browser its double-submit token when it has none (GET /api/auth/session,
// the first thing the page asks).
func ensureCSRFCookie(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(CSRFCookie); err == nil && len(c.Value) >= 32 {
		return
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return
	}
	http.SetCookie(w, &http.Cookie{Name: CSRFCookie, Value: base64.RawURLEncoding.EncodeToString(b), Path: "/",
		Secure: IsHTTPS(r), SameSite: http.SameSiteLaxMode})
}

// fromThisMachine says whether the request came from this machine: a reverse proxy here (one that ends
// HTTPS in front of the studio) is the only one whose X-Forwarded headers are believed.
func fromThisMachine(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return false
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// IsHTTPS says whether the browser reached us over HTTPS (directly, or through a proxy on this machine):
// the cookies are then sent over HTTPS only.
func IsHTTPS(r *http.Request) bool {
	return r.TLS != nil || (fromThisMachine(r) && r.Header.Get("X-Forwarded-Proto") == "https")
}

// clientIP is the caller's address for throttling: through a proxy on this machine, the address it saw.
func clientIP(r *http.Request) string {
	if fromThisMachine(r) {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			parts := strings.Split(fwd, ",")
			return strings.TrimSpace(parts[len(parts)-1])
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
