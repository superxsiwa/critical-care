-- name: CountUsers :one
SELECT count(*) FROM users;

-- name: CountActiveAdmins :one
SELECT count(*) FROM users WHERE admin AND active;

-- name: GetUser :one
SELECT * FROM users WHERE id = sqlc.arg(id);

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = sqlc.arg(username);

-- name: ListUsers :many
SELECT * FROM users ORDER BY active DESC, name COLLATE NOCASE, id;

-- name: CreateUser :one
INSERT INTO users (username, name, password_hash, admin, active, created_at, updated_at)
VALUES (sqlc.arg(username), sqlc.arg(name), sqlc.arg(password_hash), sqlc.arg(admin), 1, sqlc.arg(now), sqlc.arg(now))
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name = sqlc.arg(name), admin = sqlc.arg(admin), active = sqlc.arg(active), updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetPassword :execrows
UPDATE users SET password_hash = sqlc.arg(password_hash), updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id);
