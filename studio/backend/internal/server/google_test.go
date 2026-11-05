package server_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-jose/go-jose/v4"
	"github.com/golang-jwt/jwt/v5"

	"casestudio/internal/auth"
	"casestudio/internal/db"
	"casestudio/internal/migrate"
	"casestudio/internal/server"
)

const (
	clientID     = "test-client.apps.googleusercontent.com"
	clientSecret = "GOCSPX-test-secret"
)

// person is who the fake Google says signed in, and how it answers.
type person struct {
	Sub, Email string
	Verified   bool
	Deny       bool   // the person says no at Google
	Nonce      string // a nonce other than the one asked for (a replayed token)
	Audience   string // an audience other than our client (a token for another app)
}

// fakeGoogle is an OpenID Connect provider as Google is one: discovery, an authorization endpoint
// that answers at once as the current person, a token endpoint that checks the client and PKCE, and
// RS256 ID tokens with their key set.
type fakeGoogle struct {
	*httptest.Server
	key *rsa.PrivateKey

	mu     sync.Mutex
	as     person
	codes  map[string]grant
	tokens int // codes exchanged
}

type grant struct {
	challenge, nonce, redirect string
	as                         person
}

func newFakeGoogle(t *testing.T) *fakeGoogle {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	g := &fakeGoogle{key: key, codes: map[string]grant{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"issuer": g.URL, "authorization_endpoint": g.URL + "/auth", "token_endpoint": g.URL + "/token",
			"jwks_uri": g.URL + "/jwks", "id_token_signing_alg_values_supported": []string{"RS256"},
		})
	})
	mux.HandleFunc("GET /jwks", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(jose.JSONWebKeySet{Keys: []jose.JSONWebKey{
			{Key: &key.PublicKey, KeyID: "k1", Algorithm: "RS256", Use: "sig"}}})
	})
	mux.HandleFunc("GET /auth", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		back, _ := url.Parse(q.Get("redirect_uri"))
		v := url.Values{"state": {q.Get("state")}}
		g.mu.Lock()
		as := g.as
		ok := q.Get("client_id") == clientID && q.Get("response_type") == "code" &&
			q.Get("code_challenge_method") == "S256" && strings.Contains(q.Get("scope"), "openid")
		if as.Deny {
			v.Set("error", "access_denied")
		} else if !ok {
			v.Set("error", "invalid_request")
		} else {
			code := "code-" + strconv.Itoa(len(g.codes)+1)
			g.codes[code] = grant{q.Get("code_challenge"), q.Get("nonce"), q.Get("redirect_uri"), as}
			v.Set("code", code)
		}
		g.mu.Unlock()
		back.RawQuery = v.Encode()
		http.Redirect(w, r, back.String(), http.StatusFound)
	})
	mux.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		id, secret, okBasic := r.BasicAuth()
		if !okBasic {
			id, secret = r.Form.Get("client_id"), r.Form.Get("client_secret")
		}
		g.mu.Lock()
		gr, found := g.codes[r.Form.Get("code")]
		delete(g.codes, r.Form.Get("code")) // one use
		g.tokens++
		g.mu.Unlock()
		sum := sha256.Sum256([]byte(r.Form.Get("code_verifier")))
		if id != clientID || secret != clientSecret || !found || gr.redirect != r.Form.Get("redirect_uri") ||
			base64.RawURLEncoding.EncodeToString(sum[:]) != gr.challenge {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			io.WriteString(w, `{"error":"invalid_grant"}`)
			return
		}
		nonce, aud := gr.nonce, clientID
		if gr.as.Nonce != "" {
			nonce = gr.as.Nonce
		}
		if gr.as.Audience != "" {
			aud = gr.as.Audience
		}
		now := time.Now()
		tok := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
			"iss": g.URL, "aud": aud, "sub": gr.as.Sub, "email": gr.as.Email, "email_verified": gr.as.Verified,
			"nonce": nonce, "iat": now.Unix(), "exp": now.Add(time.Hour).Unix(),
		})
		tok.Header["kid"] = "k1"
		raw, err := tok.SignedString(g.key)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"access_token": "at", "token_type": "Bearer", "expires_in": 3600, "id_token": raw})
	})
	g.Server = httptest.NewServer(mux)
	t.Cleanup(g.Close)
	return g
}

func (g *fakeGoogle) signInAs(p person) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.as = p
}

// googleStudio is a studio with Google sign-in on, pointed at the fake, and its admin signed in.
func googleStudio(t *testing.T) (*httptest.Server, *fakeGoogle, *sql.DB) {
	t.Helper()
	g := newFakeGoogle(t)
	d, err := db.Open(filepath.Join(t.TempDir(), "casestudio.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { d.Close() })
	if err := migrate.Up(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	srv := httptest.NewServer(server.New(server.Deps{DB: d, Log: log, Now: func() time.Time { return fixed },
		Secret: []byte("a test secret of at least 32 bytes!"),
		Google: auth.GoogleConfig{ClientID: clientID, ClientSecret: clientSecret, Issuer: g.URL}}))
	t.Cleanup(srv.Close)
	addAccount(t, d, "admin", "Admin", adminPassword, true)
	signIn(t, srv, srv.Client(), "admin", adminPassword)
	return srv, g, d
}

// google runs a Google sign-in in a browser c from start (its query: next=, popup=) and returns the
// page it ends on (path and query).
func google(t *testing.T, srv *httptest.Server, c *http.Client, query string) string {
	t.Helper()
	res, err := c.Get(srv.URL + "/api/auth/google/start?" + query)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	return res.Request.URL.RequestURI()
}

func freshBrowser() *http.Client {
	jar, _ := cookiejar.New(nil)
	return &http.Client{Jar: jar}
}

// whoIs is who c is signed in as (nil: nobody).
func whoIs(t *testing.T, srv *httptest.Server, c *http.Client) *auth.User {
	t.Helper()
	var who struct{ User *auth.User }
	send(t, srv, c, "GET", "/api/auth/session", nil, &who)
	return who.User
}

func TestGoogleSignInTiesTheAccountByEmailThenKnowsItBySub(t *testing.T) {
	srv, g, _ := googleStudio(t)
	var anna auth.Account
	if code, body := call(t, srv, "POST", "/api/users", map[string]any{
		"username": "anna", "name": "Anna", "email": " Anna@Example.com ",
	}, &anna); code != 201 {
		t.Fatalf("a Google-only account: %d %s", code, body)
	}
	if anna.Email != "anna@example.com" || anna.HasPassword || anna.Google {
		t.Fatalf("stored as %+v", anna)
	}
	// Google says the email in other letters: it is the same address.
	g.signInAs(person{Sub: "g-anna", Email: "ANNA@example.com", Verified: true})
	c := freshBrowser()
	if end := google(t, srv, c, "next=%2Fcase"); end != "/case" {
		t.Fatalf("ends on %s", end)
	}
	if u := whoIs(t, srv, c); u == nil || u.Username != "anna" || !u.Google || u.HasPassword {
		t.Fatalf("signed in as %+v", u)
	}
	// Later Google sign-ins match Google's id, whatever the email is by then.
	g.signInAs(person{Sub: "g-anna", Email: "anna.new@example.com", Verified: true})
	c2 := freshBrowser()
	if end := google(t, srv, c2, ""); end != "/" {
		t.Fatalf("second sign-in ends on %s", end)
	}
	if u := whoIs(t, srv, c2); u == nil || u.Username != "anna" {
		t.Fatalf("second sign-in as %+v", u)
	}
	// Signed in with Google, Anna sets a fallback password without a current one.
	if code, body := send(t, srv, c2, "PUT", "/api/auth/password", map[string]string{"current": "", "next": "anna-fallback-1"}, nil); code != 204 {
		t.Fatalf("fallback password: %d %s", code, body)
	}
	if u := whoIs(t, srv, c2); u == nil || !u.HasPassword {
		t.Fatalf("after the fallback: %+v", u)
	}
	if u := whoIs(t, srv, c); u != nil {
		t.Errorf("her other session goes on after a new password: %+v", u)
	}
	pw := browser(srv)
	signIn(t, srv, pw, "anna", "anna-fallback-1")
}

func TestGoogleSignInRefusals(t *testing.T) {
	srv, g, d := googleStudio(t)
	addAccount(t, d, "bob", "Bob", "bob-password-1", false)
	for _, a := range []map[string]any{
		{"username": "anna", "name": "Anna", "email": "anna@example.com"},
		{"username": "off", "name": "Off", "email": "off@example.com"},
	} {
		if code, body := call(t, srv, "POST", "/api/users", a, nil); code != 201 {
			t.Fatalf("%v: %d %s", a, code, body)
		}
	}
	// Anna's account is tied to her Google account; "off" is switched off.
	g.signInAs(person{Sub: "g-anna", Email: "anna@example.com", Verified: true})
	google(t, srv, freshBrowser(), "")
	var accounts []auth.Account
	call(t, srv, "GET", "/api/users", nil, &accounts)
	for _, a := range accounts {
		if a.Username == "off" {
			call(t, srv, "PUT", "/api/users/"+strconv.FormatInt(a.ID, 10), map[string]any{"name": "Off", "active": false}, nil)
		}
	}
	for _, tc := range []struct {
		name, query string
		as          person
		want        string
	}{
		{"no account has the email", "", person{Sub: "g-x", Email: "x@example.com", Verified: true}, "/signin?google=no-account"},
		{"email not verified by Google", "", person{Sub: "g-y", Email: "anna@example.com"}, "/signin?google=unverified"},
		{"said no at Google", "next=%2Fcase", person{Deny: true}, "/signin?google=cancelled&next=%2Fcase"},
		{"another Google account has Anna's email", "", person{Sub: "g-other", Email: "anna@example.com", Verified: true}, "/signin?google=other-google"},
		{"switched off", "", person{Sub: "g-off", Email: "off@example.com", Verified: true}, "/signin?google=inactive"},
		{"a token for another nonce", "", person{Sub: "g-anna", Email: "anna@example.com", Verified: true, Nonce: "replayed"}, "/signin?google=failed"},
		{"a token for another app", "", person{Sub: "g-anna", Email: "anna@example.com", Verified: true, Audience: "other.apps.googleusercontent.com"}, "/signin?google=failed"},
		{"in the popup", "popup=1", person{Sub: "g-x", Email: "x@example.com", Verified: true}, "/signin/done?google=no-account"},
	} {
		g.signInAs(tc.as)
		c := freshBrowser()
		if end := google(t, srv, c, tc.query); end != tc.want {
			t.Errorf("%s: ends on %s, want %s", tc.name, end, tc.want)
		}
		if u := whoIs(t, srv, c); u != nil {
			t.Errorf("%s: signed in as %+v", tc.name, u)
		}
	}
	// A password-only account cannot be reached through Google at all.
	g.signInAs(person{Sub: "g-bob", Email: "bob@example.com", Verified: true})
	if end := google(t, srv, freshBrowser(), ""); end != "/signin?google=no-account" {
		t.Errorf("bob has no email: %s", end)
	}
}

func TestGoogleCallbackNeedsItsOwnStart(t *testing.T) {
	srv, g, _ := googleStudio(t)
	call(t, srv, "POST", "/api/users", map[string]any{"username": "anna", "name": "Anna", "email": "anna@example.com"}, nil)
	g.signInAs(person{Sub: "g-anna", Email: "anna@example.com", Verified: true})
	// Straight to the callback (a link someone was sent): no sign-in under way in this browser.
	c := freshBrowser()
	res, err := c.Get(srv.URL + "/api/auth/google/callback?state=s&code=code-1")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if end := res.Request.URL.RequestURI(); end != "/signin?google=expired" {
		t.Errorf("without a start: %s", end)
	}
	// A start in this browser, then a callback carrying another state: refused, and the code never
	// reaches the token endpoint.
	noFollow := &http.Client{Jar: c.Jar, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	res, err = noFollow.Get(srv.URL + "/api/auth/google/start")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	before := g.tokens
	res, err = noFollow.Get(srv.URL + "/api/auth/google/callback?state=not-ours&code=code-1")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if loc := res.Header.Get("Location"); loc != "/signin?google=failed" || g.tokens != before {
		t.Errorf("another state: %s, %d exchanges", loc, g.tokens-before)
	}
	if u := whoIs(t, srv, c); u != nil {
		t.Errorf("signed in as %+v", u)
	}
}

func TestGoogleNextStaysOnTheSite(t *testing.T) {
	srv, g, _ := googleStudio(t)
	call(t, srv, "POST", "/api/users", map[string]any{"username": "anna", "name": "Anna", "email": "anna@example.com"}, nil)
	g.signInAs(person{Sub: "g-anna", Email: "anna@example.com", Verified: true})
	for next, want := range map[string]string{
		"//evil.example/x": "/", "https://evil.example/": "/", "/\\evil.example": "/", "/api/users": "/",
		"/drafts/3": "/drafts/3",
	} {
		if end := google(t, srv, freshBrowser(), "next="+url.QueryEscape(next)); end != want {
			t.Errorf("next=%s ends on %s, want %s", next, end, want)
		}
	}
	if end := google(t, srv, freshBrowser(), "popup=1&next=%2Fcase"); end != "/signin/done" {
		t.Errorf("popup ends on %s", end)
	}
}

func TestUntyingGoogleEndsTheSessions(t *testing.T) {
	srv, g, _ := googleStudio(t)
	var anna auth.Account
	call(t, srv, "POST", "/api/users", map[string]any{"username": "anna", "name": "Anna", "email": "anna@example.com"}, &anna)
	g.signInAs(person{Sub: "g-anna", Email: "anna@example.com", Verified: true})
	c := freshBrowser()
	google(t, srv, c, "")
	if whoIs(t, srv, c) == nil {
		t.Fatal("not signed in")
	}
	id := strconv.FormatInt(anna.ID, 10)
	var after auth.Account
	if code, body := call(t, srv, "DELETE", "/api/users/"+id+"/google", nil, &after); code != 200 || after.Google {
		t.Fatalf("untie: %d %s", code, body)
	}
	if u := whoIs(t, srv, c); u != nil {
		t.Errorf("still signed in after the untie: %+v", u)
	}
	// Her next Google sign-in ties the account again, by its email.
	if google(t, srv, c, ""); whoIs(t, srv, c) == nil {
		t.Error("not signed in again")
	}
	// A new email unties it too: her Google account no longer gets in until the email matches.
	if code, body := call(t, srv, "PUT", "/api/users/"+id+"/email", map[string]string{"email": "anna@hospital.example"}, &after); code != 200 || after.Google || after.Email != "anna@hospital.example" {
		t.Fatalf("new email: %d %s", code, body)
	}
	if u := whoIs(t, srv, c); u != nil {
		t.Errorf("still signed in after a new email: %+v", u)
	}
	if end := google(t, srv, freshBrowser(), ""); end != "/signin?google=no-account" {
		t.Errorf("the old email: %s", end)
	}
}

func TestAccountEmailRules(t *testing.T) {
	srv, _, _ := googleStudio(t)
	for _, tc := range []struct {
		in   map[string]any
		want int
		code string
	}{
		{map[string]any{"username": "nobody", "name": "No way in"}, 422, auth.NoSignIn},
		{map[string]any{"username": "bad", "name": "Bad", "email": "not an email"}, 422, auth.EmailBad},
		{map[string]any{"username": "anna", "name": "Anna", "email": "anna@example.com"}, 201, ""},
		{map[string]any{"username": "anna2", "name": "Anna 2", "email": "ANNA@example.com"}, 409, auth.EmailTaken},
		{map[string]any{"username": "both", "name": "Both", "email": "both@example.com", "password": "both-password-1"}, 201, ""},
	} {
		var out refusal
		if code, _ := call(t, srv, "POST", "/api/users", tc.in, &out); code != tc.want || out.Code != tc.code {
			t.Errorf("%v: %d %q, want %d %q", tc.in, code, out.Code, tc.want, tc.code)
		}
	}
	var accounts []auth.Account
	call(t, srv, "GET", "/api/users", nil, &accounts)
	ids := map[string]string{}
	for _, a := range accounts {
		ids[a.Username] = strconv.FormatInt(a.ID, 10)
	}
	// A Google-only account keeps its email; one with a password may drop it.
	var out refusal
	if code, _ := call(t, srv, "PUT", "/api/users/"+ids["anna"]+"/email", map[string]string{"email": ""}, &out); code != 422 || out.Code != auth.NoSignIn {
		t.Errorf("anna without email: %d %+v", code, out)
	}
	if code, body := call(t, srv, "PUT", "/api/users/"+ids["both"]+"/email", map[string]string{"email": ""}, nil); code != 200 {
		t.Errorf("both without email: %d %s", code, body)
	}
	if code, _ := call(t, srv, "PUT", "/api/users/"+ids["both"]+"/email", map[string]string{"email": "anna@example.com"}, &out); code != 409 || out.Code != auth.EmailTaken {
		t.Errorf("someone else's email: %d %+v", code, out)
	}
	// A password sign-in never matches an account without a password.
	c := browser(srv)
	send(t, srv, c, "GET", "/api/auth/session", nil, nil)
	if code, _ := send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "anna", "password": ""}, nil); code != 401 {
		t.Errorf("anna with no password: %d", code)
	}
}

func TestGoogleOff(t *testing.T) {
	srv := studio(t)
	var s struct{ Google bool }
	send(t, srv, srv.Client(), "GET", "/api/auth/session", nil, &s)
	if s.Google {
		t.Error("session says Google is on")
	}
	var out refusal
	if code, _ := send(t, srv, freshBrowser(), "GET", "/api/auth/google/start", nil, &out); code != 404 || out.Code != "google-off" {
		t.Errorf("start with Google off: %d %+v", code, out)
	}
}
