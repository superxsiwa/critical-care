# critical-care: the case package contract

The file that carries cases from the Studio to critical-care (`med-critical-care`, its `mobile/` app). Both
sides read and check it the same way; the files in this folder are the agreement. critical-care keeps a copy
of this folder and runs its own contract tests against it. `shipped/` holds the 8 cases the app ships, which
the Studio's tests also accept.

| File | What |
|---|---|
| `case-package.v1.schema.json` | JSON Schema (draft 2020-12): the structure of a version 1 package |
| `examples/valid/`, `examples/invalid/` | Example files. `valid/minimal.json` is a small neutral fixture (placeholder text, not clinical content); each `invalid/rule-*.json` breaks one rule of it, the other invalid files change one thing in bed 01 |
| `examples/verdicts.json` | For every example: accepted or not, the beds it holds, what a reader must report (`problems`: every line, word for word and in order; `problem`: a part of one line), and whether the schema alone catches it (`schema`: pass, fail, or skip for files without `format`) |

## The package, version 1

```json
{
  "format": "critical-care-cases",
  "version": 1,
  "exportedAt": "2026-11-03T12:00:00Z",
  "cases": [ { "bedNum": 1, "bedCode": "...", "stageData": [ ... ] } ]
}
```

- `format` names the file. A file with another `format` is refused; the app's backup file
  (`critical-care-backup`) is told apart with its own message.
- `version` is the package layout. A reader refuses a version newer than it knows ("update the app
  first") and keeps reading every older one.
- `cases` holds one or more cases in the shape of `BedCasePayload` (`backend/src/services/beds/types.ts`),
  the same shape as the 8 cases shipped in the app. Other keys are kept and ignored.
- An import replaces every case in the app, as his import does.
- **A published revision** (the studio's feed, step 10) is this same package with two more keys:
  `revision` (1, 2, ...; a revision never changes) and `publishedAt`. Readers of version 1 keep and ignore
  them, so a published file can also be imported as a file. Example: `examples/valid/studio-published.json`,
  written by the studio's publish test.

**Older files still read:** a plain list of cases, or `{"cases": [...]}` without `format`, as the app's
export and the React app write them. There a missing `bedNum` takes the case's place in the list.

## Rules beyond the schema

Checked in code by every reader (`mobile/lib/game/case_validation.dart`, and the studio's server):

- Each step has a task the game can show: `choices1toN`, or one of `sequenceTask`, `traysTask`,
  `unorderedDropTask` (choices may come with one of them, never two of the three).
- Every id a task expects (`correctOrder`, `expectedIds`, `expectedOrder`) is in that step's pool; ids
  are unique in their list; step ids are unique in the case; bed numbers are unique in the package.
- `traysTask`: each tray has `expectedOrder` when `ordered`, else `expectedIds`; every pool card belongs
  in some tray (the step cannot be passed otherwise).
- `choices1toN` has at least one correct option; SpO2 is at most 100%.
- An `img` names one of the app's equipment pictures (`mobile/assets/equipment/`).

These rules only check that a case can be played. Whether its content is clinically right is the
clinical reviewer's call; no reader judges it.

## Tests

- **App:** `mobile/test/contract/contract_test.dart` reads every example through the importer and checks
  the verdict; it also checks the valid examples and all 8 shipped cases against the schema.
- **Studio:** its server (`med-studio`, `backend/internal/cases`) runs the same `verdicts.json`, so both sides
  accept and refuse the same files with the same problem texts.
- **Round trip:** `examples/valid/studio-export.json` is the studio's own export of `minimal.json`; the
  studio's export test keeps it current (`go test ./internal/server -run TestExport -update`) and the app's
  contract test must accept it.

A change to the format raises `version`, adds a new schema file, and adds examples; older versions keep
their examples and stay readable.
