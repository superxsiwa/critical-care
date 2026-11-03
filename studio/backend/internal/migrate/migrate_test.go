package migrate

import (
	"context"
	"path/filepath"
	"testing"

	"casestudio/internal/db"
)

// A database made by the first schema keeps its drafts (ids, versions, bodies) through 00002, and
// from then on a deleted draft's id is never given out again.
func TestDraftIDsAreNeverReusedAfterTheMove(t *testing.T) {
	ctx := context.Background()
	d, err := db.Open(filepath.Join(t.TempDir(), "casestudio.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	p, err := provider(d)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := p.UpTo(ctx, 1); err != nil {
		t.Fatal(err)
	}
	const insert = `INSERT INTO drafts (body, bed_num, case_title, version, created_at, updated_at)
		VALUES (?, ?, ?, ?, '2026-11-03T12:00:00Z', '2026-11-03T12:00:00Z')`
	for _, bed := range []int{1, 2, 3} {
		if _, err := d.ExecContext(ctx, insert, `{"bedNum":1}`, bed, "case", bed+4); err != nil {
			t.Fatal(err)
		}
	}
	if err := Up(ctx, d); err != nil {
		t.Fatal(err)
	}
	var n, maxVersion int
	if err := d.QueryRowContext(ctx, `SELECT count(*), max(version) FROM drafts`).Scan(&n, &maxVersion); err != nil {
		t.Fatal(err)
	}
	if n != 3 || maxVersion != 7 {
		t.Fatalf("after the move: %d drafts, highest version %d", n, maxVersion)
	}
	if _, err := d.ExecContext(ctx, `DELETE FROM drafts WHERE id = 3`); err != nil {
		t.Fatal(err)
	}
	res, err := d.ExecContext(ctx, insert, `{}`, 4, "new", 1)
	if err != nil {
		t.Fatal(err)
	}
	if id, _ := res.LastInsertId(); id != 4 {
		t.Fatalf("a new draft after deleting draft 3 got id %d, want 4", id)
	}
}
