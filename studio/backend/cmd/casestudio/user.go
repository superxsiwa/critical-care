package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io"
	"strings"
	"text/tabwriter"
	"time"

	"casestudio/internal/auth"
	"casestudio/internal/store"
)

const userHelp = `casestudio user: the accounts (nobody signs up; an admin adds each one)

  casestudio user add <username> --name <name> [--email <google email>] [--admin]   add an account
  casestudio user password <username>        set a new password (for a lost one)
  casestudio user email <username> [<email>] set the Google email (none: remove it); unties Google
  casestudio user list                       every account

The password is read from the input (one line), so it never shows in the shell's history:
  read -rs PW && printf '%s\n' "$PW" | casestudio user add anna --name "Anna" --admin
With --email the password may be an empty line: the account signs in with Google only.`

// user runs `casestudio user ...`; the password comes from in.
func user(d *sql.DB, args []string, in io.Reader, out io.Writer) error {
	if len(args) == 0 {
		_, err := io.WriteString(out, userHelp+"\n")
		return err
	}
	ctx := context.Background()
	q := store.New(d)
	now := time.Now().UTC().Format(time.RFC3339)
	switch args[0] {
	case "add":
		fs := flag.NewFlagSet("user add", flag.ContinueOnError)
		name := fs.String("name", "", "whose account it is")
		admin := fs.Bool("admin", false, "may manage the accounts")
		email := fs.String("email", "", "the person's Google email (they sign in with Google)")
		if len(args) < 2 || strings.HasPrefix(args[1], "-") {
			return errors.New("usage: casestudio user add <username> --name <name> [--email <email>] [--admin]")
		}
		username := args[1]
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		if fs.NArg() > 0 {
			return fmt.Errorf("unexpected %q (a name with spaces goes in quotes)", fs.Arg(0))
		}
		pw, err := readPassword(in, *email != "")
		if err != nil {
			return err
		}
		u, err := auth.NewAccount(ctx, q, auth.AccountIn{Username: username, Name: *name, Email: *email,
			Password: pw, Admin: *admin}, now)
		if err != nil {
			return err
		}
		fmt.Fprintf(out, "added %s (%s)%s%s\n", u.Username, u.Name, map[bool]string{true: ", admin"}[u.Admin],
			map[bool]string{true: ", Google " + u.Email.String}[u.Email.Valid])
	case "password":
		if len(args) != 2 {
			return errors.New("usage: casestudio user password <username>")
		}
		u, err := q.GetUserByUsername(ctx, args[1])
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no account %q", args[1])
		} else if err != nil {
			return err
		}
		pw, err := readPassword(in, false)
		if err != nil {
			return err
		}
		if err := auth.NewPassword(ctx, q, u, pw, now); err != nil {
			return err
		}
		fmt.Fprintf(out, "new password set for %s; their sessions have ended\n", u.Username)
	case "email":
		if len(args) != 2 && len(args) != 3 {
			return errors.New("usage: casestudio user email <username> [<email>]")
		}
		u, err := q.GetUserByUsername(ctx, args[1])
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("no account %q", args[1])
		} else if err != nil {
			return err
		}
		email := ""
		if len(args) == 3 {
			email = args[2]
		}
		if err := auth.NewEmail(ctx, q, u, email, now); err != nil {
			return err
		}
		if email == "" {
			fmt.Fprintf(out, "%s has no Google email now\n", u.Username)
		} else {
			fmt.Fprintf(out, "%s signs in with Google as %s\n", u.Username, strings.ToLower(strings.TrimSpace(email)))
		}
	case "list":
		rows, err := q.ListUsers(ctx)
		if err != nil {
			return err
		}
		tw := tabwriter.NewWriter(out, 0, 2, 2, ' ', 0)
		fmt.Fprintln(tw, "USERNAME\tNAME\tEMAIL\tGOOGLE\tPASSWORD\tADMIN\tACTIVE")
		for _, u := range rows {
			fmt.Fprintf(tw, "%s\t%s\t%s\t%v\t%v\t%v\t%v\n", u.Username, u.Name, u.Email.String, u.GoogleSub.Valid,
				u.PasswordHash != "", u.Admin, u.Active)
		}
		return tw.Flush()
	default:
		return fmt.Errorf("unknown: casestudio user %s\n\n%s", args[0], userHelp)
	}
	return nil
}

// readPassword reads one line; it may be empty only when emptyOK (a Google-only account).
func readPassword(in io.Reader, emptyOK bool) (string, error) {
	line, err := bufio.NewReader(in).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	pw := strings.TrimRight(line, "\r\n")
	if pw == "" && !emptyOK {
		return "", errors.New("no password on the input (one line)")
	}
	return pw, nil
}
