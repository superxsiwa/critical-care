import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

import '../../game/progress.dart';
import '../../game/roster.dart';

part 'game_database.g.dart';

/// The best stars of each bed (`Progress.beds`).
@DataClassName('BedRow')
class BedRecords extends Table {
  IntColumn get bedNum => integer()();
  BoolColumn get passed => boolean()();
  IntColumn get stars => integer()();

  @override
  Set<Column> get primaryKey => {bedNum};
}

/// His PlayerStats counters: a single row, id 1.
@DataClassName('StatsRow')
class PlayerStatsRows extends Table {
  @override
  String get tableName => 'player_stats';

  IntColumn get id => integer()();
  IntColumn get totalPlaySeconds => integer()();
  IntColumn get totalCompletedCases => integer()();
  IntColumn get perfectCases => integer()();
  IntColumn get emergencyCasesDone => integer()();
  IntColumn get replayedCases => integer()();
  IntColumn get trayItemsSorted => integer()();
  IntColumn get stepsWithoutMistake => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

/// The roster's schedule: one row per month seen, one shift letter per day (`Shift.code`).
@DataClassName('RosterMonthRow')
class RosterMonths extends Table {
  TextColumn get monthKey => text()();
  TextColumn get shifts => text()();

  @override
  Set<Column> get primaryKey => {monthKey};
}

/// Worked days cleared, by day key (`2026-11-03`).
@DataClassName('ClearedDayRow')
class RosterClearedDays extends Table {
  TextColumn get dayKey => text()();

  @override
  Set<Column> get primaryKey => {dayKey};
}

/// Beds finished on the playable day, until the day clears.
@DataClassName('DoneBedRow')
class RosterDoneBeds extends Table {
  TextColumn get dayKey => text()();
  IntColumn get bedNum => integer()();

  @override
  Set<Column> get primaryKey => {dayKey, bedNum};
}

/// The imported case file as kept and exported (his import replaces every case): one row, id 1.
/// No row means the ward plays the cases shipped in the app.
@DataClassName('CaseFileRow')
class ImportedCaseFiles extends Table {
  IntColumn get id => integer()();
  TextColumn get json => text()();
  DateTimeColumn get savedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Facts about the store itself, such as when the old preferences were moved in.
@DataClassName('MetaRow')
class StoreMeta extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

/// The player's data on the device: progress, the roster and the imported cases, in SQLite
/// (a file on the phone; the browser's storage on the web, through Drift's WebAssembly build).
/// Settings and the notice flag stay in SharedPreferences.
@DriftDatabase(
  tables: [
    BedRecords,
    PlayerStatsRows,
    RosterMonths,
    RosterClearedDays,
    RosterDoneBeds,
    ImportedCaseFiles,
    StoreMeta,
  ],
)
class GameDatabase extends _$GameDatabase {
  GameDatabase(super.executor);

  /// The app's own database file, `critical_care`.
  GameDatabase.open()
    : super(
        driftDatabase(
          name: 'critical_care',
          web: DriftWebOptions(
            sqlite3Wasm: Uri.parse('sqlite3.wasm'),
            driftWorker: Uri.parse('drift_worker.js'),
          ),
        ),
      );

  /// Raise it with every schema change, freeze the new version (`dart run drift_dev
  /// make-migrations`) and add its step to [migration].
  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(onCreate: (m) => m.createAll());

  // ---------- progress ----------

  Future<Progress> readProgress() async {
    final beds = await select(bedRecords).get();
    final s = await (select(playerStatsRows)..where((t) => t.id.equals(1))).getSingleOrNull();
    return Progress(
      beds: {for (final b in beds) b.bedNum: BedRecord(passed: b.passed, stars: b.stars)},
      stats: s == null
          ? const PlayerStats()
          : PlayerStats(
              totalPlaySeconds: s.totalPlaySeconds,
              totalCompletedCases: s.totalCompletedCases,
              perfectCases: s.perfectCases,
              emergencyCasesDone: s.emergencyCasesDone,
              replayedCases: s.replayedCases,
              trayItemsSorted: s.trayItemsSorted,
              stepsWithoutMistake: s.stepsWithoutMistake,
            ),
    );
  }

  /// Replaces the saved progress with [progress], all or nothing.
  Future<void> writeProgress(Progress progress) => transaction(() async {
    final s = progress.stats;
    await delete(bedRecords).go();
    await batch((b) {
      b.insertAll(bedRecords, [
        for (final MapEntry(key: n, value: r) in progress.beds.entries)
          BedRecordsCompanion.insert(bedNum: Value(n), passed: r.passed, stars: r.stars),
      ]);
      b.insertAllOnConflictUpdate(playerStatsRows, [
        PlayerStatsRowsCompanion.insert(
          id: const Value(1),
          totalPlaySeconds: s.totalPlaySeconds,
          totalCompletedCases: s.totalCompletedCases,
          perfectCases: s.perfectCases,
          emergencyCasesDone: s.emergencyCasesDone,
          replayedCases: s.replayedCases,
          trayItemsSorted: s.trayItemsSorted,
          stepsWithoutMistake: s.stepsWithoutMistake,
        ),
      ]);
    });
  });

  // ---------- roster ----------

  /// The roster, read back through [Roster.fromJson] so one parser decides what a valid month is
  /// (a month with an unknown shift letter is dropped and drawn again, as before).
  Future<Roster> readRoster() async {
    final months = await select(rosterMonths).get();
    final cleared = await select(rosterClearedDays).get();
    final done = await select(rosterDoneBeds).get();
    final doneBeds = <String, List<int>>{};
    for (final d in done) {
      (doneBeds[d.dayKey] ??= []).add(d.bedNum);
    }
    return Roster.fromJson({
      'months': {for (final m in months) m.monthKey: m.shifts},
      'cleared': [for (final c in cleared) c.dayKey],
      'doneBeds': doneBeds,
    });
  }

  /// Replaces the saved roster with [roster], all or nothing.
  Future<void> writeRoster(Roster roster) => transaction(() async {
    await delete(rosterMonths).go();
    await delete(rosterClearedDays).go();
    await delete(rosterDoneBeds).go();
    await batch((b) {
      b.insertAll(rosterMonths, [
        for (final MapEntry(key: k, value: days) in roster.months.entries)
          RosterMonthsCompanion.insert(monthKey: k, shifts: days.map((s) => s.code).join()),
      ]);
      b.insertAll(rosterClearedDays, [
        for (final k in roster.cleared) RosterClearedDaysCompanion.insert(dayKey: k),
      ]);
      b.insertAll(rosterDoneBeds, [
        for (final MapEntry(key: k, value: beds) in roster.doneBeds.entries)
          for (final n in beds) RosterDoneBedsCompanion.insert(dayKey: k, bedNum: n),
      ]);
    });
  });

  // ---------- imported cases ----------

  Future<String?> readImportedCases() async =>
      (await (select(importedCaseFiles)..where((t) => t.id.equals(1))).getSingleOrNull())?.json;

  /// Keeps [json] as the imported case file; null goes back to the shipped cases.
  Future<void> writeImportedCases(String? json, {required DateTime savedAt}) async {
    if (json == null) {
      await delete(importedCaseFiles).go();
    } else {
      await into(importedCaseFiles).insertOnConflictUpdate(
        ImportedCaseFilesCompanion.insert(id: const Value(1), json: json, savedAt: savedAt),
      );
    }
  }

  // ---------- meta ----------

  Future<String?> meta(String key) async =>
      (await (select(storeMeta)..where((t) => t.key.equals(key))).getSingleOrNull())?.value;

  Future<void> setMeta(String key, String value) =>
      into(storeMeta).insertOnConflictUpdate(StoreMetaCompanion.insert(key: key, value: value));
}
