package server_test

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"casestudio/internal/cases"
	"casestudio/internal/db"
	"casestudio/internal/migrate"
	"casestudio/internal/server"
)

var update = flag.Bool("update", false, "rewrite contract/examples/valid/studio-export.json")

const contract = "../../../../contract"

var fixed = time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)

// studio runs the server in-process on its own migrated database file.
func studio(t *testing.T) *httptest.Server {
	t.Helper()
	d, err := db.Open(filepath.Join(t.TempDir(), "casestudio.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { d.Close() })
	if err := migrate.Up(context.Background(), d); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	srv := httptest.NewServer(server.New(server.Deps{DB: d, Log: log, Now: func() time.Time { return fixed }}))
	t.Cleanup(srv.Close)
	return srv
}

// call sends body (a value to encode, or raw bytes) and decodes the answer into out when given.
func call(t *testing.T, srv *httptest.Server, method, path string, body any, out any) (int, []byte) {
	t.Helper()
	var reader io.Reader
	switch b := body.(type) {
	case nil:
	case []byte:
		reader = bytes.NewReader(b)
	default:
		data, err := json.Marshal(b)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequest(method, srv.URL+path, reader)
	if err != nil {
		t.Fatal(err)
	}
	res, err := srv.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	if out != nil && len(data) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			t.Fatalf("%s %s: %v in %s", method, path, err, data)
		}
	}
	return res.StatusCode, data
}

func fixture(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(contract, "examples", name))
	if err != nil {
		t.Fatal(err)
	}
	return data
}

// minimalCase is the contract's neutral fixture case, as JSON.
func minimalCase(t *testing.T) json.RawMessage {
	var pkg struct{ Cases []json.RawMessage }
	if err := json.Unmarshal(fixture(t, "valid/minimal.json"), &pkg); err != nil {
		t.Fatal(err)
	}
	return pkg.Cases[0]
}

type draft struct {
	ID       int64
	Version  int64
	Case     json.RawMessage
	Problems []cases.Issue
}

func TestDraftLifecycle(t *testing.T) {
	srv := studio(t)
	var d draft
	if code, body := call(t, srv, "POST", "/api/drafts", map[string]any{"case": minimalCase(t)}, &d); code != 201 {
		t.Fatalf("create: %d %s", code, body)
	}
	if d.Version != 1 || len(d.Problems) != 0 {
		t.Fatalf("new draft: version %d, problems %v", d.Version, d.Problems)
	}

	// Break it: the app's own problem comes back with its path.
	var broken map[string]any
	_ = json.Unmarshal(d.Case, &broken)
	broken["bedCode"] = " "
	var saved draft
	if code, body := call(t, srv, "PUT", "/api/drafts/1", map[string]any{"version": 1, "case": broken}, &saved); code != 200 {
		t.Fatalf("save: %d %s", code, body)
	}
	if saved.Version != 2 || len(saved.Problems) != 1 || saved.Problems[0] != (cases.Issue{Path: "$.bedCode", Message: "is empty"}) {
		t.Fatalf("saved: version %d, problems %v", saved.Version, saved.Problems)
	}

	// Saving over an old version is refused: someone else saved in between.
	var refusal struct{ Detail, Code string }
	if code, _ := call(t, srv, "PUT", "/api/drafts/1", map[string]any{"version": 1, "case": broken}, &refusal); code != 409 || refusal.Code != "stale" {
		t.Fatalf("stale save: %d %+v", code, refusal)
	}
	if code, _ := call(t, srv, "DELETE", "/api/drafts/1?version=1", nil, &refusal); code != 409 {
		t.Fatalf("stale delete: %d", code)
	}

	var items []struct {
		ID        int64
		BedNum    *int
		CaseTitle string
		Problems  int
	}
	call(t, srv, "GET", "/api/drafts", nil, &items)
	if len(items) != 1 || items[0].BedNum == nil || *items[0].BedNum != 9 || items[0].Problems != 1 {
		t.Fatalf("list: %+v", items)
	}

	if code, _ := call(t, srv, "DELETE", "/api/drafts/1?version=2", nil, nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if code, _ := call(t, srv, "GET", "/api/drafts/1", nil, &refusal); code != 404 || refusal.Code != "not-found" {
		t.Fatalf("after delete: %d %+v", code, refusal)
	}

	// A deleted draft's id is never given out again: an editor still open on draft 1 (version 1)
	// must not save over the next new draft.
	var next draft
	call(t, srv, "POST", "/api/drafts", map[string]any{"case": minimalCase(t)}, &next)
	if next.ID == 1 {
		t.Fatalf("a new draft took the deleted draft's id")
	}
	if code, _ := call(t, srv, "PUT", "/api/drafts/1", map[string]any{"version": 1, "case": broken}, &refusal); code != 404 {
		t.Fatalf("save to the deleted draft: %d %+v", code, refusal)
	}
}

func TestRequestsAreReadStrictly(t *testing.T) {
	srv := studio(t)
	for _, body := range []any{
		map[string]any{"case": minimalCase(t), "extra": 1},
		map[string]any{"case": []int{1}},
		[]byte(`{"case": {}} {}`),
	} {
		if code, data := call(t, srv, "POST", "/api/drafts", body, nil); code != 400 {
			t.Errorf("%v: %d %s", body, code, data)
		}
	}
	if code, _ := call(t, srv, "PUT", "/api/drafts/1", map[string]any{"case": minimalCase(t)}, nil); code != 400 {
		t.Errorf("a save without version: %d", code)
	}
}

func TestCheckUsesTheAppsRules(t *testing.T) {
	srv := studio(t)
	var c map[string]any
	_ = json.Unmarshal(minimalCase(t), &c)
	c["stageData"] = c["stageData"].([]any)[:5]
	var out struct{ Problems []cases.Issue }
	call(t, srv, "POST", "/api/check", map[string]any{"case": c}, &out)
	if len(out.Problems) != 1 || out.Problems[0].Message != "has 5 steps, expected 6" {
		t.Fatalf("check: %+v", out.Problems)
	}
}

func TestImport(t *testing.T) {
	srv := studio(t)
	var created struct{ Created []int64 }
	if code, body := call(t, srv, "POST", "/api/import", fixture(t, "valid/package-two-beds.json"), &created); code != 201 || len(created.Created) != 2 {
		t.Fatalf("import: %d %s", code, body)
	}
	// His plain list without bed numbers: each case gets its place in the list.
	var c map[string]any
	_ = json.Unmarshal(minimalCase(t), &c)
	delete(c, "bedNum")
	plain, _ := json.Marshal([]any{c})
	call(t, srv, "POST", "/api/import", plain, &created)
	var d draft
	call(t, srv, "GET", "/api/drafts/3", nil, &d)
	var got map[string]any
	_ = json.Unmarshal(d.Case, &got)
	if got["bedNum"] != float64(1) {
		t.Fatalf("bedNum of an unnumbered case: %v", got["bedNum"])
	}

	var refusal struct {
		Code     string
		Problems []string
	}
	for file, want := range map[string]string{
		"invalid/backup-file.json":   "this is a backup file, not a case file",
		"invalid/newer-version.json": "update the app first",
	} {
		if code, _ := call(t, srv, "POST", "/api/import", fixture(t, file), &refusal); code != 422 || !strings.Contains(refusal.Problems[0], want) {
			t.Errorf("%s: %d %+v", file, code, refusal)
		}
	}
	// A draft may be imported unfinished: it is only checked at export.
	if code, _ := call(t, srv, "POST", "/api/import", fixture(t, "invalid/five-steps.json"), nil); code != 201 {
		t.Errorf("an unfinished case is refused at import: %d", code)
	}
}

func TestExport(t *testing.T) {
	srv := studio(t)
	var refusal struct {
		Code     string
		Problems []string
	}
	if code, _ := call(t, srv, "GET", "/api/package", nil, &refusal); code != 422 || refusal.Code != "empty" {
		t.Fatalf("export of nothing: %d %+v", code, refusal)
	}
	call(t, srv, "POST", "/api/import", fixture(t, "valid/minimal.json"), nil)
	code, pkg := call(t, srv, "GET", "/api/package", nil, nil)
	if code != 200 {
		t.Fatalf("export: %d %s", code, pkg)
	}
	if read := cases.ReadFile(pkg, cases.ImageExists); !read.OK() {
		t.Fatalf("the app would refuse the export: %q", read.Problems)
	}

	// The round trip: this export is in the contract, where the app's tests read it too.
	golden := filepath.Join(contract, "examples", "valid", "studio-export.json")
	if *update {
		if err := os.WriteFile(golden, pkg, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatalf("%v (run the test with -update once)", err)
	}
	if !bytes.Equal(pkg, want) {
		t.Fatalf("the export differs from contract/examples/valid/studio-export.json:\n%s", pkg)
	}

	// A second case with the same bed: the app would refuse the file, so nothing is exported.
	call(t, srv, "POST", "/api/drafts", map[string]any{"case": minimalCase(t)}, nil)
	if code, _ := call(t, srv, "GET", "/api/package", nil, &refusal); code != 422 || refusal.Code != "not-ready" ||
		refusal.Problems[len(refusal.Problems)-1] != "bed 9 is in the file twice" {
		t.Fatalf("export with a bed twice: %d %+v", code, refusal)
	}
}

func TestRoutesAndHeaders(t *testing.T) {
	srv := studio(t)
	var refusal struct{ Code string }
	if code, _ := call(t, srv, "GET", "/api/nothing", nil, &refusal); code != 404 || refusal.Code != "not-found" {
		t.Fatalf("unknown API route: %d %+v", code, refusal)
	}
	res, err := srv.Client().Get(srv.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != 503 || res.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("web without a build: %d %v", res.StatusCode, res.Header)
	}
	var meta struct {
		PackageFormat string
		Equipment     []string
	}
	call(t, srv, "GET", "/api/meta", nil, &meta)
	if meta.PackageFormat != "critical-care-cases" || len(meta.Equipment) != 16 {
		t.Fatalf("meta: %+v", meta)
	}
}
