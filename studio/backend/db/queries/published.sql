-- name: CreatePublished :one
INSERT INTO published (package, cases, published_at, published_by)
VALUES ('', sqlc.arg(cases), sqlc.arg(now), sqlc.arg(user_id))
RETURNING revision;

-- name: SetPublishedPackage :exec
UPDATE published SET package = sqlc.arg(package) WHERE revision = sqlc.arg(revision);

-- name: LatestPublished :one
SELECT p.revision, p.cases, p.published_at, coalesce(u.name, '') AS published_by_name
FROM published p
LEFT JOIN users u ON u.id = p.published_by
ORDER BY p.revision DESC
LIMIT 1;

-- name: ListPublished :many
SELECT p.revision, p.cases, p.published_at, coalesce(u.name, '') AS published_by_name
FROM published p
LEFT JOIN users u ON u.id = p.published_by
ORDER BY p.revision DESC
LIMIT 100;

-- name: GetPublishedPackage :one
SELECT package FROM published WHERE revision = sqlc.arg(revision);
