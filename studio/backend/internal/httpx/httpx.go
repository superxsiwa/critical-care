// Package httpx holds the JSON helpers every handler uses: answers are JSON with no caching,
// requests are decoded strictly, refusals carry a {"detail"} body.
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// ErrorBody is every refusal's body.
type ErrorBody struct {
	Detail   string `json:"detail"`
	Code     string `json:"code,omitempty"`
	Problems any    `json:"problems,omitempty"`
}

// JSON answers v with status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

// Refuse answers a refusal with a detail and an optional code the client can switch on.
func Refuse(w http.ResponseWriter, status int, detail, code string) {
	JSON(w, status, ErrorBody{Detail: detail, Code: code})
}

// Fail logs err and answers 500 without details.
func Fail(w http.ResponseWriter, log *slog.Logger, err error) {
	log.Error("request failed", "err", err)
	Refuse(w, http.StatusInternalServerError, "Something went wrong on the server", "server")
}

// Decode reads a JSON request body into v: unknown fields and anything after the value are
// refused, the body is limited to limit bytes. An empty body reads as {}.
func Decode(w http.ResponseWriter, r *http.Request, v any, limit int64) error {
	body := http.MaxBytesReader(w, r.Body, limit)
	dec := json.NewDecoder(body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		if errors.Is(err, io.EOF) {
			return json.Unmarshal([]byte("{}"), v)
		}
		return err
	}
	if dec.More() {
		return errors.New("unexpected data after the JSON body")
	}
	return nil
}

// Recover turns a panic in a handler into a logged 500.
func Recover(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				log.Error("panic", "path", r.URL.Path, "panic", v)
				Refuse(w, http.StatusInternalServerError, "Something went wrong on the server", "server")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// AccessLog writes one line per /api request: method, path, status, time. No bodies, no query.
func AccessLog(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		if len(r.URL.Path) >= 5 && r.URL.Path[:5] == "/api/" {
			log.Info("api", "method", r.Method, "path", r.URL.Path, "status", sw.status, "ms", time.Since(start).Milliseconds())
		}
	})
}

// SecurityHeaders sets the headers every answer carries.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self'")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "SAMEORIGIN")
		h.Set("Referrer-Policy", "same-origin")
		if r.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=31536000")
		}
		next.ServeHTTP(w, r)
	})
}
