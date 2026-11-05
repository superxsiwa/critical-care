-- +goose Up
-- Google sign-in, the default since 2026-11-05 (the password stays as a fallback). An admin writes
-- the person's Google email on their account; their first Google sign-in with that verified email
-- ties the account to Google's own id for the person (sub), which every later Google sign-in
-- matches, so it holds when the email changes. An account may have no password at all
-- (password_hash ''): it signs in with Google only.
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX users_email ON users (email COLLATE NOCASE) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;

-- +goose Down
DROP INDEX users_google_sub;
DROP INDEX users_email;
ALTER TABLE users DROP COLUMN google_sub;
ALTER TABLE users DROP COLUMN email;
