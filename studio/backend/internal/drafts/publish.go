package drafts

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"casestudio/internal/cases"
	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

// Publishing (step 10, 2026-11-06): the app follows the studio. An instructor publishes every draft
// as one package, checked exactly as the export is; the app reads the latest revision through the
// public feed and plays it offline. A revision never changes and is never deleted.

// Revision is one published case set, as the studio lists it.
type Revision struct {
	Revision    int64  `json:"revision"`
	PublishedAt string `json:"publishedAt"`
	Cases       int64  `json:"cases"`
	PublishedBy string `json:"publishedBy"`
}

// Latest is the feed's answer: the newest revision and where its file is. It names nobody: the
// feed is public.
type Latest struct {
	Revision    int64  `json:"revision"`
	PublishedAt string `json:"publishedAt"`
	Cases       int64  `json:"cases"`
	Package     string `json:"package"`
}

func (s *Service) mountPublishing(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/publish", s.listPublished)
	mux.HandleFunc("POST /api/publish", s.publish)
	mux.HandleFunc("GET /api/published", s.latestPublished)
	mux.HandleFunc("GET /api/published/{revision}", s.publishedPackage)
}

// publish makes every draft the next revision, all or nothing: the drafts are read, written as a
// package and checked inside one transaction, so a save during it cannot slip in half way.
func (s *Service) publish(w http.ResponseWriter, r *http.Request) {
	tx, err := s.DB.BeginTx(r.Context(), nil)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	defer tx.Rollback()
	q := store.New(tx)
	rows, err := q.ListDrafts(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if len(rows) == 0 {
		httpx.Refuse(w, http.StatusUnprocessableEntity, "There are no cases to publish", "empty")
		return
	}
	bodies := make([]json.RawMessage, len(rows))
	for i, d := range rows {
		bodies[i] = json.RawMessage(d.Body)
	}
	at := s.Now()
	revision, err := q.CreatePublished(r.Context(), store.CreatePublishedParams{
		Cases: int64(len(rows)), Now: at.UTC().Format(time.RFC3339), UserID: by(r),
	})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	pkg, err := cases.WritePublished(bodies, revision, at)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	// The app's own check of the file: a set the app would refuse is never published.
	if read := cases.ReadFile(pkg, cases.ImageExists); !read.OK() {
		httpx.JSON(w, http.StatusUnprocessableEntity, httpx.ErrorBody{
			Detail: "Some cases are not ready to publish", Code: "not-ready", Problems: read.Problems,
		})
		return
	}
	if err := q.SetPublishedPackage(r.Context(), store.SetPublishedPackageParams{Package: string(pkg), Revision: revision}); err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	latest, err := s.q().LatestPublished(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, Revision{latest.Revision, latest.PublishedAt, latest.Cases, latest.PublishedByName})
}

// listPublished is every revision, newest first, for the studio's own pages.
func (s *Service) listPublished(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListPublished(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	out := make([]Revision, len(rows))
	for i, p := range rows {
		out[i] = Revision{p.Revision, p.PublishedAt, p.Cases, p.PublishedByName}
	}
	httpx.JSON(w, http.StatusOK, out)
}

// feedHeaders lets any page read the feed: it is public, read only and carries no cookies, so a
// browser on the app's own address (the web version) may fetch it.
func feedHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

// latestPublished answers the app: the newest revision and the path of its file, 404 "none" before
// the first publish. Never cached: the app asks each time it checks.
func (s *Service) latestPublished(w http.ResponseWriter, r *http.Request) {
	feedHeaders(w)
	p, err := s.q().LatestPublished(r.Context())
	if errors.Is(err, sql.ErrNoRows) {
		httpx.Refuse(w, http.StatusNotFound, "Nothing is published yet", "none")
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusOK, Latest{p.Revision, p.PublishedAt, p.Cases, "/api/published/" + strconv.FormatInt(p.Revision, 10)})
}

// publishedPackage is one revision's file, byte for byte. A revision never changes, so it may be
// cached for good.
func (s *Service) publishedPackage(w http.ResponseWriter, r *http.Request) {
	feedHeaders(w)
	revision, err := strconv.ParseInt(r.PathValue("revision"), 10, 64)
	if err != nil || revision < 1 {
		httpx.Refuse(w, http.StatusNotFound, "No such revision", "not-found")
		return
	}
	pkg, err := s.q().GetPublishedPackage(r.Context(), revision)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && pkg == "") {
		httpx.Refuse(w, http.StatusNotFound, "No such revision", "not-found")
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	_, _ = w.Write([]byte(pkg))
}
