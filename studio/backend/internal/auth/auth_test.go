package auth

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestPasswords(t *testing.T) {
	h, err := HashPassword("a-long-password")
	if err != nil || !strings.HasPrefix(h, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("hash: %q %v", h, err)
	}
	if !CheckPassword(h, "a-long-password") || CheckPassword(h, "a-long-passwore") || CheckPassword("", "x") || CheckPassword("garbage", "x") {
		t.Fatal("check")
	}
	for pw, want := range map[string]string{
		"short":                  PasswordShort,
		strings.Repeat("x", 129): PasswordLong,
		"          ":             PasswordBlank,
		"Instructor1":            PasswordCommon,
		"anna.bennett":           PasswordUsername,
		"tray-sterile-07":        "",
	} {
		if got := PasswordProblem(pw, "Anna.Bennett"); got != want {
			t.Errorf("%q: %q, want %q", pw, got, want)
		}
	}
}

func TestTokens(t *testing.T) {
	now := time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)
	tok := token{secret: []byte("secret one, at least 32 bytes long"), lifetime: time.Hour, now: func() time.Time { return now }}
	raw, exp, err := tok.issue(7, "$argon2id$hash")
	if err != nil || !exp.Equal(now.Add(time.Hour)) {
		t.Fatal(err)
	}
	p, err := tok.parse(raw)
	if err != nil || p.userID != 7 || p.sah != sessionAuthHash(tok.secret, "$argon2id$hash") || !p.issuedAt.Equal(now) {
		t.Fatalf("parse: %+v %v", p, err)
	}
	// Another key, an expired token, an unsigned one: all the same refusal.
	other := tok
	other.secret = []byte("secret two, at least 32 bytes long")
	if _, err := other.parse(raw); err != errToken {
		t.Errorf("another key: %v", err)
	}
	later := tok
	later.now = func() time.Time { return now.Add(time.Hour + time.Second) }
	if _, err := later.parse(raw); err != errToken {
		t.Errorf("expired: %v", err)
	}
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, claims{Sah: "x", RegisteredClaims: jwt.RegisteredClaims{
		Subject: "7", IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
	}}).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if _, err := tok.parse(none); err != errToken {
		t.Errorf("alg none: %v", err)
	}
}

func TestThrottle(t *testing.T) {
	now := time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)
	th := newThrottle()
	th.now = func() time.Time { return now }
	keys := []string{pairKey("anna", "1.2.3.4"), userKey("anna"), ipKey("1.2.3.4")}
	for i := 0; i < MaxPairFailures; i++ {
		if w := th.take(keys...); w != 0 {
			t.Fatalf("attempt %d waits %v", i+1, w)
		}
	}
	if w := th.take(keys...); w != FailureWindow {
		t.Fatalf("after %d: wait %v", MaxPairFailures, w)
	}
	// Another address may still try this username; the window passes.
	if w := th.take(pairKey("anna", "5.6.7.8"), userKey("anna"), ipKey("5.6.7.8")); w != 0 {
		t.Fatalf("another address: %v", w)
	}
	now = now.Add(FailureWindow)
	if w := th.take(keys...); w != 0 {
		t.Fatalf("after the window: %v", w)
	}
	// A success gives its attempt back and forgets the pair.
	th.giveBack(keys, keys[0])
	if _, ok := th.m[keys[0]]; ok {
		t.Fatal("pair kept after a success")
	}
}

func TestSecretFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "session.key")
	a, err := LoadSecret(path)
	if err != nil || len(a) != 32 {
		t.Fatal(err)
	}
	if info, _ := os.Stat(path); info.Mode().Perm() != 0o600 {
		t.Fatalf("mode %v", info.Mode())
	}
	b, err := LoadSecret(path)
	if err != nil || string(a) != string(b) {
		t.Fatal("not the same key on the second start")
	}
	_ = os.WriteFile(path, []byte("nonsense"), 0o600)
	if _, err := LoadSecret(path); err == nil {
		t.Fatal("a broken key file was accepted")
	}
}
