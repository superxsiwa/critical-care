import 'dart:math';

import 'package:criticalcare/data/db/game_database.dart';
import 'package:criticalcare/data/db_progress_store.dart';
import 'package:criticalcare/data/progress_store.dart';
import 'package:criticalcare/game/backup.dart';
import 'package:criticalcare/game/case_import.dart';
import 'package:criticalcare/game/case_session.dart';
import 'package:criticalcare/game/progress.dart';
import 'package:criticalcare/game/roster.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import '../support/cases.dart';

/// A store on a fresh in-memory database and empty preferences: a clean install.
DbProgressStore cleanInstall() {
  SharedPreferencesAsyncPlatform.instance = InMemorySharedPreferencesAsync.empty();
  final db = GameDatabase(NativeDatabase.memory());
  addTearDown(db.close);
  return DbProgressStore(db, SharedPreferencesAsync());
}

CaseResult finished(int bed, int stars) => CaseResult(
  bedNum: bed,
  stars: stars,
  mistakes: 3 - stars,
  traysSorted: 4,
  flawlessSteps: 2,
  isEmergency: bed == 3,
);

/// Some play: three beds, a played month with a cleared day and a bed done on the next.
(Progress, Roster) played() {
  var p = Progress.empty;
  for (final r in [finished(1, 3), finished(3, 2), finished(1, 2)]) {
    p = p.record(r).progress.played(65);
  }
  const nov = RosterMonth(2026, 11);
  var roster = Roster.empty.roll(nov, Random(4));
  roster = Roster(
    months: roster.months,
    cleared: {nov.dayKey(1)},
    doneBeds: {
      nov.dayKey(2): {2, 5},
    },
  );
  return (p, roster);
}

void main() {
  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  test('progress, roster and imported cases read back as saved', () async {
    final store = cleanInstall();
    final (progress, roster) = played();
    await store.save(progress);
    await store.saveRoster(roster);
    await store.saveImportedCases('[{"bedNum": 1}]');
    expect((await store.load()).toJson(), progress.toJson());
    expect((await store.loadRoster()).toJson(), roster.toJson());
    expect(await store.loadImportedCases(), '[{"bedNum": 1}]');

    // A later save replaces, it does not merge: the reset leaves no bed behind.
    await store.save(Progress.empty);
    await store.saveRoster(roster.withoutProgress());
    await store.saveImportedCases(null);
    expect((await store.load()).toJson(), Progress.empty.toJson());
    expect((await store.loadRoster()).toJson(), roster.withoutProgress().toJson());
    expect(await store.loadImportedCases(), isNull);
  });

  test('a backup made on one install restores whole on a clean one', () async {
    final (progress, roster) = played();
    final cases = [bedJson(2), bedJson(6)];

    final old = cleanInstall();
    await old.save(progress);
    await old.saveRoster(roster);
    await old.saveImportedCases(writeCaseFile(cases));
    await old.saveSettings(const GameSettings(sound: false, haptics: true));
    final settings = await old.loadSettings();
    final text = writeBackup(
      PlayerData(
        progress: await old.load(),
        roster: await old.loadRoster(),
        importedCases: cases,
        sound: settings.sound,
        haptics: settings.haptics,
      ),
      createdAt: DateTime.utc(2026, 11, 3, 10, 40),
    );

    final fresh = cleanInstall();
    // The fresh install has played a little before restoring: all of it is replaced.
    await fresh.save(Progress.empty.record(finished(7, 1)).progress);
    final read = readBackup(text);
    expect(read, isA<BackupOk>());
    await fresh.restore((read as BackupOk).data);

    expect((await fresh.load()).toJson(), progress.toJson());
    expect((await fresh.loadRoster()).toJson(), roster.toJson());
    expect(readCaseFile((await fresh.loadImportedCases())!), isA<CasesRead>());
    expect(await fresh.loadImportedCases(), writeCaseFile(cases));
    expect((await fresh.loadSettings()).sound, isFalse);
    expect(read.createdAt, DateTime.utc(2026, 11, 3, 10, 40));
  });

  test('restoring a backup without imported cases goes back to the shipped ones', () async {
    final store = cleanInstall();
    await store.saveImportedCases(writeCaseFile([bedJson(1)]));
    await store.restore(const PlayerData(progress: Progress.empty, roster: Roster.empty));
    expect(await store.loadImportedCases(), isNull);
  });
}
