// Package web serves the studio's Angular app, embedded in the binary from internal/web/dist.
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"regexp"
	"strings"
)

//go:embed all:dist
var dist embed.FS

// hashed names a file the build gave a content hash (main-VBRZTEYY.js, a lazy page's
// chunk-Bb-Sh8tm.js): its name changes with its content, so it may be cached for good. The app's
// pictures and fonts keep their names.
var hashed = regexp.MustCompile(`^(?:[a-z]+-[A-Z0-9]{8}|chunk-[A-Za-z0-9_-]{8})\.(?:js|css)$`)

// Handler serves the built app: hashed assets cached for good, everything else checked again on
// every use, and any path without a file extension answered with index.html (the app's own routes).
func Handler() http.Handler {
	files, _ := fs.Sub(dist, "dist")
	return handler(files)
}

func handler(files fs.FS) http.Handler {
	if _, err := fs.Stat(files, "index.html"); err != nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte("The Case Studio's web app is not built into this program. The API is under /api.\n"))
		})
	}
	server := http.FileServerFS(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if info, err := fs.Stat(files, name); name == "" || err != nil || info.IsDir() {
			if path.Ext(name) != "" {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFileFS(w, r, files, "index.html")
			return
		}
		if hashed.MatchString(path.Base(name)) {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		server.ServeHTTP(w, r)
	})
}
