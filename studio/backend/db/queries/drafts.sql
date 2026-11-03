-- name: ListDrafts :many
SELECT d.id, d.body, d.bed_num, d.case_title, d.version, d.created_at, d.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM drafts d
LEFT JOIN users u ON u.id = d.updated_by
ORDER BY d.bed_num IS NULL, d.bed_num, d.id;

-- name: GetDraft :one
SELECT d.id, d.body, d.bed_num, d.case_title, d.version, d.created_at, d.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM drafts d
LEFT JOIN users u ON u.id = d.updated_by
WHERE d.id = sqlc.arg(id);

-- name: CreateDraft :one
INSERT INTO drafts (body, bed_num, case_title, version, created_at, updated_at, created_by, updated_by)
VALUES (sqlc.arg(body), sqlc.narg(bed_num), sqlc.arg(case_title), 1, sqlc.arg(now), sqlc.arg(now),
        sqlc.arg(user_id), sqlc.arg(user_id))
RETURNING id;

-- name: UpdateDraft :execrows
UPDATE drafts
SET body = sqlc.arg(body), bed_num = sqlc.narg(bed_num), case_title = sqlc.arg(case_title),
    version = version + 1, updated_at = sqlc.arg(now), updated_by = sqlc.arg(user_id)
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);

-- name: DeleteDraft :execrows
DELETE FROM drafts
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);
