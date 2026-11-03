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
