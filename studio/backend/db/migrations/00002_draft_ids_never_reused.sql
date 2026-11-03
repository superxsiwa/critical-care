-- +goose Up
-- A draft's id is never given out again after it is deleted. Without AUTOINCREMENT, SQLite reuses
-- the highest id once that row is gone, and versions start again at 1: an editor still open on the
-- deleted draft (id 1, version 1) could then save over a new draft that took id 1. SQLite cannot add
-- AUTOINCREMENT to a table, so the table is made again with it and the rows copied (ids kept).
CREATE TABLE drafts_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    body       TEXT    NOT NULL,
    bed_num    INTEGER,
    case_title TEXT    NOT NULL DEFAULT '',
    version    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);
INSERT INTO drafts_new (id, body, bed_num, case_title, version, created_at, updated_at)
SELECT id, body, bed_num, case_title, version, created_at, updated_at FROM drafts;
DROP TABLE drafts;
ALTER TABLE drafts_new RENAME TO drafts;

-- +goose Down
CREATE TABLE drafts_old (
    id         INTEGER PRIMARY KEY,
    body       TEXT    NOT NULL,
    bed_num    INTEGER,
    case_title TEXT    NOT NULL DEFAULT '',
    version    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);
INSERT INTO drafts_old SELECT id, body, bed_num, case_title, version, created_at, updated_at FROM drafts;
DROP TABLE drafts;
ALTER TABLE drafts_old RENAME TO drafts;
