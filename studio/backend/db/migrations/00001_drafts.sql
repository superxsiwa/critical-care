-- +goose Up
-- One row per case being written. body is the case JSON as the author last saved it (it may not
-- be ready to export yet); bed_num and case_title are read from it for the list. version goes up
-- with every save, so two people editing the same draft cannot overwrite each other unseen.
CREATE TABLE drafts (
    id         INTEGER PRIMARY KEY,
    body       TEXT    NOT NULL,
    bed_num    INTEGER,
    case_title TEXT    NOT NULL DEFAULT '',
    version    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

-- +goose Down
DROP TABLE drafts;
