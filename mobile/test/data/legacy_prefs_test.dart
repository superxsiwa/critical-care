import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/data/db/game_database.dart';
import 'package:criticalcare/data/db_progress_store.dart';
import 'package:criticalcare/data/legacy_prefs.dart';
import 'package:criticalcare/game/case_import.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

import '../support/cases.dart';

/// The values builds `qa-1` to `qa-5` wrote (PrefsProgressStore, `jsonEncode` of the models),
/// frozen as text: the upgrade must read what phones hold, whatever the models become.
const oldProgress =
    '{"version":1,"beds":{"1":{"passed":true,"stars":3},"2":{"passed":true,"stars":1},'
    '"4":{"passed":false,"stars":0}},"stats":{"totalPlaySeconds":1835,"totalCompletedCases":4,'
    '"perfectCases":1,"emergencyCasesDone":2,"replayedCases":1,"trayItemsSorted":14,'
    '"stepsWithoutMistake":11}}';
const oldRoster =
    '{"version":1,"months":{"2026-10":"mmaannoommaannoommaannoommaanno",'
    '"2026-11":"anomanomanomanomanomanomanoman"},"cleared":["2026-10-01","2026-10-03"],'
    '"doneBeds":{"2026-10-05":[3,5]}}';

void main() {
  late SharedPreferencesAsync prefs;
  late String oldCases;

  setUpAll(() => driftRuntimeOptions.dontWarnAboutMultipleDatabases = true);

  setUp(() async {
    SharedPreferencesAsyncPlatform.instance = InMemorySharedPreferencesAsync.empty();
    prefs = SharedPreferencesAsync();
    oldCases = writeCaseFile([bedJson(3), bedJson(1)]);
    await prefs.setString(legacyProgressKey, oldProgress);
    await prefs.setString(legacyRosterKey, oldRoster);
    await prefs.setString(legacyCasesKey, oldCases);
    // Settings and the notice flag stay in SharedPreferences.
    await prefs.setBool('settings.sound', false);
    await prefs.setBool('notice.seen', true);
  });

  GameDatabase memoryDb() {
    final db = GameDatabase(NativeDatabase.memory());
    addTearDown(db.close);
    return db;
  }

  Future<void> expectOldData(DbProgressStore store) async {
    expect((await store.load()).toJson(), jsonDecode(oldProgress));
    expect((await store.loadRoster()).toJson(), jsonDecode(oldRoster));
    expect(await store.loadImportedCases(), oldCases);
  }

  test('an upgrade keeps progress, roster and imported cases, and the old keys go', () async {
    final store = DbProgressStore(memoryDb(), prefs);
    await expectOldData(store);
    expect(await prefs.getKeys(allowList: legacyKeys), isEmpty);
    // What stays in SharedPreferences is still read from there.
    expect((await store.loadSettings()).sound, isFalse);
    expect(await store.noticeSeen(), isTrue);
    expect(await prefs.getBool('settings.sound'), isFalse);
  });

  test('the moved data survives closing and reopening the app', () async {
    final dir = await Directory.systemTemp.createTemp('cc_db_');
    addTearDown(() => dir.delete(recursive: true));
    final file = File('${dir.path}/critical_care.sqlite');

    final first = GameDatabase(NativeDatabase(file));
    await expectOldData(DbProgressStore(first, prefs));
    await first.close();

    final second = GameDatabase(NativeDatabase(file));
    addTearDown(second.close);
    await expectOldData(DbProgressStore(second, prefs));
  });

  test('the move runs once: old keys seen again later are dropped, not read', () async {
    final db = memoryDb();
    await DbProgressStore(db, prefs).load();
    expect(await db.meta(legacyMovedMeta), isNotNull);

    await prefs.setString(legacyProgressKey, '{"version":1,"beds":{},"stats":{}}');
    final again = DbProgressStore(db, prefs);
    await expectOldData(again);
    expect(await prefs.getKeys(allowList: legacyKeys), isEmpty);
  });

  test('a value that no longer reads starts over; the others still move', () async {
    await prefs.setString(legacyProgressKey, '{"version":1,"beds":');
    final store = DbProgressStore(memoryDb(), prefs);
    final progress = await store.load();
    expect(progress.beds, isEmpty);
    expect(progress.stats.totalPlaySeconds, 0);
    expect((await store.loadRoster()).toJson(), jsonDecode(oldRoster));
    expect(await store.loadImportedCases(), oldCases);
  });

  test('a fresh install has nothing to move', () async {
    SharedPreferencesAsyncPlatform.instance = InMemorySharedPreferencesAsync.empty();
    final db = memoryDb();
    final store = DbProgressStore(db, SharedPreferencesAsync());
    expect((await store.load()).beds, isEmpty);
    expect((await store.loadRoster()).months, isEmpty);
    expect(await store.loadImportedCases(), isNull);
    expect(await db.meta(legacyMovedMeta), isNotNull);
  });
}
