// Package drafts is the Case Studio's API: cases being written are kept as drafts (they may not be
// ready yet), checked with the app's own rules, and exported together as one case package.
package drafts

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"casestudio/internal/cases"
	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

const (
	caseLimit   = 1 << 20  // one case is about 20 KB
	importLimit = 10 << 20 // a file of many cases
)

// Service answers the /api/drafts, /api/check, /api/import, /api/package and /api/meta routes.
type Service struct {
	DB  *sql.DB
	Log *slog.Logger
	Now func() time.Time
}

func (s *Service) q() *store.Queries { return store.New(s.DB) }

// Mount registers the routes.
func (s *Service) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/meta", s.meta)
	mux.HandleFunc("GET /api/drafts", s.list)
	mux.HandleFunc("POST /api/drafts", s.create)
	mux.HandleFunc("GET /api/drafts/{id}", s.get)
	mux.HandleFunc("PUT /api/drafts/{id}", s.update)
	mux.HandleFunc("DELETE /api/drafts/{id}", s.remove)
	mux.HandleFunc("POST /api/check", s.check)
	mux.HandleFunc("POST /api/import", s.importFile)
	mux.HandleFunc("GET /api/package", s.exportPackage)
}

// Item is a draft in the list.
type Item struct {
	ID        int64  `json:"id"`
	BedNum    *int   `json:"bedNum"`
	CaseTitle string `json:"caseTitle"`
	Version   int64  `json:"version"`
	UpdatedAt string `json:"updatedAt"`
	Problems  int    `json:"problems"`
}

// Draft is one draft with its case and what keeps it from being exported.
type Draft struct {
	ID        int64           `json:"id"`
	Version   int64           `json:"version"`
	UpdatedAt string          `json:"updatedAt"`
	Case      json.RawMessage `json:"case"`
	Problems  []cases.Issue   `json:"problems"`
}

func toDraft(d store.Draft) Draft {
	return Draft{d.ID, d.Version, d.UpdatedAt, json.RawMessage(d.Body), cases.CheckCase(json.RawMessage(d.Body))}
}

func (s *Service) meta(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{
		"packageFormat":  cases.PackageFormat,
		"packageVersion": cases.PackageVersion,
		"stepsPerCase":   cases.StepsPerCase,
		"equipment":      cases.Equipment(),
	})
}

func (s *Service) list(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListDrafts(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	items := make([]Item, len(rows))
	for i, d := range rows {
		bed, title := cases.Summary(json.RawMessage(d.Body))
		items[i] = Item{d.ID, bed, title, d.Version, d.UpdatedAt, len(cases.CheckCase(json.RawMessage(d.Body)))}
	}
	httpx.JSON(w, http.StatusOK, items)
}

// caseBody reads {"case": {...}} (and the version being replaced, on a save), keeping the case
// compact but in the author's key order. The case must be a JSON object; it may be incomplete.
func caseBody(w http.ResponseWriter, r *http.Request, withVersion bool) (json.RawMessage, int64, bool) {
	var in struct {
		Version *int64          `json:"version"`
		Case    json.RawMessage `json:"case"`
	}
	if err := httpx.Decode(w, r, &in, caseLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return nil, 0, false
	}
	if withVersion && in.Version == nil {
		httpx.Refuse(w, http.StatusBadRequest, "version: say which version of the draft this replaces", "bad-request")
		return nil, 0, false
	}
	var obj map[string]json.RawMessage
	if json.Unmarshal(in.Case, &obj) != nil || obj == nil {
		httpx.Refuse(w, http.StatusBadRequest, "case: expected an object", "bad-request")
		return nil, 0, false
	}
	var buf bytes.Buffer
	if err := json.Compact(&buf, in.Case); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "case: "+err.Error(), "bad-request")
		return nil, 0, false
	}
	var version int64
	if in.Version != nil {
		version = *in.Version
	}
	return buf.Bytes(), version, true
}

func (s *Service) now() string { return s.Now().UTC().Format(time.RFC3339) }

func nullBed(raw json.RawMessage) (sql.NullInt64, string) {
	bed, title := cases.Summary(raw)
	if bed == nil {
		return sql.NullInt64{}, title
	}
	return sql.NullInt64{Int64: int64(*bed), Valid: true}, title
}

func (s *Service) insert(ctx context.Context, q *store.Queries, raw json.RawMessage) (store.Draft, error) {
	bed, title := nullBed(raw)
	return q.CreateDraft(ctx, store.CreateDraftParams{Body: string(raw), BedNum: bed, CaseTitle: title, Now: s.now()})
}

func (s *Service) create(w http.ResponseWriter, r *http.Request) {
	raw, _, ok := caseBody(w, r, false)
	if !ok {
		return
	}
	d, err := s.insert(r.Context(), s.q(), raw)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, toDraft(d))
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		httpx.Refuse(w, http.StatusNotFound, "No such draft", "not-found")
		return 0, false
	}
	return id, true
}

func (s *Service) get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	d, err := s.q().GetDraft(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		httpx.Refuse(w, http.StatusNotFound, "No such draft", "not-found")
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusOK, toDraft(d))
}

// stale answers a save or delete whose version is not the draft's current one: someone else saved
// it since, or it is gone.
func (s *Service) stale(w http.ResponseWriter, r *http.Request, id int64) {
	_, err := s.q().GetDraft(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		httpx.Refuse(w, http.StatusNotFound, "No such draft", "not-found")
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.Refuse(w, http.StatusConflict, "This draft was saved by someone else since you opened it: reopen it to see their changes", "stale")
}

func (s *Service) update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	raw, version, ok := caseBody(w, r, true)
	if !ok {
		return
	}
	bed, title := nullBed(raw)
	d, err := s.q().UpdateDraft(r.Context(), store.UpdateDraftParams{
		Body: string(raw), BedNum: bed, CaseTitle: title, Now: s.now(), ID: id, Version: version,
	})
	if errors.Is(err, sql.ErrNoRows) {
		s.stale(w, r, id)
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusOK, toDraft(d))
}

func (s *Service) remove(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	version, err := strconv.ParseInt(r.URL.Query().Get("version"), 10, 64)
	if err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "version: say which version of the draft to delete", "bad-request")
		return
	}
	n, err := s.q().DeleteDraft(r.Context(), store.DeleteDraftParams{ID: id, Version: version})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if n == 0 {
		s.stale(w, r, id)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) check(w http.ResponseWriter, r *http.Request) {
	raw, _, ok := caseBody(w, r, false)
	if !ok {
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"problems": cases.CheckCase(raw)})
}

// importFile adds every case of an uploaded file (a package or his older formats) as new drafts,
// all or none. The body is the file itself.
func (s *Service) importFile(w http.ResponseWriter, r *http.Request) {
	var buf bytes.Buffer
	if _, err := buf.ReadFrom(http.MaxBytesReader(w, r.Body, importLimit)); err != nil {
		httpx.Refuse(w, http.StatusRequestEntityTooLarge, "The file is too large", "too-large")
		return
	}
	list, problem := cases.Unpack(buf.Bytes())
	if problem != "" {
		httpx.JSON(w, http.StatusUnprocessableEntity, httpx.ErrorBody{
			Detail: "The file cannot be imported", Code: "bad-file", Problems: []string{problem},
		})
		return
	}
	tx, err := s.DB.BeginTx(r.Context(), nil)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	defer tx.Rollback()
	q := store.New(tx)
	ids := make([]int64, 0, len(list))
	for _, raw := range list {
		var compact bytes.Buffer
		if err := json.Compact(&compact, raw); err != nil {
			httpx.Fail(w, s.Log, err)
			return
		}
		d, err := s.insert(r.Context(), q, compact.Bytes())
		if err != nil {
			httpx.Fail(w, s.Log, err)
			return
		}
		ids = append(ids, d.ID)
	}
	if err := tx.Commit(); err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"created": ids})
}

// exportPackage writes every draft, in bed order, as one case package, after the app's own file
// check: if the app would refuse the file, nothing is exported and the problems say why.
func (s *Service) exportPackage(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListDrafts(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if len(rows) == 0 {
		httpx.Refuse(w, http.StatusUnprocessableEntity, "There are no cases to export", "empty")
		return
	}
	bodies := make([]json.RawMessage, len(rows))
	for i, d := range rows {
		bodies[i] = json.RawMessage(d.Body)
	}
	now := s.Now()
	pkg, err := cases.WritePackage(bodies, now)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if read := cases.ReadFile(pkg, cases.ImageExists); !read.OK() {
		httpx.JSON(w, http.StatusUnprocessableEntity, httpx.ErrorBody{
			Detail: "Some cases are not ready to export", Code: "not-ready", Problems: read.Problems,
		})
		return
	}
	name := fmt.Sprintf("critical_care_cases_%s.json", now.Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(pkg)
}
