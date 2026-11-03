package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

// argon2id with OWASP's minimum parameters (19 MiB, 2 passes, 1 lane), as the suite's other servers.
const (
	argonTime    = 2
	argonMemory  = 19 * 1024
	argonThreads = 1
	argonKeyLen  = 32
	argonSaltLen = 16
)

// verifying lets a few checks run at once: each takes 19 MiB and a core.
var verifying = make(chan struct{}, 4)

// MinPassword and MaxPassword bound a password's length in characters.
const (
	MinPassword = 10
	MaxPassword = 128
)

// HashPassword is the PHC string of pw: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>.
func HashPassword(pw string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(pw), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}

// dummyHash is checked when there is no real hash (an unknown username), so a refusal takes as long
// as a wrong password and its timing says nothing.
var dummyHash, _ = HashPassword("casestudio-timing-equaliser")

// CheckPassword says whether pw matches the PHC string. An empty or malformed hash never matches,
// but still costs one hash.
func CheckPassword(hash, pw string) bool {
	verifying <- struct{}{}
	defer func() { <-verifying }()
	ok, err := verify(hash, pw)
	if err != nil {
		_, _ = verify(dummyHash, pw)
		return false
	}
	return ok
}

func verify(hash, pw string) (bool, error) {
	parts := strings.Split(hash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, errors.New("not an argon2id hash")
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, errors.New("unknown argon2 version")
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil || m == 0 || t == 0 || p == 0 {
		return false, errors.New("bad argon2 parameters")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(want) == 0 {
		return false, errors.New("bad argon2 key")
	}
	got := argon2.IDKey([]byte(pw), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}

// The codes of what is wrong with a new password; the screen says them in its own words.
const (
	PasswordShort    = "password-short"
	PasswordLong     = "password-long"
	PasswordBlank    = "password-blank"
	PasswordUsername = "password-username"
	PasswordCommon   = "password-common"
)

// passwordDetails are the codes in the API's words.
var passwordDetails = map[string]string{
	PasswordShort:    fmt.Sprintf("A password needs at least %d characters", MinPassword),
	PasswordLong:     fmt.Sprintf("A password can have at most %d characters", MaxPassword),
	PasswordBlank:    "A password cannot be only spaces",
	PasswordUsername: "A password cannot be the username",
	PasswordCommon:   "This password is one everybody uses: choose another",
}

// PasswordProblem is the code of what is wrong with a new password, or "" when it will do. Length,
// not composition rules (NIST 800-63B): at least 10 characters, not the username, not a common one.
func PasswordProblem(pw, username string) string {
	n := utf8.RuneCountInString(pw)
	switch {
	case n < MinPassword:
		return PasswordShort
	case n > MaxPassword:
		return PasswordLong
	case strings.TrimSpace(pw) == "":
		return PasswordBlank
	case username != "" && strings.EqualFold(pw, username):
		return PasswordUsername
	case commonPasswords[strings.ToLower(strings.TrimSpace(pw))]:
		return PasswordCommon
	}
	return ""
}

// commonPasswords are those of 10 characters or more that guessing starts from, and this product's words.
var commonPasswords = map[string]bool{
	"1234567890": true, "0123456789": true, "12345678910": true, "123456789012": true, "1111111111": true,
	"0000000000": true, "9876543210": true, "qwertyuiop": true, "qwertyuiop1": true, "1q2w3e4r5t": true,
	"1qaz2wsx3edc": true, "password12": true, "password123": true, "password1234": true, "passw0rd123": true,
	"p@ssw0rd123": true, "administrator": true, "admin12345": true, "admin123456": true, "adminadmin": true,
	"welcome123": true, "welcome1234": true, "letmein1234": true, "changeme123": true, "iloveyou12": true,
	"asdfghjkl1": true, "abc1234567": true, "abcd123456": true, "aa12345678": true, "casestudio": true,
	"casestudio1": true, "criticalcare": true, "critical care": true, "instructor": true, "instructor1": true,
	"nursing123": true, "nurse12345": true, "ccunurse123": true,
}
