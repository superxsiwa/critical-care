-- +goose Up
-- The people who sign in: instructors, and admins who also manage the accounts. Nobody signs up;
-- an admin makes each account (the first one with `casestudio user add <name> --admin`). An account
-- is switched off rather than deleted, so a draft can always say who saved it.
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    admin         BOOLEAN NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

-- Drafts are shared by every instructor (the package is one ward's set of cases); who made and who
-- last saved each one is kept. Drafts from before sign-in have neither.
ALTER TABLE drafts ADD COLUMN created_by INTEGER REFERENCES users (id);
ALTER TABLE drafts ADD COLUMN updated_by INTEGER REFERENCES users (id);

-- +goose Down
ALTER TABLE drafts DROP COLUMN updated_by;
ALTER TABLE drafts DROP COLUMN created_by;
DROP TABLE users;
