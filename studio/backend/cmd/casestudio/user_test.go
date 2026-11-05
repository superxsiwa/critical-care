package main

import (
	"bytes"
	"context"
	"path/filepath"
	"strings"
	"testing"

	"casestudio/internal/auth"
	"casestudio/internal/db"
	"casestudio/internal/migrate"
	"casestudio/internal/store"
)

func TestUserCommand(t *testing.T) {
	d, err := db.Open(filepath.Join(t.TempDir(), "casestudio.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	if err := migrate.Up(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	run := func(input string, args ...string) (string, error) {
		var out bytes.Buffer
		err := user(d, args, strings.NewReader(input), &out)
		return out.String(), err
	}
	if out, err := run("first-admin-pw\n", "add", "anna", "--name", "Anna Bennett", "--admin"); err != nil || out != "added anna (Anna Bennett), admin\n" {
		t.Fatalf("add: %q %v", out, err)
	}
	if _, err := run("short\n", "add", "ben", "--name", "Ben"); err == nil || !strings.Contains(err.Error(), "at least 10") {
		t.Fatalf("a short password: %v", err)
	}
	if _, err := run("", "add", "ben", "--name", "Ben"); err == nil {
		t.Fatal("no password on the input was accepted")
	}
	if _, err := run("x\n", "add", "--admin"); err == nil {
		t.Fatal("no username was accepted")
	}
	if _, err := run("new-admin-pw-2\n", "password", "ANNA"); err != nil {
		t.Fatal(err)
	}
	u, _ := store.New(d).GetUserByUsername(context.Background(), "anna")
	if !auth.CheckPassword(u.PasswordHash, "new-admin-pw-2") || !u.Admin {
		t.Fatalf("after password: %+v", u)
	}
	if out, _ := run("", "list"); !strings.Contains(out, "anna") || !strings.Contains(out, "Anna Bennett") {
		t.Fatalf("list: %q", out)
	}
	if out, _ := run(""); !strings.Contains(out, "casestudio user add") {
		t.Fatalf("help: %q", out)
	}
}

func TestUserCommandGoogle(t *testing.T) {
	d, err := db.Open(filepath.Join(t.TempDir(), "casestudio.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	if err := migrate.Up(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	run := func(input string, args ...string) (string, error) {
		var out bytes.Buffer
		err := user(d, args, strings.NewReader(input), &out)
		return out.String(), err
	}
	// With --email the password line may be empty: a Google-only account.
	if out, err := run("\n", "add", "tn", "--name", "Thanee N.", "--email", "TN@colabscraft.com", "--admin"); err != nil ||
		out != "added tn (Thanee N.), admin, Google tn@colabscraft.com\n" {
		t.Fatalf("add with --email: %q %v", out, err)
	}
	if _, err := run("\n", "add", "ben", "--name", "Ben"); err == nil {
		t.Fatal("no password and no email was accepted")
	}
	if out, err := run("", "add", "pw", "--name", "Pat"); err == nil || out != "" {
		t.Fatalf("no input at all: %q %v", out, err)
	}
	run("pat-password-1\n", "add", "pat", "--name", "Pat")
	if out, err := run("", "email", "pat", "Pat@Example.com"); err != nil || out != "pat signs in with Google as pat@example.com\n" {
		t.Fatalf("email: %q %v", out, err)
	}
	if _, err := run("", "email", "pat", "tn@colabscraft.com"); err == nil || !strings.Contains(err.Error(), "Another account") {
		t.Fatalf("someone else's email: %v", err)
	}
	if _, err := run("", "email", "tn"); err == nil || !strings.Contains(err.Error(), "needs a way to sign in") {
		t.Fatalf("a Google-only account without email: %v", err)
	}
	if out, err := run("", "email", "pat"); err != nil || out != "pat has no Google email now\n" {
		t.Fatalf("remove: %q %v", out, err)
	}
	u, _ := store.New(d).GetUserByUsername(context.Background(), "tn")
	if u.PasswordHash != "" || u.Email.String != "tn@colabscraft.com" || auth.CheckPassword(u.PasswordHash, "") {
		t.Fatalf("tn stored as %+v", u)
	}
	out, _ := run("", "list")
	if !strings.Contains(out, "EMAIL") || !strings.Contains(out, "tn@colabscraft.com") {
		t.Fatalf("list: %q", out)
	}
}
