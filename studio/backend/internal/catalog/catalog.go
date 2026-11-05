// Package catalog keeps what authors read while they write cases: a name for each of the app's
// equipment pictures, and the knowledge articles. Both are the studio's own: neither goes into the
// case package, so the app never sees them. Every instructor may change them; like drafts, each
// change says which version it replaces, so nobody saves over someone else's change unseen.
package catalog

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"casestudio/internal/auth"
	"casestudio/internal/cases"
	"casestudio/internal/httpx"
	"casestudio/internal/store"
)

const bodyLimit = 256 << 10 // an article is a few KB

// The longest text a field may hold, in characters.
const (
	shortText   = 200
	summaryText = 1000
	contentText = 50000
)

// Service answers the /api/equipment and /api/knowledge routes.
type Service struct {
	DB  *sql.DB
	Log *slog.Logger
	Now func() time.Time
}

func (s *Service) q() *store.Queries { return store.New(s.DB) }

// Mount registers the routes.
func (s *Service) Mount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/equipment", s.listEquipment)
	mux.HandleFunc("POST /api/equipment", s.addEquipment)
	mux.HandleFunc("PUT /api/equipment/{id}", s.changeEquipment)
	mux.HandleFunc("DELETE /api/equipment/{id}", s.deleteEquipment)
	mux.HandleFunc("GET /api/knowledge", s.listKnowledge)
	mux.HandleFunc("POST /api/knowledge", s.addKnowledge)
	mux.HandleFunc("PUT /api/knowledge/{id}", s.changeKnowledge)
	mux.HandleFunc("DELETE /api/knowledge/{id}", s.deleteKnowledge)
}

// Equipment is the name of one of the app's pictures. updatedBy names who changed it last ("" for
// the built-in names).
type Equipment struct {
	ID        int64  `json:"id"`
	File      string `json:"file"`
	NameTh    string `json:"nameTh"`
	NameEn    string `json:"nameEn"`
	Category  string `json:"category"`
	Version   int64  `json:"version"`
	UpdatedAt string `json:"updatedAt"`
	UpdatedBy string `json:"updatedBy"`
}

// Article is a knowledge article.
type Article struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Category  string `json:"category"`
	Summary   string `json:"summary"`
	Content   string `json:"content"`
	Version   int64  `json:"version"`
	UpdatedAt string `json:"updatedAt"`
	UpdatedBy string `json:"updatedBy"`
}

func (s *Service) now() string { return s.Now().UTC().Format(time.RFC3339) }

// by is the signed-in caller's id, for created_by and updated_by.
func by(r *http.Request) sql.NullInt64 {
	if u := auth.FromContext(r.Context()); u != nil {
		return sql.NullInt64{Int64: u.ID, Valid: true}
	}
	return sql.NullInt64{}
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		httpx.Refuse(w, http.StatusNotFound, "No such entry", "not-found")
		return 0, false
	}
	return id, true
}

func queryVersion(w http.ResponseWriter, r *http.Request) (int64, bool) {
	v, err := strconv.ParseInt(r.URL.Query().Get("version"), 10, 64)
	if err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "version: say which version to delete", "bad-request")
		return 0, false
	}
	return v, true
}

// field is one text of a request, trimmed, with the rules it must keep.
type field struct {
	name     string
	value    *string
	required bool
	max      int
}

// valid trims every field and refuses the first that breaks its rules.
func valid(w http.ResponseWriter, fields ...field) bool {
	for _, f := range fields {
		*f.value = strings.TrimSpace(*f.value)
		if f.required && *f.value == "" {
			httpx.Refuse(w, http.StatusBadRequest, f.name+": is empty", f.name+"-blank")
			return false
		}
		if utf8.RuneCountInString(*f.value) > f.max {
			httpx.Refuse(w, http.StatusBadRequest, f.name+": longer than "+strconv.Itoa(f.max)+" characters", "too-long")
			return false
		}
	}
	return true
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := httpx.Decode(w, r, v, bodyLimit); err != nil {
		httpx.Refuse(w, http.StatusBadRequest, "The request is not readable: "+err.Error(), "bad-request")
		return false
	}
	return true
}

// changed answers a change or delete that matched no row: the entry is gone (404), or someone else
// changed it since the caller read it (409 stale).
func (s *Service) changed(w http.ResponseWriter, exists func() error) {
	err := exists()
	if errors.Is(err, sql.ErrNoRows) {
		httpx.Refuse(w, http.StatusNotFound, "No such entry", "not-found")
		return
	}
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.Refuse(w, http.StatusConflict, "Someone else changed this since you opened it: reload to see their change", "stale")
}

// ---- equipment ----

func (s *Service) listEquipment(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListEquipment(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	out := make([]Equipment, len(rows))
	for i, e := range rows {
		out[i] = Equipment{e.ID, e.File, e.NameTh, e.NameEn, e.Category, e.Version, e.UpdatedAt, e.UpdatedByName}
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Service) answerEquipment(w http.ResponseWriter, r *http.Request, status int, id int64) {
	e, err := s.q().GetEquipment(r.Context(), id)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, status, Equipment{e.ID, e.File, e.NameTh, e.NameEn, e.Category, e.Version, e.UpdatedAt, e.UpdatedByName})
}

type names struct {
	NameTh   string `json:"nameTh"`
	NameEn   string `json:"nameEn"`
	Category string `json:"category"`
}

func (n *names) valid(w http.ResponseWriter) bool {
	return valid(w,
		field{"nameTh", &n.NameTh, true, shortText},
		field{"nameEn", &n.NameEn, false, shortText},
		field{"category", &n.Category, true, shortText})
}

// addEquipment names a picture that has no entry yet. Only the app's own pictures can be named: a
// case can show no other.
func (s *Service) addEquipment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		File string `json:"file"`
		names
	}
	if !decode(w, r, &in) || !in.valid(w) {
		return
	}
	if !slices.Contains(cases.Equipment(), in.File) {
		httpx.Refuse(w, http.StatusUnprocessableEntity, "file: not one of the app's equipment pictures", "picture-unknown")
		return
	}
	id, taken, err := s.insertEquipment(r.Context(), in.File, in.names, by(r))
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if taken {
		httpx.Refuse(w, http.StatusConflict, "file: this picture has a name already", "picture-taken")
		return
	}
	s.answerEquipment(w, r, http.StatusCreated, id)
}

// insertEquipment adds the entry unless its picture has one (the check and the insert in one
// transaction, which the database's immediate lock keeps from racing another add).
func (s *Service) insertEquipment(ctx context.Context, file string, n names, user sql.NullInt64) (int64, bool, error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback()
	q := store.New(tx)
	if count, err := q.EquipmentFileTaken(ctx, file); err != nil || count > 0 {
		return 0, count > 0, err
	}
	id, err := q.CreateEquipment(ctx, store.CreateEquipmentParams{
		File: file, NameTh: n.NameTh, NameEn: n.NameEn, Category: n.Category, Now: s.now(), UserID: user,
	})
	if err != nil {
		return 0, false, err
	}
	return id, false, tx.Commit()
}

// changeEquipment changes an entry's names and category; its picture stays.
func (s *Service) changeEquipment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Version *int64 `json:"version"`
		names
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Version == nil {
		httpx.Refuse(w, http.StatusBadRequest, "version: say which version this replaces", "bad-request")
		return
	}
	if !in.valid(w) {
		return
	}
	n, err := s.q().UpdateEquipment(r.Context(), store.UpdateEquipmentParams{
		NameTh: in.NameTh, NameEn: in.NameEn, Category: in.Category, Now: s.now(), UserID: by(r), ID: id, Version: *in.Version,
	})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if n == 0 {
		s.changed(w, func() error { _, err := s.q().GetEquipment(r.Context(), id); return err })
		return
	}
	s.answerEquipment(w, r, http.StatusOK, id)
}

func (s *Service) deleteEquipment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	version, ok := queryVersion(w, r)
	if !ok {
		return
	}
	n, err := s.q().DeleteEquipment(r.Context(), store.DeleteEquipmentParams{ID: id, Version: version})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if n == 0 {
		s.changed(w, func() error { _, err := s.q().GetEquipment(r.Context(), id); return err })
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- knowledge ----

func (s *Service) listKnowledge(w http.ResponseWriter, r *http.Request) {
	rows, err := s.q().ListKnowledge(r.Context())
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	out := make([]Article, len(rows))
	for i, k := range rows {
		out[i] = Article{k.ID, k.Title, k.Category, k.Summary, k.Content, k.Version, k.UpdatedAt, k.UpdatedByName}
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Service) answerKnowledge(w http.ResponseWriter, r *http.Request, status int, id int64) {
	k, err := s.q().GetKnowledge(r.Context(), id)
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	httpx.JSON(w, status, Article{k.ID, k.Title, k.Category, k.Summary, k.Content, k.Version, k.UpdatedAt, k.UpdatedByName})
}

type text struct {
	Title    string `json:"title"`
	Category string `json:"category"`
	Summary  string `json:"summary"`
	Content  string `json:"content"`
}

func (t *text) valid(w http.ResponseWriter) bool {
	return valid(w,
		field{"title", &t.Title, true, shortText},
		field{"category", &t.Category, true, shortText},
		field{"summary", &t.Summary, false, summaryText},
		field{"content", &t.Content, false, contentText})
}

func (s *Service) addKnowledge(w http.ResponseWriter, r *http.Request) {
	var in text
	if !decode(w, r, &in) || !in.valid(w) {
		return
	}
	id, err := s.q().CreateKnowledge(r.Context(), store.CreateKnowledgeParams{
		Title: in.Title, Category: in.Category, Summary: in.Summary, Content: in.Content, Now: s.now(), UserID: by(r),
	})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	s.answerKnowledge(w, r, http.StatusCreated, id)
}

func (s *Service) changeKnowledge(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Version *int64 `json:"version"`
		text
	}
	if !decode(w, r, &in) {
		return
	}
	if in.Version == nil {
		httpx.Refuse(w, http.StatusBadRequest, "version: say which version this replaces", "bad-request")
		return
	}
	if !in.valid(w) {
		return
	}
	n, err := s.q().UpdateKnowledge(r.Context(), store.UpdateKnowledgeParams{
		Title: in.Title, Category: in.Category, Summary: in.Summary, Content: in.Content,
		Now: s.now(), UserID: by(r), ID: id, Version: *in.Version,
	})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if n == 0 {
		s.changed(w, func() error { _, err := s.q().GetKnowledge(r.Context(), id); return err })
		return
	}
	s.answerKnowledge(w, r, http.StatusOK, id)
}

func (s *Service) deleteKnowledge(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	version, ok := queryVersion(w, r)
	if !ok {
		return
	}
	n, err := s.q().DeleteKnowledge(r.Context(), store.DeleteKnowledgeParams{ID: id, Version: version})
	if err != nil {
		httpx.Fail(w, s.Log, err)
		return
	}
	if n == 0 {
		s.changed(w, func() error { _, err := s.q().GetKnowledge(r.Context(), id); return err })
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
