import 'dart:convert';

import 'package:criticalcare/game/backup.dart';
import 'package:criticalcare/game/progress.dart';
import 'package:criticalcare/game/roster.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/cases.dart';

final _created = DateTime.utc(2026, 11, 3, 10, 40);

/// A valid backup as a map, to break one field at a time.
Map<String, Object?> validBackup({List<Map<String, Object?>>? cases}) => jsonDecode(
  writeBackup(
    PlayerData(
      progress: const Progress(
        beds: {1: BedRecord(passed: true, stars: 3), 4: BedRecord(passed: false, stars: 0)},
        stats: PlayerStats(totalPlaySeconds: 600, totalCompletedCases: 2),
      ),
      roster: Roster(
        months: {
          '2026-11': [for (var d = 1; d <= 30; d++) Shift.values[d % 4]],
        },
        cleared: const {'2026-11-01'},
        doneBeds: const {
          '2026-11-02': {3},
        },
      ),
      importedCases: cases,
      sound: false,
    ),
    createdAt: _created,
    appVersion: '1.0.0+6',
  ),
) as Map<String, Object?>;

List<String> problemsOf(Object? json) => switch (readBackup(jsonEncode(json))) {
  BackupRejected(:final problems) => problems,
  BackupOk() => const [],
};

void main() {
  test('a backup reads back as written', () {
    final text = jsonEncode(validBackup(cases: [bedJson(5), bedJson(2)]));
    final read = readBackup(text);
    expect(read, isA<BackupOk>());
    final BackupOk(:data, :createdAt) = read as BackupOk;
    expect(createdAt, _created);
    expect(data.progress.toJson(), validBackup()['progress']);
    expect(data.roster.toJson(), validBackup()['roster']);
    expect(data.importedCases, [bedJson(2), bedJson(5)], reason: 'kept in bed order');
    expect((data.sound, data.haptics), (false, true));
  });

  test('the file says what it is and which layout it has', () {
    final json = validBackup();
    expect(json['format'], 'critical-care-backup');
    expect(json['version'], 1);
    expect(json['createdAt'], '2026-11-03T10:40:00.000Z');
    expect(json['app'], '1.0.0+6');
    expect(json['cases'], isNull);
    expect(backupFileName(DateTime(2026, 11, 3)), 'critical_care_backup_2026-11-03.json');
  });

  group('rejected, with the reason', () {
    test('not JSON, or cut short', () {
      final text = jsonEncode(validBackup());
      expect(readBackup(text.substring(0, text.length ~/ 2)), isA<BackupRejected>());
      expect(problemsOf('hello'), ['not a Critical Care backup file']);
    });

    test('a case file picked by mistake', () {
      expect(problemsOf([bedJson(1)]), [
        'this is a case file, not a backup: import it under the cases',
      ]);
      expect(
        problemsOf({
          'cases': [bedJson(1)],
        }),
        ['this is a case file, not a backup: import it under the cases'],
      );
      expect(
        problemsOf({
          'format': 'critical-care-cases',
          'version': 1,
          'cases': [bedJson(1)],
        }),
        ['this is a case file, not a backup: import it under the cases'],
      );
    });

    test('another JSON file', () {
      expect(problemsOf({'name': 'x'}), ['not a Critical Care backup file']);
      expect(problemsOf({...validBackup(), 'format': 'award-ccu'}), [
        'not a Critical Care backup file',
      ]);
    });

    test('made by a newer app, or an unknown version', () {
      expect(problemsOf({...validBackup(), 'version': 2}).single, contains('update the app first'));
      expect(problemsOf({...validBackup(), 'version': 0}).single, startsWith('version:'));
      expect(problemsOf({...validBackup(), 'version': '1'}).single, startsWith('version:'));
    });

    test('progress out of range or of the wrong type', () {
      final json = validBackup();
      final progress = json['progress'] as Map<String, Object?>;
      (progress['beds'] as Map<String, Object?>)['1'] = {'passed': true, 'stars': 4};
      (progress['beds'] as Map<String, Object?>)['x'] = {'passed': 'yes', 'stars': 1};
      (progress['stats'] as Map<String, Object?>)['perfectCases'] = -1;
      (progress['stats'] as Map<String, Object?>).remove('replayedCases');
      expect(problemsOf(json), [
        'progress.beds.1.stars: expected 0 to 3, found 4',
        'progress.beds.x: a bed number must be a whole number from 1',
        'progress.beds.x.passed: expected true or false',
        'progress.stats.perfectCases: expected a whole number from 0, found -1',
        'progress.stats.replayedCases: expected a whole number from 0, found nothing',
      ]);
    });

    test('a roster that does not fit the calendar', () {
      final json = validBackup();
      final roster = json['roster'] as Map<String, Object?>;
      (roster['months'] as Map<String, Object?>)['2026-02'] = 'm' * 30;
      (roster['months'] as Map<String, Object?>)['2026-12'] = 'x' * 31;
      (roster['months'] as Map<String, Object?>)['2026-13'] = 'm' * 31;
      roster['cleared'] = ['2026-11-31'];
      (roster['doneBeds'] as Map<String, Object?>)['2026-11-02'] = [0];
      expect(problemsOf(json), [
        'roster.months.2026-02: expected 28 shift letters (mano)',
        'roster.months.2026-12: expected 31 shift letters (mano)',
        'roster.months.2026-13: expected a month such as 2026-11',
        'roster.cleared: expected days such as 2026-11-03, found "2026-11-31"',
        'roster.doneBeds.2026-11-02: expected a list of bed numbers',
      ]);
    });

    test('missing parts', () {
      final json = validBackup()
        ..remove('progress')
        ..remove('roster')
        ..remove('createdAt')
        ..['settings'] = {'sound': 1};
      expect(problemsOf(json), [
        'createdAt: expected a date, found nothing',
        'progress: expected an object',
        'roster: expected an object',
        'settings.sound: expected true or false',
        'settings.haptics: expected true or false',
      ]);
    });

    test('an imported case that no longer passes the case checks', () {
      final bad = copyJson(bedJson(1));
      (bad['stageData'] as List).removeLast();
      final problems = problemsOf(validBackup(cases: [bad]));
      expect(problems, isNotEmpty);
      expect(problems.every((p) => p.startsWith('cases: case 1 (bed 1): ')), isTrue);
      expect(problemsOf({...validBackup(), 'cases': 'bed01'}), [
        'cases: expected a list of cases or null, found "bed01"',
      ]);
    });

    test('a file far too large', () {
      expect(readBackup(' ' * (maxBackupChars + 1)), isA<BackupRejected>());
    });
  });
}
