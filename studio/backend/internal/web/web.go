// Package web serves the studio's Angular app, embedded in the binary from internal/web/dist.
package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var dist embed.FS

// Handler serves the built app: hashed assets cached for good, index.html never cached, and any
// path without a file extension answered with index.html (the app's own routes).
func Handler() http.Handler {
	files, _ := fs.Sub(dist, "dist")
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
		if _, err := fs.Stat(files, name); name == "" || err != nil {
			if path.Ext(name) != "" {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFileFS(w, r, files, "index.html")
			return
		}
		if name == "index.html" {
			w.Header().Set("Cache-Control", "no-cache")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		server.ServeHTTP(w, r)
	})
}
