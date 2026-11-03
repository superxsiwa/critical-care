# Case package contract

The file that carries cases from the Case Studio (#20) to the app (`mobile/`). Both sides read and check it
the same way; the files in this folder are the agreement.

| File | What |
|---|---|
| `case-package.v1.schema.json` | JSON Schema (draft 2020-12): the structure of a version 1 package |
| `examples/valid/`, `examples/invalid/` | Example files: one change each from bed 01 for the invalid ones |
| `examples/verdicts.json` | For every example: accepted or not, the beds it holds, the problem text a reader must report, and whether the schema alone catches it |

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
- **Studio:** its server runs the same `verdicts.json`, so both sides accept and refuse the same files with
  the same problem texts.

A change to the format raises `version`, adds a new schema file, and adds examples; older versions keep
their examples and stay readable.
