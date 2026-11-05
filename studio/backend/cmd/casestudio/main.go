// Command casestudio is the Case Studio server: instructors write cases as drafts, checked with
// the app's own rules, and export them as one case package the app imports.
//
//	casestudio [serve]   start the server (the default)
//	casestudio migrate   bring the database to this program's schema, then stop
//	casestudio user ...  the accounts: add, password, list (casestudio user for help)
//	casestudio version   print the version
//
// Settings come from the environment: CASESTUDIO_ADDR (default 127.0.0.1:5310) and
// CASESTUDIO_DATA (the data folder, default ./data).
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"casestudio/internal/auth"
	"casestudio/internal/db"
	"casestudio/internal/migrate"
	"casestudio/internal/server"
	"casestudio/internal/store"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	flag.Parse()
	cmd := "serve"
	if flag.NArg() > 0 {
		cmd = flag.Arg(0)
	}
	log := slog.New(slog.NewTextHandler(os.Stdout, nil))
	var err error
	switch cmd {
	case "serve":
		err = serve(log)
	case "migrate":
		err = withDB(func(*sql.DB) error { return nil }) // withDB migrates
	case "user":
		err = withDB(func(d *sql.DB) error { return user(d, flag.Args()[1:], os.Stdin, os.Stdout) })
	case "version":
		fmt.Println("casestudio", version)
	default:
		err = fmt.Errorf("unknown command %q (serve, migrate, user, version)", cmd)
	}
	if err != nil {
		log.Error("stopped", "err", err)
		os.Exit(1)
	}
}

func dataDir() string { return env("CASESTUDIO_DATA", "data") }

// withDB opens the database, brought to this program's schema.
func withDB(f func(*sql.DB) error) error {
	d, err := db.Open(filepath.Join(dataDir(), "casestudio.db"))
	if err != nil {
		return err
	}
	defer d.Close()
	if err := migrate.Up(context.Background(), d); err != nil {
		return err
	}
	return f(d)
}

// googleConfig is Google sign-in's settings from the environment (on the server, the service's
// EnvironmentFile): off without a client id.
func googleConfig() (auth.GoogleConfig, error) {
	c := auth.GoogleConfig{
		ClientID:     os.Getenv("CASESTUDIO_GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("CASESTUDIO_GOOGLE_CLIENT_SECRET"),
		PublicURL:    os.Getenv("CASESTUDIO_PUBLIC_URL"),
		Issuer:       env("CASESTUDIO_GOOGLE_ISSUER", auth.GoogleIssuer),
	}
	if c.ClientID != "" && c.ClientSecret == "" {
		return c, errors.New("CASESTUDIO_GOOGLE_CLIENT_ID is set without CASESTUDIO_GOOGLE_CLIENT_SECRET")
	}
	return c, nil
}

func serve(log *slog.Logger) error {
	return withDB(func(d *sql.DB) error {
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		secret, err := auth.LoadSecret(filepath.Join(dataDir(), "session.key"))
		if err != nil {
			return err
		}
		google, err := googleConfig()
		if err != nil {
			return err
		}
		if google.ClientID != "" {
			log.Info("google sign-in on", "client", google.ClientID, "public", google.PublicURL)
		} else {
			log.Info("google sign-in off (no CASESTUDIO_GOOGLE_CLIENT_ID): passwords only")
		}
		if n, err := store.New(d).CountUsers(ctx); err == nil && n == 0 {
			log.Warn("no accounts yet: add the first admin with `casestudio user add <username> --admin --name <name>` (the password is read from the input)")
		}
		srv := &http.Server{
			Handler:           server.New(server.Deps{DB: d, Log: log, Secret: secret, Google: google}),
			ReadHeaderTimeout: 10 * time.Second,
			ReadTimeout:       60 * time.Second,
			WriteTimeout:      60 * time.Second,
			IdleTimeout:       120 * time.Second,
			ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
		}
		ln, err := net.Listen("tcp", env("CASESTUDIO_ADDR", "127.0.0.1:5310"))
		if err != nil {
			return err
		}
		log.Info("casestudio listening", "addr", ln.Addr().String(), "version", version)
		errs := make(chan error, 1)
		go func() { errs <- srv.Serve(ln) }()
		select {
		case err := <-errs:
			if !errors.Is(err, http.ErrServerClosed) {
				return err
			}
		case <-ctx.Done():
		}
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	})
}
