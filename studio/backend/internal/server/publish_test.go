package server_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"casestudio/internal/cases"
)

type latest struct {
	Revision    int64
	PublishedAt string
	Cases       int64
	Package     string
}

// get fetches path as a phone does: no cookies, no CSRF token.
func get(t *testing.T, base string, path string) (*http.Response, []byte) {
	t.Helper()
	res, err := http.Get(base + path)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	return res, data
}

// Publishing makes every draft one revision the app's public feed hands out; a revision is a
// snapshot that later edits never touch, and a set the app would refuse is never published.
func TestPublishingAndTheAppsFeed(t *testing.T) {
	srv := studio(t)

	res, data := get(t, srv.URL, "/api/published")
	if res.StatusCode != 404 || !bytes.Contains(data, []byte(`"none"`)) || res.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("feed before any publish: %d %s %v", res.StatusCode, data, res.Header)
	}
	var out refusal
	if code, _ := call(t, srv, "POST", "/api/publish", nil, &out); code != 422 || out.Code != "empty" {
		t.Fatalf("publish of nothing: %d %+v", code, out)
	}

	var ids struct{ Created []int64 }
	call(t, srv, "POST", "/api/import", fixture(t, "valid/minimal.json"), &ids)
	var rev struct {
		Revision    int64
		PublishedAt string
		Cases       int64
		PublishedBy string
	}
	if code, body := call(t, srv, "POST", "/api/publish", nil, &rev); code != 201 {
		t.Fatalf("publish: %d %s", code, body)
	}
	if rev.Revision != 1 || rev.Cases != 1 || rev.PublishedBy != "Admin" || rev.PublishedAt != "2026-11-03T12:00:00Z" {
		t.Fatalf("published: %+v", rev)
	}

	// The feed, signed out: the newest revision and its file.
	res, data = get(t, srv.URL, "/api/published")
	var l latest
	if err := json.Unmarshal(data, &l); err != nil || res.StatusCode != 200 {
		t.Fatalf("feed: %d %s", res.StatusCode, data)
	}
	if l.Revision != 1 || l.Cases != 1 || l.Package != "/api/published/1" || bytes.Contains(data, []byte("Admin")) ||
		res.Header.Get("Cache-Control") != "no-store" || res.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("feed: %s %v", data, res.Header)
	}
	res, pkg := get(t, srv.URL, l.Package)
	if res.StatusCode != 200 || res.Header.Get("Cache-Control") != "public, max-age=31536000, immutable" ||
		res.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("revision 1: %d %v", res.StatusCode, res.Header)
	}
	if read := cases.ReadFile(pkg, cases.ImageExists); !read.OK() {
		t.Fatalf("the app would refuse revision 1: %q", read.Problems)
	}
	var head struct {
		Format      string
		Version     int
		Revision    int64
		PublishedAt string
	}
	_ = json.Unmarshal(pkg, &head)
	if head.Format != cases.PackageFormat || head.Version != 1 || head.Revision != 1 || head.PublishedAt != "2026-11-03T12:00:00Z" {
		t.Fatalf("revision 1 says: %+v", head)
	}

	// The contract keeps this file, so the app's tests read what the studio publishes.
	golden := filepath.Join(contract, "examples", "valid", "studio-published.json")
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
		t.Fatalf("revision 1 differs from contract/examples/valid/studio-published.json:\n%s", pkg)
	}

	// An edit after publishing leaves revision 1 as it was; publishing again makes revision 2.
	var d draft
	call(t, srv, "GET", "/api/drafts/"+itoa(ids.Created[0]), nil, &d)
	var c map[string]any
	_ = json.Unmarshal(d.Case, &c)
	c["caseTitle"] = "Changed after publishing"
	if code, body := call(t, srv, "PUT", "/api/drafts/"+itoa(d.ID), map[string]any{"version": d.Version, "case": c}, &d); code != 200 {
		t.Fatalf("save: %d %s", code, body)
	}
	if _, again := get(t, srv.URL, "/api/published/1"); !bytes.Equal(again, pkg) {
		t.Fatal("revision 1 changed after an edit")
	}
	call(t, srv, "POST", "/api/publish", nil, &rev)
	if _, data = get(t, srv.URL, "/api/published"); json.Unmarshal(data, &l) != nil || l.Revision != 2 {
		t.Fatalf("feed after the second publish: %s", data)
	}
	if _, two := get(t, srv.URL, "/api/published/2"); !bytes.Contains(two, []byte("Changed after publishing")) {
		t.Fatalf("revision 2: %s", two)
	}

	// A set the app would refuse is not published: the feed stays on revision 2.
	c["bedCode"] = " "
	call(t, srv, "PUT", "/api/drafts/"+itoa(d.ID), map[string]any{"version": d.Version, "case": c}, &d)
	var notReady struct {
		Code     string
		Problems []string
	}
	if code, _ := call(t, srv, "POST", "/api/publish", nil, &notReady); code != 422 || notReady.Code != "not-ready" || len(notReady.Problems) == 0 {
		t.Fatalf("publish of a broken set: %d %+v", code, notReady)
	}
	if _, data = get(t, srv.URL, "/api/published"); json.Unmarshal(data, &l) != nil || l.Revision != 2 {
		t.Fatalf("feed after a refused publish: %s", data)
	}

	var history []struct {
		Revision    int64
		PublishedBy string
	}
	call(t, srv, "GET", "/api/publish", nil, &history)
	if len(history) != 2 || history[0].Revision != 2 || history[1].Revision != 1 || history[0].PublishedBy != "Admin" {
		t.Fatalf("history: %+v", history)
	}
	for _, p := range []string{"/api/published/3", "/api/published/0", "/api/published/x"} {
		if res, _ := get(t, srv.URL, p); res.StatusCode != 404 {
			t.Errorf("%s: %d", p, res.StatusCode)
		}
	}
}
