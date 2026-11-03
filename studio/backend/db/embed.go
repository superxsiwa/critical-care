// Package schema holds the database migrations (goose) and the queries sqlc generates
// internal/store from.
package schema

import "embed"

//go:embed migrations/*.sql
var Migrations embed.FS
