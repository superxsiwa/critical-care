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

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = sqlc.arg(email) COLLATE NOCASE;

-- name: GetUserByGoogleSub :one
SELECT * FROM users WHERE google_sub = sqlc.arg(google_sub);

-- name: CreateUser :one
INSERT INTO users (username, name, email, password_hash, admin, active, created_at, updated_at)
VALUES (sqlc.arg(username), sqlc.arg(name), sqlc.narg(email), sqlc.arg(password_hash), sqlc.arg(admin), 1, sqlc.arg(now), sqlc.arg(now))
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name = sqlc.arg(name), admin = sqlc.arg(admin), active = sqlc.arg(active), updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: SetEmail :execrows
-- A new email unties the Google account: the next Google sign-in is matched by the new email.
UPDATE users SET email = sqlc.narg(email), google_sub = NULL, updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id);

-- name: LinkGoogle :execrows
-- Only an account not tied yet: two sign-ins at once cannot tie it twice.
UPDATE users SET google_sub = sqlc.arg(google_sub), updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id) AND google_sub IS NULL;

-- name: UnlinkGoogle :execrows
UPDATE users SET google_sub = NULL, updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id);

-- name: SetPassword :execrows
UPDATE users SET password_hash = sqlc.arg(password_hash), updated_at = sqlc.arg(now)
WHERE id = sqlc.arg(id);
