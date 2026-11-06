# Critical Care (Flutter)

The CCU nursing training game, rebuilt in Flutter for Google Play and the App Store. The React and
Express app beside this folder (`../frontend`, `../backend`) is the spec: the game rules and the 8
cases come from there.

It plays offline: no accounts, no analytics, and nothing about the player leaves the phone. Since step 10
(2026-11-06) it follows the Studio (its own repository since 2026-11-06, `med-studio`): when it opens with a network, and on ตรวจหาเคสใหม่ in
Settings, it asks the studio's public feed for the newest published case set (`lib/data/studio_feed.dart`,
`lib/data/studio_follow.dart`) and takes it if it is newer and passes the same check as a file import.
Importing a file or going back to the shipped cases stops following (the switch รับเคสจากสตูดิโอ turns it on
again). `--dart-define=STUDIO_URL=...` points a build at another studio; the default is
https://studio.criticalcare.212cafe.com.

## Layout

| Path | What |
|---|---|
| `lib/game/` | The rules in pure Dart: case model and validation, card moves, the step checker, stars, mercy rule, step-2 timer, the case session, roster, milestones, the case file and the backup file |
| `lib/data/` | The bundled cases, the player's data on the device (see Storage), the file dialogs |
| `lib/features/` | Screens: roster, ward, game, progress, settings, case sheets, about |
| `lib/l10n/` | Strings; Thai is the template (`app_th.arb`) |
| `assets/cases/` | `bed01.json` .. `bed08.json`, converted from `../backend/src/services/beds` |
| `assets/equipment/` | Equipment images from `../frontend/public/assets/equipment` |
| `assets/fonts/` | Google Sans, SIL Open Font License 1.1 |
| `drift_schemas/` | A frozen copy of every database schema version |
| `web/sqlite3.wasm`, `web/drift_worker.js` | SQLite for the web build, from the releases matching `pubspec.lock` (sqlite3 3.8.0, drift 2.35.3) |
| `tool/convert_cases.mjs` | Writes the case JSON; `--check` reports drift from the `.ts` files |
| `../contract/` | The case package the Case Studio exports and the app imports: schema, examples, verdicts (`test/contract/`) |

## Commands

```sh
flutter test                          # rules, content lint over all 8 cases, bed 01 played by taps
flutter analyze
node tool/convert_cases.mjs --check   # are the bundled cases in step with backend/?
flutter build apk --debug
dart run build_runner build           # after changing the database tables
```

Release builds are signed only with the upload key named in `android/key.properties` (not in git).
Without it the release APK comes out unsigned; it is never signed with the debug keystore.

## Storage

- **Progress, the roster and the imported cases** live in SQLite through Drift
  (`lib/data/db/game_database.dart`): a file on the phone, the browser's IndexedDB on the web.
  Sound, vibration and the notice flag stay in SharedPreferences.
- **Older builds** kept the player's data in SharedPreferences (`progress.v1`, `roster.v1`,
  `cases.imported.v1`). The first start moves it into the database once and removes the old keys
  (`lib/data/legacy_prefs.dart`, tested in `test/data/legacy_prefs_test.dart`).
- **Backup file** (settings, "💾 สำรองข้อมูล"): one JSON file with `format`
  `critical-care-backup` and a `version` (`lib/game/backup.dart`). Restoring checks every field and
  every imported case and replaces everything, or nothing. A newer version is refused with "update
  the app first".
- **Changing a table:** edit `game_database.dart`, raise `schemaVersion`, run
  `dart run build_runner build` and `dart run drift_dev make-migrations`, add the step to
  `migration`, and commit the generated files and the new frozen schema. A change to what a backup
  holds also raises `backupVersion`, and the reader keeps accepting the older versions.

## Clinical content

The cases are written by superxsiwa and reviewed by the nurse he builds the game for. Code changes
never change answers, doses or vital signs; the content lint only checks that a case can be played.
