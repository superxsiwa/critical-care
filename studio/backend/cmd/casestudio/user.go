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

  casestudio user add <username> --name <name> [--admin]   add an account
  casestudio user password <username>                      set a new password (for a lost one)
  casestudio user list                                     every account

The password is read from the input (one line), so it never shows in the shell's history:
  read -rs PW && printf '%s\n' "$PW" | casestudio user add anna --name "Anna" --admin`

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
		if len(args) < 2 || strings.HasPrefix(args[1], "-") {
			return errors.New("usage: casestudio user add <username> --name <name> [--admin]")
		}
		username := args[1]
		if err := fs.Parse(args[2:]); err != nil {
			return err
		}
		if fs.NArg() > 0 {
			return fmt.Errorf("unexpected %q (a name with spaces goes in quotes)", fs.Arg(0))
		}
		pw, err := readPassword(in)
		if err != nil {
			return err
		}
		u, err := auth.NewAccount(ctx, q, username, *name, pw, *admin, now)
		if err != nil {
			return err
		}
		fmt.Fprintf(out, "added %s (%s)%s\n", u.Username, u.Name, map[bool]string{true: ", admin"}[u.Admin])
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
		pw, err := readPassword(in)
		if err != nil {
			return err
		}
		if err := auth.NewPassword(ctx, q, u, pw, now); err != nil {
			return err
		}
		fmt.Fprintf(out, "new password set for %s; their sessions have ended\n", u.Username)
	case "list":
		rows, err := q.ListUsers(ctx)
		if err != nil {
			return err
		}
		tw := tabwriter.NewWriter(out, 0, 2, 2, ' ', 0)
		fmt.Fprintln(tw, "USERNAME\tNAME\tADMIN\tACTIVE")
		for _, u := range rows {
			fmt.Fprintf(tw, "%s\t%s\t%v\t%v\n", u.Username, u.Name, u.Admin, u.Active)
		}
		return tw.Flush()
	default:
		return fmt.Errorf("unknown: casestudio user %s\n\n%s", args[0], userHelp)
	}
	return nil
}

func readPassword(in io.Reader) (string, error) {
	line, err := bufio.NewReader(in).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	pw := strings.TrimRight(line, "\r\n")
	if pw == "" {
		return "", errors.New("no password on the input (one line)")
	}
	return pw, nil
}
