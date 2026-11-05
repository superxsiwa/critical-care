-- name: ListEquipment :many
SELECT e.id, e.file, e.name_th, e.name_en, e.category, e.version, e.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM equipment e
LEFT JOIN users u ON u.id = e.updated_by
ORDER BY e.file;

-- name: GetEquipment :one
SELECT e.id, e.file, e.name_th, e.name_en, e.category, e.version, e.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM equipment e
LEFT JOIN users u ON u.id = e.updated_by
WHERE e.id = sqlc.arg(id);

-- name: EquipmentFileTaken :one
SELECT count(*) FROM equipment WHERE file = sqlc.arg(file);

-- name: CreateEquipment :one
INSERT INTO equipment (file, name_th, name_en, category, version, created_at, updated_at, created_by, updated_by)
VALUES (sqlc.arg(file), sqlc.arg(name_th), sqlc.arg(name_en), sqlc.arg(category), 1, sqlc.arg(now), sqlc.arg(now),
        sqlc.arg(user_id), sqlc.arg(user_id))
RETURNING id;

-- name: UpdateEquipment :execrows
UPDATE equipment
SET name_th = sqlc.arg(name_th), name_en = sqlc.arg(name_en), category = sqlc.arg(category),
    version = version + 1, updated_at = sqlc.arg(now), updated_by = sqlc.arg(user_id)
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);

-- name: DeleteEquipment :execrows
DELETE FROM equipment
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);

-- name: ListKnowledge :many
SELECT k.id, k.title, k.category, k.summary, k.content, k.version, k.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM knowledge k
LEFT JOIN users u ON u.id = k.updated_by
ORDER BY k.id;

-- name: GetKnowledge :one
SELECT k.id, k.title, k.category, k.summary, k.content, k.version, k.updated_at,
       coalesce(u.name, '') AS updated_by_name
FROM knowledge k
LEFT JOIN users u ON u.id = k.updated_by
WHERE k.id = sqlc.arg(id);

-- name: CreateKnowledge :one
INSERT INTO knowledge (title, category, summary, content, version, created_at, updated_at, created_by, updated_by)
VALUES (sqlc.arg(title), sqlc.arg(category), sqlc.arg(summary), sqlc.arg(content), 1, sqlc.arg(now), sqlc.arg(now),
        sqlc.arg(user_id), sqlc.arg(user_id))
RETURNING id;

-- name: UpdateKnowledge :execrows
UPDATE knowledge
SET title = sqlc.arg(title), category = sqlc.arg(category), summary = sqlc.arg(summary),
    content = sqlc.arg(content), version = version + 1, updated_at = sqlc.arg(now), updated_by = sqlc.arg(user_id)
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);

-- name: DeleteKnowledge :execrows
DELETE FROM knowledge
WHERE id = sqlc.arg(id) AND version = sqlc.arg(version);
