package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"

	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

// SIGN-IN WITH GOOGLE (the default since 2026-11-05; the password stays as a fallback):
//
//	| Step                          | What happens                                                         |
//	| GET /api/auth/google/start    | a state, a nonce and a PKCE verifier go in a short signed cookie;     |
//	|                               | the browser goes to Google (openid, email, profile; account chooser)  |
//	| GET /api/auth/google/callback | the state is checked against the cookie, the code exchanged (with the |
//	|                               | verifier), the ID token verified (issuer, audience, expiry, signature,|
//	|                               | nonce), the email must be verified by Google                          |
//	| the account                   | the Google account already tied (sub), else an account whose email is |
//	|                               | that email and has no Google account yet: it is tied now              |
//
// Nobody signs up: a Google account that matches no account an admin made is refused. A popup (the
// sign-in dialog over a page with unsaved edits) ends on /signin/done, which tells the page and
// closes itself.

// GoogleConfig turns Google sign-in on when ClientID is set. PublicURL is where people open the
// studio (https://studio.criticalcare.212cafe.com): Google sends them back to PublicURL +
// /api/auth/google/callback, which must be one of the client's redirect URIs; without it the
// request's own address is used (local runs). Issuer is Google's unless a test points it at a fake.
type GoogleConfig struct {
	ClientID, ClientSecret, PublicURL, Issuer string
}

// GoogleIssuer is Google's OpenID Connect issuer.
const GoogleIssuer = "https://accounts.google.com"

const (
	googleCallback = "/api/auth/google/callback"
	flowCookie     = "casestudio_google"
	flowLife       = 10 * time.Minute
	popupState     = "p." // a state that starts so came from the popup (known even without the cookie)
)

// Why a Google sign-in was refused, as /signin?google=<code> says it (the page has the words).
const (
	GoogleCancelled   = "cancelled"    // the person said no at Google
	GoogleExpired     = "expired"      // no sign-in under way here (cookie gone: too slow, or another tab)
	GoogleFailed      = "failed"       // the answer from Google did not check out
	GoogleUnavailable = "unavailable"  // Google could not be reached
	GoogleUnverified  = "unverified"   // Google has not verified the account's email
	GoogleNoAccount   = "no-account"   // no account here has this email
	GoogleOtherGoogle = "other-google" // the account with this email is tied to another Google account
	GoogleInactive    = "inactive"     // the account is switched off
)

type googleSignIn struct {
	cfg    GoogleConfig
	key    []byte // signs the flow cookie (derived from the session key, kept apart from sessions)
	client *http.Client

	mu       sync.Mutex
	provider *oidc.Provider // Google's settings, fetched at the first sign-in (again after a failure)
}

func newGoogleSignIn(cfg GoogleConfig, secret []byte) *googleSignIn {
	if cfg.Issuer == "" {
		cfg.Issuer = GoogleIssuer
	}
	cfg.PublicURL = strings.TrimRight(cfg.PublicURL, "/")
	m := hmac.New(sha256.New, secret)
	m.Write([]byte("casestudio.google-flow"))
	return &googleSignIn{cfg: cfg, key: m.Sum(nil), client: &http.Client{Timeout: 15 * time.Second}}
}

func (g *googleSignIn) discover(ctx context.Context) (*oidc.Provider, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.provider != nil {
		return g.provider, nil
	}
	p, err := oidc.NewProvider(oidc.ClientContext(ctx, g.client), g.cfg.Issuer)
	if err != nil {
		return nil, err
	}
	g.provider = p
	return p, nil
}

func (g *googleSignIn) oauth(p *oidc.Provider, r *http.Request) *oauth2.Config {
	base := g.cfg.PublicURL
	if base == "" {
		scheme := "http"
		if IsHTTPS(r) {
			scheme = "https"
		}
		base = scheme + "://" + r.Host
	}
	return &oauth2.Config{ClientID: g.cfg.ClientID, ClientSecret: g.cfg.ClientSecret, Endpoint: p.Endpoint(),
		RedirectURL: base + googleCallback, Scopes: []string{oidc.ScopeOpenID, "email", "profile"}}
}

// flowClaims is the sign-in under way, in its cookie.
type flowClaims struct {
	State    string `json:"st"`
	Nonce    string `json:"nn"`
	Verifier string `json:"pv"`
	Next     string `json:"nx"`
	jwt.RegisteredClaims
}

func (g *googleSignIn) signFlow(f flowClaims) (string, error) {
	now := time.Now()
	f.IssuedAt = jwt.NewNumericDate(now)
	f.ExpiresAt = jwt.NewNumericDate(now.Add(flowLife))
	return jwt.NewWithClaims(jwt.SigningMethodHS256, f).SignedString(g.key)
}

func (g *googleSignIn) parseFlow(raw string) (flowClaims, bool) {
	var f flowClaims
	_, err := jwt.ParseWithClaims(raw, &f, func(*jwt.Token) (any, error) { return g.key, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	return f, err == nil && f.State != "" && f.Nonce != "" && f.Verifier != ""
}

func randomText() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b) // never fails (crypto/rand)
	return base64.RawURLEncoding.EncodeToString(b)
}

// SafeNext is a page of this studio to go on to after signing in: a path on this site, else "/".
func SafeNext(next string) string {
	if !strings.HasPrefix(next, "/") || strings.HasPrefix(next, "//") || strings.HasPrefix(next, "/\\") ||
		strings.HasPrefix(next, "/api/") || strings.ContainsAny(next, "\r\n") {
		return "/"
	}
	return next
}

func setFlowCookie(w http.ResponseWriter, r *http.Request, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{Name: flowCookie, Value: value, Path: "/api/auth/google/", MaxAge: maxAge,
		HttpOnly: true, Secure: IsHTTPS(r), SameSite: http.SameSiteLaxMode})
}

// googleStart sends the browser to Google. ?next= is the page to go on to; ?popup=1 when it runs in
// the sign-in dialog's popup.
func (s *Service) googleStart(w http.ResponseWriter, r *http.Request) {
	g := s.google
	if g == nil {
		httpx.Refuse(w, http.StatusNotFound, "Google sign-in is not set up here", "google-off")
		return
	}
	popup := r.URL.Query().Get("popup") == "1"
	next := SafeNext(r.URL.Query().Get("next"))
	p, err := g.discover(r.Context())
	if err != nil {
		s.log.Warn("google unreachable", "err", err)
		s.googleRefused(w, r, GoogleUnavailable, popup, next)
		return
	}
	f := flowClaims{State: randomText(), Nonce: randomText(), Verifier: oauth2.GenerateVerifier(), Next: next}
	if popup {
		f.State = popupState + f.State
	}
	raw, err := g.signFlow(f)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	setFlowCookie(w, r, raw, int(flowLife.Seconds()))
	http.Redirect(w, r, g.oauth(p, r).AuthCodeURL(f.State, oidc.Nonce(f.Nonce),
		oauth2.S256ChallengeOption(f.Verifier), oauth2.SetAuthURLParam("prompt", "select_account")), http.StatusFound)
}

// googleCallback is where Google sends the browser back: the person is signed in, or told why not.
func (s *Service) googleCallback(w http.ResponseWriter, r *http.Request) {
	g := s.google
	if g == nil {
		httpx.Refuse(w, http.StatusNotFound, "Google sign-in is not set up here", "google-off")
		return
	}
	q := r.URL.Query()
	state := q.Get("state")
	popup := strings.HasPrefix(state, popupState)
	setFlowCookie(w, r, "", -1) // one use
	c, err := r.Cookie(flowCookie)
	if err != nil {
		s.googleRefused(w, r, GoogleExpired, popup, "/")
		return
	}
	f, ok := g.parseFlow(c.Value)
	if !ok {
		s.googleRefused(w, r, GoogleExpired, popup, "/")
		return
	}
	if subtle.ConstantTimeCompare([]byte(state), []byte(f.State)) != 1 {
		s.log.Warn("google state differs")
		s.googleRefused(w, r, GoogleFailed, popup, f.Next)
		return
	}
	if e := q.Get("error"); e != "" {
		code := GoogleFailed
		if e == "access_denied" {
			code = GoogleCancelled
		}
		s.googleRefused(w, r, code, popup, f.Next)
		return
	}
	p, err := g.discover(r.Context())
	if err != nil {
		s.log.Warn("google unreachable", "err", err)
		s.googleRefused(w, r, GoogleUnavailable, popup, f.Next)
		return
	}
	ctx := oidc.ClientContext(r.Context(), g.client)
	tok, err := g.oauth(p, r).Exchange(ctx, q.Get("code"), oauth2.VerifierOption(f.Verifier))
	if err != nil {
		s.log.Warn("google code refused", "err", err)
		s.googleRefused(w, r, GoogleFailed, popup, f.Next)
		return
	}
	rawID, _ := tok.Extra("id_token").(string)
	idt, err := p.Verifier(&oidc.Config{ClientID: g.cfg.ClientID}).Verify(ctx, rawID)
	if err != nil || subtle.ConstantTimeCompare([]byte(idt.Nonce), []byte(f.Nonce)) != 1 {
		s.log.Warn("google id token refused", "err", err)
		s.googleRefused(w, r, GoogleFailed, popup, f.Next)
		return
	}
	var claims struct {
		Email    string `json:"email"`
		Verified bool   `json:"email_verified"`
	}
	if err := idt.Claims(&claims); err != nil || !claims.Verified || claims.Email == "" {
		s.googleRefused(w, r, GoogleUnverified, popup, f.Next)
		return
	}
	row, code, err := s.googleAccount(r.Context(), idt.Subject, claims.Email)
	if err != nil {
		httpx.Fail(w, s.log, err)
		return
	}
	if code != "" {
		s.log.Info("google sign-in refused", "why", code)
		s.googleRefused(w, r, code, popup, f.Next)
		return
	}
	s.setSession(w, r, row.ID, credential(row))
	s.log.Info("signed in with google", "user", row.ID)
	if popup {
		http.Redirect(w, r, "/signin/done", http.StatusFound)
		return
	}
	http.Redirect(w, r, f.Next, http.StatusFound)
}

// googleAccount is the account a Google sign-in is for (tying it on the first sign-in), or why none.
func (s *Service) googleAccount(ctx context.Context, sub, email string) (store.User, string, error) {
	q := s.q()
	row, err := q.GetUserByGoogleSub(ctx, nullable(sub))
	if errors.Is(err, sql.ErrNoRows) {
		row, err = q.GetUserByEmail(ctx, nullable(strings.ToLower(email)))
		if errors.Is(err, sql.ErrNoRows) {
			return store.User{}, GoogleNoAccount, nil
		}
		if err != nil {
			return store.User{}, "", err
		}
		if row.GoogleSub.Valid {
			return store.User{}, GoogleOtherGoogle, nil
		}
		n, err := q.LinkGoogle(ctx, store.LinkGoogleParams{GoogleSub: nullable(sub), Now: s.stamp(), ID: row.ID})
		if err != nil {
			return store.User{}, "", err
		}
		if n != 1 {
			return store.User{}, GoogleOtherGoogle, nil
		}
		s.log.Info("google tied", "user", row.ID)
		if row, err = q.GetUser(ctx, row.ID); err != nil {
			return store.User{}, "", err
		}
	} else if err != nil {
		return store.User{}, "", err
	}
	if !row.Active {
		return store.User{}, GoogleInactive, nil
	}
	return row, "", nil
}

// googleRefused sends the browser to the sign-in page (or the popup's end) saying why.
func (s *Service) googleRefused(w http.ResponseWriter, r *http.Request, code string, popup bool, next string) {
	v := url.Values{"google": {code}}
	if popup {
		http.Redirect(w, r, "/signin/done?"+v.Encode(), http.StatusFound)
		return
	}
	if next != "/" {
		v.Set("next", next)
	}
	http.Redirect(w, r, "/signin?"+v.Encode(), http.StatusFound)
}
