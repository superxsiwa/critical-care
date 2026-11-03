package server_test

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"casestudio/internal/auth"
)

type refusal struct {
	Detail, Code string
}

// signedOut is a browser that asked for its CSRF token but never signed in.
func signedOut(t *testing.T, srv *httptest.Server) *http.Client {
	c := browser(srv)
	send(t, srv, c, "GET", "/api/auth/session", nil, nil)
	return c
}

// Every route but the open ones needs a session. The list is every route the server mounts: a new
// one must be added here (open, or closed).
func TestEveryClosedRouteNeedsASession(t *testing.T) {
	srv := studio(t)
	c := signedOut(t, srv)
	closed := [][2]string{
		{"GET", "/api/drafts"}, {"POST", "/api/drafts"}, {"GET", "/api/drafts/1"}, {"PUT", "/api/drafts/1"},
		{"DELETE", "/api/drafts/1?version=1"}, {"POST", "/api/check"}, {"POST", "/api/import"}, {"GET", "/api/package"},
		{"GET", "/api/users"}, {"POST", "/api/users"}, {"PUT", "/api/users/1"}, {"PUT", "/api/users/1/password"},
		{"PUT", "/api/auth/password"}, {"GET", "/api/nothing"},
	}
	for _, r := range closed {
		var out refusal
		if code, _ := send(t, srv, c, r[0], r[1], map[string]any{}, &out); code != 401 || out.Code != "signed-out" {
			t.Errorf("%s %s without a session: %d %+v", r[0], r[1], code, out)
		}
	}
	var meta struct{ PackageFormat string }
	if code, _ := send(t, srv, c, "GET", "/api/meta", nil, &meta); code != 200 || meta.PackageFormat == "" {
		t.Errorf("meta is open: %d", code)
	}
	var who struct{ User *auth.User }
	if code, _ := send(t, srv, c, "GET", "/api/auth/session", nil, &who); code != 200 || who.User != nil {
		t.Errorf("session signed out: %d %+v", code, who.User)
	}
	send(t, srv, srv.Client(), "GET", "/api/auth/session", nil, &who)
	if who.User == nil || who.User.Username != "admin" || !who.User.Admin {
		t.Errorf("session signed in: %+v", who.User)
	}
}

func TestWritesMustComeFromOurPage(t *testing.T) {
	srv := studio(t)
	// No CSRF header: a plain client with the session cookie but without the echo.
	plain := &http.Client{Transport: srv.Client().Transport, Jar: srv.Client().Jar}
	req, _ := http.NewRequest("POST", srv.URL+"/api/drafts", strings.NewReader(`{"case":{}}`))
	res, err := plain.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 403 {
		t.Errorf("a write without the CSRF header: %d", res.StatusCode)
	}
	// Another site's page: the browser names its Origin.
	req, _ = http.NewRequest("POST", srv.URL+"/api/auth/signout", nil)
	req.Header.Set("Origin", "https://evil.example")
	res, err = plain.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 403 {
		t.Errorf("a cross-origin write: %d", res.StatusCode)
	}
}

func TestSignIn(t *testing.T) {
	srv, d := studioDB(t)
	addAccount(t, d, "anna", "Anna", "anna-password-1", false)
	c := signedOut(t, srv)
	var out refusal
	for _, pw := range []string{"wrong-password", "anna-password-2"} {
		if code, _ := send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "anna", "password": pw}, &out); code != 401 || out.Code != "wrong" {
			t.Fatalf("wrong password: %d %+v", code, out)
		}
	}
	if code, _ := send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "nobody", "password": "x"}, &out); code != 401 || out.Code != "wrong" {
		t.Fatalf("unknown username says the same: %d %+v", code, out)
	}
	// Usernames are told apart without regard to case; the session works at once.
	var who struct{ User auth.User }
	if code, body := send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "ANNA", "password": "anna-password-1"}, &who); code != 200 || who.User.Name != "Anna" || who.User.Admin {
		t.Fatalf("sign in: %d %s", code, body)
	}
	if code, _ := send(t, srv, c, "GET", "/api/drafts", nil, nil); code != 200 {
		t.Fatalf("drafts after sign-in: %d", code)
	}
	// An instructor works on the shared drafts but does not manage accounts.
	if code, _ := send(t, srv, c, "GET", "/api/users", nil, &out); code != 403 || out.Code != "admin-only" {
		t.Fatalf("an instructor at /api/users: %d %+v", code, out)
	}
	var d1 struct{ ID int64 }
	send(t, srv, srv.Client(), "POST", "/api/drafts", map[string]any{"case": minimalCase(t)}, &d1)
	var saved struct{ UpdatedBy string }
	if code, body := send(t, srv, c, "PUT", "/api/drafts/1", map[string]any{"version": 1, "case": minimalCase(t)}, &saved); code != 200 || saved.UpdatedBy != "Anna" {
		t.Fatalf("an instructor saves an admin's draft: %d %s", code, body)
	}
	var list []struct{ UpdatedBy string }
	send(t, srv, srv.Client(), "GET", "/api/drafts", nil, &list)
	if len(list) != 1 || list[0].UpdatedBy != "Anna" {
		t.Fatalf("the list says who saved: %+v", list)
	}
	// Signing out ends the session.
	if code, _ := send(t, srv, c, "POST", "/api/auth/signout", nil, nil); code != 204 {
		t.Fatalf("sign out: %d", code)
	}
	if code, _ := send(t, srv, c, "GET", "/api/drafts", nil, nil); code != 401 {
		t.Fatalf("after sign-out: %d", code)
	}
}

func TestSignInIsThrottled(t *testing.T) {
	srv, d := studioDB(t)
	addAccount(t, d, "anna", "Anna", "anna-password-1", false)
	c := signedOut(t, srv)
	for i := 0; i < auth.MaxPairFailures; i++ {
		send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "anna", "password": "guess"}, nil)
	}
	var out struct {
		Code    string
		Minutes int
	}
	// The next attempt waits, even with the right password: it is not even checked.
	if code, _ := send(t, srv, c, "POST", "/api/auth/signin", map[string]string{"username": "anna", "password": "anna-password-1"}, &out); code != 429 || out.Code != "throttled" || out.Minutes < 1 {
		t.Fatalf("after %d wrong passwords: %d %+v", auth.MaxPairFailures, code, out)
	}
	// Another account from the same address is not locked by it.
	signIn(t, srv, browser(srv), "admin", adminPassword)
}

func TestSwitchingAnAccountOffEndsItsSession(t *testing.T) {
	srv, d := studioDB(t)
	addAccount(t, d, "anna", "Anna", "anna-password-1", false)
	anna := browser(srv)
	signIn(t, srv, anna, "anna", "anna-password-1")
	var users []auth.Account
	send(t, srv, srv.Client(), "GET", "/api/users", nil, &users)
	if len(users) != 2 {
		t.Fatalf("users: %+v", users)
	}
	id := users[1].ID
	if users[0].Username == "anna" {
		id = users[0].ID
	}
	path := "/api/users/" + itoa(id)
	if code, body := call(t, srv, "PUT", path, map[string]any{"name": "Anna B.", "admin": false, "active": false}, nil); code != 200 {
		t.Fatalf("switch off: %d %s", code, body)
	}
	if code, _ := send(t, srv, anna, "GET", "/api/drafts", nil, nil); code != 401 {
		t.Fatalf("a switched-off account's session: %d", code)
	}
	var out refusal
	if code, _ := send(t, srv, anna, "POST", "/api/auth/signin", map[string]string{"username": "anna", "password": "anna-password-1"}, &out); code != 403 || out.Code != "inactive" {
		t.Fatalf("signing in switched off: %d %+v", code, out)
	}
	// An admin cannot switch themself off or drop their own admin rights.
	var me []auth.Account
	send(t, srv, srv.Client(), "GET", "/api/users", nil, &me)
	for _, u := range me {
		if u.Username != "admin" {
			continue
		}
		for _, body := range []map[string]any{{"name": "Admin", "admin": false, "active": true}, {"name": "Admin", "admin": true, "active": false}} {
			if code, _ := call(t, srv, "PUT", "/api/users/"+itoa(u.ID), body, &out); code != 422 || out.Code != "self" {
				t.Errorf("self %v: %d %+v", body, code, out)
			}
		}
	}
}

func TestAPasswordChangeEndsTheOtherSessions(t *testing.T) {
	srv, d := studioDB(t)
	addAccount(t, d, "anna", "Anna", "anna-password-1", false)
	desk, phone := browser(srv), browser(srv)
	signIn(t, srv, desk, "anna", "anna-password-1")
	signIn(t, srv, phone, "anna", "anna-password-1")
	var out refusal
	if code, _ := send(t, srv, desk, "PUT", "/api/auth/password", map[string]string{"current": "nope", "next": "anna-password-2"}, &out); code != 422 || out.Code != "wrong" {
		t.Fatalf("a wrong current password: %d %+v", code, out)
	}
	if code, _ := send(t, srv, desk, "PUT", "/api/auth/password", map[string]string{"current": "anna-password-1", "next": "short"}, &out); code != 422 || out.Code != auth.PasswordShort {
		t.Fatalf("a short new password: %d %+v", code, out)
	}
	if code, body := send(t, srv, desk, "PUT", "/api/auth/password", map[string]string{"current": "anna-password-1", "next": "anna-password-2"}, nil); code != 204 {
		t.Fatalf("change: %d %s", code, body)
	}
	if code, _ := send(t, srv, desk, "GET", "/api/drafts", nil, nil); code != 200 {
		t.Fatalf("the session that changed it goes on: %d", code)
	}
	if code, _ := send(t, srv, phone, "GET", "/api/drafts", nil, nil); code != 401 {
		t.Fatalf("the other session ends: %d", code)
	}
	signIn(t, srv, phone, "anna", "anna-password-2")
}

func TestAccountsAnAdminAdds(t *testing.T) {
	srv := studio(t)
	var out refusal
	cases := []struct {
		body map[string]any
		code int
		want string
	}{
		{map[string]any{"username": "a b", "name": "A", "password": "a-long-password"}, 422, auth.UsernameBad},
		{map[string]any{"username": "anna", "name": " ", "password": "a-long-password"}, 422, auth.NameBlank},
		{map[string]any{"username": "anna", "name": "Anna", "password": "anna"}, 422, auth.PasswordShort},
		{map[string]any{"username": "anna", "name": "Anna", "password": "password123"}, 422, auth.PasswordCommon},
		{map[string]any{"username": "anna.b", "name": "Anna", "password": "Anna.B"}, 422, auth.PasswordShort},
		{map[string]any{"username": "anna", "name": "Anna", "password": "a-long-password"}, 201, ""},
		{map[string]any{"username": "Anna", "name": "Anna 2", "password": "a-long-password"}, 409, auth.UsernameTaken},
	}
	for _, c := range cases {
		out = refusal{}
		if code, body := call(t, srv, "POST", "/api/users", c.body, &out); code != c.code || out.Code != c.want {
			t.Errorf("%v: %d %s", c.body, code, body)
		}
	}
	var users []auth.Account
	call(t, srv, "GET", "/api/users", nil, &users)
	var anna auth.Account
	for _, u := range users {
		if u.Username == "anna" {
			anna = u
		}
	}
	if !anna.Active || anna.Admin {
		t.Fatalf("the new account: %+v", anna)
	}
	if code, _ := call(t, srv, "PUT", "/api/users/"+itoa(anna.ID)+"/password", map[string]string{"password": "a-new-password-2"}, nil); code != 204 {
		t.Fatalf("reset: %d", code)
	}
	signIn(t, srv, browser(srv), "anna", "a-new-password-2")
}

// The cookies: the session is httpOnly and SameSite; behind HTTPS (a proxy on this machine says so)
// both are sent over HTTPS only.
func TestSessionCookies(t *testing.T) {
	srv := studio(t)
	c := browser(srv)
	req, _ := http.NewRequest("GET", srv.URL+"/api/auth/session", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	res, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	for _, k := range res.Cookies() {
		if k.Name == auth.CSRFCookie && (!k.Secure || k.HttpOnly) {
			t.Errorf("CSRF cookie behind HTTPS: %+v", k)
		}
	}
	csrf := ""
	for _, k := range res.Cookies() {
		if k.Name == auth.CSRFCookie {
			csrf = k.Value
		}
	}
	req, _ = http.NewRequest("POST", srv.URL+"/api/auth/signin", strings.NewReader(`{"username":"admin","password":"`+adminPassword+`"}`))
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set(auth.CSRFHeader, csrf)
	req.AddCookie(&http.Cookie{Name: auth.CSRFCookie, Value: csrf})
	res, err = http.DefaultTransport.RoundTrip(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	found := false
	for _, k := range res.Cookies() {
		if k.Name == auth.SessionCookie {
			found = true
			if !k.HttpOnly || !k.Secure || k.SameSite != http.SameSiteLaxMode {
				t.Errorf("session cookie: %+v", k)
			}
		}
	}
	if !found {
		t.Fatalf("no session cookie: %d", res.StatusCode)
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
