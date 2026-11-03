// Package db opens the studio's SQLite database (modernc.org/sqlite: pure Go, no cgo) with the
// same settings as the suite's other servers: WAL, foreign keys, a busy timeout, full sync.
package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Open opens (or creates) the database file at path.
func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return nil, err
	}
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(10000)&_pragma=foreign_keys(ON)"+
		"&_pragma=synchronous(FULL)&_txlock=immediate", filepath.ToSlash(path))
	d, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	d.SetMaxOpenConns(4)
	if err := d.Ping(); err != nil {
		d.Close()
		return nil, err
	}
	return d, nil
}
