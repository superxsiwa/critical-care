package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// THE CREDENTIAL IS A JWT IN AN httpOnly COOKIE (the suite's design):
//
//	| Claim | Why |
//	| sub   | the user id |
//	| sah   | a hash of the stored password hash: a password change ends every other session |
//	| iat   | read by the sliding renewal |
//	| exp   | the idle window |
//
// Whether the account is still on is read on every request, not carried in the token, so switching
// an account off takes effect at its next request. Wall-clock time: a credential's life is a real
// duration.

// sessionAuthHash binds a token to the password it was issued under.
func sessionAuthHash(secret []byte, passwordHash string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte("casestudio.session|" + passwordHash))
	return hex.EncodeToString(m.Sum(nil))
}

type claims struct {
	Sah string `json:"sah"`
	jwt.RegisteredClaims
}

type token struct {
	secret   []byte
	lifetime time.Duration
	now      func() time.Time
}

func (t token) issue(userID int64, passwordHash string) (string, time.Time, error) {
	now := t.now()
	exp := now.Add(t.lifetime)
	c := claims{
		Sah: sessionAuthHash(t.secret, passwordHash),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	raw, err := jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(t.secret)
	return raw, exp, err
}

var errToken = errors.New("not a valid token")

type parsed struct {
	userID   int64
	sah      string
	issuedAt time.Time
}

// parse returns the claims of a valid, unexpired HS256 token. One error for every failure: "not
// signed in" is all an expired token and a forged one deserve.
func (t token) parse(raw string) (parsed, error) {
	var c claims
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithTimeFunc(t.now),
	)
	if err != nil || c.Sah == "" || c.IssuedAt == nil {
		return parsed{}, errToken
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil || id <= 0 {
		return parsed{}, errToken
	}
	return parsed{userID: id, sah: c.Sah, issuedAt: c.IssuedAt.Time}, nil
}

// LoadSecret reads the key sessions are signed with from path, making a new random one (readable by
// this user only) the first time. A new key signs everybody out.
func LoadSecret(path string) ([]byte, error) {
	if data, err := os.ReadFile(path); err == nil {
		key, err := hex.DecodeString(string(data))
		if err != nil || len(key) < 32 {
			return nil, fmt.Errorf("%s is not a session key: remove it to make a new one", path)
		}
		return key, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, []byte(hex.EncodeToString(key)), 0o600); err != nil {
		return nil, err
	}
	return key, nil
}
