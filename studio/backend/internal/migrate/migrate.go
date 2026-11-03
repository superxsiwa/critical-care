// Package migrate brings the database to the schema this binary knows (goose, migrations embedded
// from db/migrations). It runs at every start and refuses a database newer than the binary.
package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"

	"github.com/pressly/goose/v3"

	schema "casestudio/db"
)

func provider(d *sql.DB) (*goose.Provider, error) {
	files, err := fs.Sub(schema.Migrations, "migrations")
	if err != nil {
		return nil, err
	}
	return goose.NewProvider(goose.DialectSQLite3, d, files)
}

// Up applies every migration not yet applied.
func Up(ctx context.Context, d *sql.DB) error {
	p, err := provider(d)
	if err != nil {
		return err
	}
	current, err := p.GetDBVersion(ctx)
	if err != nil {
		return err
	}
	sources := p.ListSources()
	if latest := sources[len(sources)-1].Version; current > latest {
		return fmt.Errorf("the database is at schema %d, newer than this program (%d): use a newer program", current, latest)
	}
	_, err = p.Up(ctx)
	return err
}
