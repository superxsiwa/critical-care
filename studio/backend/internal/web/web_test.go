package web

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func get(t *testing.T, h http.Handler, path string) (*http.Response, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
	res := rec.Result()
	body, _ := io.ReadAll(res.Body)
	return res, string(body)
}

func TestServesTheBuiltApp(t *testing.T) {
	h := handler(fstest.MapFS{
		"index.html":                   {Data: []byte("<cs-root></cs-root>")},
		"main-VBRZTEYY.js":             {Data: []byte("app")},
		"equipment/syringe.png":        {Data: []byte("png")},
		"fonts/GoogleSans-Regular.ttf": {Data: []byte("ttf")},
	})
	cases := []struct {
		path, status, cache, body string
	}{
		{"/", "200", "no-cache", "<cs-root>"},
		{"/drafts/3", "200", "no-cache", "<cs-root>"}, // the app's own route
		{"/main-VBRZTEYY.js", "200", "immutable", "app"},
		{"/equipment/syringe.png", "200", "no-cache", "png"}, // keeps its name: checked again
		{"/fonts/GoogleSans-Regular.ttf", "200", "no-cache", "ttf"},
		{"/equipment", "200", "no-cache", "<cs-root>"}, // a folder is never listed
		{"/missing.js", "404", "", ""},
	}
	for _, c := range cases {
		res, body := get(t, h, c.path)
		if got := res.Status[:3]; got != c.status {
			t.Errorf("%s: status %s, want %s", c.path, got, c.status)
		}
		if !strings.Contains(res.Header.Get("Cache-Control"), c.cache) {
			t.Errorf("%s: Cache-Control %q, want %q", c.path, res.Header.Get("Cache-Control"), c.cache)
		}
		if !strings.Contains(body, c.body) {
			t.Errorf("%s: body %q, want %q", c.path, body, c.body)
		}
	}
}

func TestWithoutABuild(t *testing.T) {
	res, body := get(t, handler(fstest.MapFS{}), "/")
	if res.StatusCode != 503 || !strings.Contains(body, "not built") {
		t.Fatalf("%d %q", res.StatusCode, body)
	}
}
