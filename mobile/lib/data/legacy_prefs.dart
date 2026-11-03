import 'dart:convert';

import 'package:clock/clock.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../game/progress.dart';
import '../game/roster.dart';
import 'db/game_database.dart';

/// Where builds before the database (QA builds `qa-1` to `qa-5`) kept the player's data: one
/// JSON value each in SharedPreferences (localStorage on the web).
const legacyProgressKey = 'progress.v1';
const legacyRosterKey = 'roster.v1';
const legacyCasesKey = 'cases.imported.v1';
const legacyKeys = {legacyProgressKey, legacyRosterKey, legacyCasesKey};

/// Set in the database once the old values are in it; they are never read again after that.
const legacyMovedMeta = 'legacy_prefs_moved_at';

/// Moves the old preference values into [db] the first time the database is used: progress,
/// roster and imported cases in one transaction with the "moved" mark, then the old keys go. A
/// value that no longer reads is skipped, as the old store started over on it. Run before any
/// other read or write of the database; safe to run again (a crash between the commit and the
/// clean-up only leaves old keys, which the next start removes).
Future<void> moveLegacyPrefs(GameDatabase db, SharedPreferencesAsync prefs) async {
  if (await db.meta(legacyMovedMeta) == null) {
    final progress = await prefs.getString(legacyProgressKey);
    final roster = await prefs.getString(legacyRosterKey);
    final cases = await prefs.getString(legacyCasesKey);
    final now = clock.now();
    await db.transaction(() async {
      if (_decode(progress) case final Object json) {
        await db.writeProgress(Progress.fromJson(json));
      }
      if (_decode(roster) case final Object json) {
        await db.writeRoster(Roster.fromJson(json));
      }
      // Kept as text, as before: the cases are checked when the ward loads them.
      if (cases != null) await db.writeImportedCases(cases, savedAt: now);
      await db.setMeta(legacyMovedMeta, now.toUtc().toIso8601String());
    });
  }
  await prefs.clear(allowList: legacyKeys);
}

Object? _decode(String? text) {
  if (text == null) return null;
  try {
    return jsonDecode(text);
  } on FormatException {
    return null;
  }
}
