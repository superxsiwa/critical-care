-- name: ListDrafts :many
SELECT id, body, bed_num, case_title, version, created_at, updated_at
FROM drafts
ORDER BY bed_num IS NULL, bed_num, id;

-- name: GetDraft :one
SELECT id, body, bed_num, case_title, version, created_at, updated_at
FROM drafts
WHERE id = sqlc.arg(id);

-- name: CreateDraft :one
INSERT INTO drafts (body, bed_num, case_title, version, created_at, updated_at)
VALUES (sqlc.arg(body), sqlc.narg(bed_num), sqlc.arg(case_title), 1, sqlc.arg(now), sqlc.arg(now))
RETURNING id, body, bed_num, case_title, version, created_at, updated_at;

-- name: UpdateDraft :one
UPDATE drafts
SET body = sqlc.arg(body), bed_num = sqlc.narg(bed_num), case_title = sqlc.arg(case_title),
    version = version + 1, updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version)
RETURNING id, body, bed_num, case_title, version, created_at, updated_at;

-- name: DeleteDraft :execrows
DELETE FROM drafts
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);
