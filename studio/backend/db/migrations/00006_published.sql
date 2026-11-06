-- +goose Up
-- The case sets published to the app (step 10, 2026-11-06: the app follows the studio). An instructor
-- publishes every draft as one package, checked as the export is; phones fetch the latest revision
-- through the public feed (/api/published) and play it offline. package is the file phones get, byte
-- for byte; a revision never changes once published and is never deleted, so its number names one
-- file for good (AUTOINCREMENT: never given out twice).
CREATE TABLE published (
    revision     INTEGER PRIMARY KEY AUTOINCREMENT,
    package      TEXT    NOT NULL,
    cases        INTEGER NOT NULL,
    published_at TEXT    NOT NULL,
    published_by INTEGER REFERENCES users (id)
);

-- +goose Down
DROP TABLE published;
