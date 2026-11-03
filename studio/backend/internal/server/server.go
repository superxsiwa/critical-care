// Package server mounts every route and the middleware chain in one place.
package server

import (
	"database/sql"
	"log/slog"
	"net/http"
	"time"

	"casestudio/internal/auth"
	"casestudio/internal/drafts"
	"casestudio/internal/httpx"
	"casestudio/internal/web"
)

// Deps is what the server needs. Secret signs the sessions (auth.LoadSecret).
type Deps struct {
	DB     *sql.DB
	Log    *slog.Logger
	Now    func() time.Time
	Secret []byte
}

// New builds the studio's HTTP handler.
func New(d Deps) http.Handler {
	if d.Now == nil {
		d.Now = time.Now
	}
	mux := http.NewServeMux()
	signIn := auth.New(d.DB, d.Log, d.Secret, d.Now)
	signIn.Mount(mux)
	(&drafts.Service{DB: d.DB, Log: d.Log, Now: d.Now}).Mount(mux)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		httpx.Refuse(w, http.StatusNotFound, "No such API route", "not-found")
	})
	mux.Handle("/", web.Handler())
	// Every /api request passes the guard: CSRF on writes, a signed-in caller, admins for /api/users.
	return httpx.SecurityHeaders(httpx.Recover(d.Log, httpx.AccessLog(d.Log, signIn.Guard(mux))))
}
