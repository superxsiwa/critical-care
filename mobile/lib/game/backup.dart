/// The backup file (#19): the player's progress, the roster, the imported cases and the
/// settings in one versioned JSON file, to restore after a reinstall or on a new phone.
library;

import 'dart:convert';

import 'case_import.dart';
import 'file_formats.dart';

export 'file_formats.dart' show backupFormat, backupVersion;
import 'progress.dart';
import 'roster.dart';

/// Everything a backup carries.
class PlayerData {
  const PlayerData({
    required this.progress,
    required this.roster,
    this.importedCases,
    this.sound = true,
    this.haptics = true,
  });

  final Progress progress;
  final Roster roster;

  /// The imported file's cases as kept; null when the ward plays the cases shipped in the app.
  final List<Map<String, Object?>>? importedCases;

  final bool sound;
  final bool haptics;
}

/// Far above any real backup (all 8 shipped cases are about 140 KB).
const maxBackupChars = 10 * 1024 * 1024;

String writeBackup(PlayerData data, {required DateTime createdAt, String? appVersion}) =>
    const JsonEncoder.withIndent('  ').convert({
      'format': backupFormat,
      'version': backupVersion,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'app': ?appVersion,
      'progress': data.progress.toJson(),
      'roster': data.roster.toJson(),
      'settings': {'sound': data.sound, 'haptics': data.haptics},
      'cases': data.importedCases,
    });

String backupFileName(DateTime day) =>
    'critical_care_backup_${day.year}-${_two(day.month)}-${_two(day.day)}.json';

String _two(int n) => n.toString().padLeft(2, '0');

sealed class BackupRead {
  const BackupRead();
}

class BackupOk extends BackupRead {
  const BackupOk(this.data, this.createdAt);

  final PlayerData data;

  /// When the backup was made (UTC).
  final DateTime createdAt;
}

/// Nothing restored: what is wrong, one line per problem (paths name the JSON field).
class BackupRejected extends BackupRead {
  const BackupRejected(this.problems);

  final List<String> problems;
}

/// Reads a backup file. Unlike the app's own saved data, which starts over on anything it cannot
/// read, a backup is checked strictly and restored whole or not at all: a wrong type, a value out
/// of range or an imported case that no longer passes the case checks ([imageExists] answers for
/// equipment pictures) rejects the file.
BackupRead readBackup(String text, {bool Function(String img)? imageExists}) {
  if (text.length > maxBackupChars) {
    return const BackupRejected(['file too large to be a backup']);
  }
  final Object? json;
  try {
    json = jsonDecode(text.startsWith('﻿') ? text.substring(1) : text);
  } on FormatException catch (e) {
    return BackupRejected(['not JSON: ${e.message}']);
  }
  if (json is List ||
      (json is Map && json['format'] == null && json['cases'] is List) ||
      (json is Map && json['format'] == casePackageFormat)) {
    return const BackupRejected(['this is a case file, not a backup: import it under the cases']);
  }
  if (json is! Map<String, Object?> || json['format'] != backupFormat) {
    return const BackupRejected(['not a Critical Care backup file']);
  }
  final version = json['version'];
  if (version is! int || version < 1) {
    return BackupRejected(['version: expected a whole number from 1, found ${_show(version)}']);
  }
  if (version > backupVersion) {
    return BackupRejected([
      'made by a newer version of the app (backup version $version, this app reads up to '
          '$backupVersion): update the app first',
    ]);
  }

  final problems = <String>[];
  final created = json['createdAt'];
  final createdAt = created is String ? DateTime.tryParse(created) : null;
  if (createdAt == null) problems.add('createdAt: expected a date, found ${_show(created)}');
  _checkProgress(json['progress'], problems);
  _checkRoster(json['roster'], problems);
  final settings = json['settings'];
  if (settings is! Map<String, Object?>) {
    problems.add('settings: expected an object');
  } else {
    for (final k in const ['sound', 'haptics']) {
      if (settings[k] is! bool) problems.add('settings.$k: expected true or false');
    }
  }
  List<Map<String, Object?>>? cases;
  switch (json['cases']) {
    case null:
      break;
    case final List<Object?> list:
      switch (readCaseFile(jsonEncode(list), imageExists: imageExists)) {
        case CasesRead(json: final read):
          cases = read;
        case CasesRejected(problems: final p):
          problems.addAll([for (final x in p) 'cases: $x']);
      }
    case final other:
      problems.add('cases: expected a list of cases or null, found ${_show(other)}');
  }
  if (problems.isNotEmpty) return BackupRejected(problems);

  final s = settings as Map<String, Object?>;
  return BackupOk(
    PlayerData(
      progress: Progress.fromJson(json['progress']),
      roster: Roster.fromJson(json['roster']),
      importedCases: cases,
      sound: s['sound'] as bool,
      haptics: s['haptics'] as bool,
    ),
    createdAt!.toUtc(),
  );
}

void _checkProgress(Object? p, List<String> problems) {
  if (p is! Map<String, Object?>) {
    problems.add('progress: expected an object');
    return;
  }
  if (p['version'] != Progress.schemaVersion) {
    problems.add(
      'progress.version: expected ${Progress.schemaVersion}, found ${_show(p['version'])}',
    );
  }
  final beds = p['beds'];
  if (beds is! Map<String, Object?>) {
    problems.add('progress.beds: expected an object');
  } else {
    for (final MapEntry(:key, :value) in beds.entries) {
      final where = 'progress.beds.$key';
      final n = int.tryParse(key);
      if (n == null || n < 1) problems.add('$where: a bed number must be a whole number from 1');
      if (value is! Map<String, Object?>) {
        problems.add('$where: expected an object');
        continue;
      }
      if (value['passed'] is! bool) problems.add('$where.passed: expected true or false');
      final stars = value['stars'];
      if (stars is! int || stars < 0 || stars > 3) {
        problems.add('$where.stars: expected 0 to 3, found ${_show(stars)}');
      }
    }
  }
  final stats = p['stats'];
  if (stats is! Map<String, Object?>) {
    problems.add('progress.stats: expected an object');
  } else {
    for (final k in const PlayerStats().toJson().keys) {
      final v = stats[k];
      if (v is! int || v < 0) {
        problems.add('progress.stats.$k: expected a whole number from 0, found ${_show(v)}');
      }
    }
  }
}

final _monthKey = RegExp(r'^(\d{4})-(\d{2})$');
final _dayKey = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$');
final _shiftCodes = {for (final s in Shift.values) s.code};

bool _isDay(String key) {
  final m = _dayKey.firstMatch(key);
  if (m == null) return false;
  final (y, mo, d) = (int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
  return mo >= 1 && mo <= 12 && d >= 1 && d <= RosterMonth(y, mo).days;
}

void _checkRoster(Object? r, List<String> problems) {
  if (r is! Map<String, Object?>) {
    problems.add('roster: expected an object');
    return;
  }
  if (r['version'] != Roster.schemaVersion) {
    problems.add('roster.version: expected ${Roster.schemaVersion}, found ${_show(r['version'])}');
  }
  final months = r['months'];
  if (months is! Map<String, Object?>) {
    problems.add('roster.months: expected an object');
  } else {
    for (final MapEntry(:key, :value) in months.entries) {
      final where = 'roster.months.$key';
      final m = _monthKey.firstMatch(key);
      final month = m == null ? 0 : int.parse(m[2]!);
      if (m == null || month < 1 || month > 12) {
        problems.add('$where: expected a month such as 2026-11');
        continue;
      }
      final days = RosterMonth(int.parse(m[1]!), month).days;
      if (value is! String ||
          value.length != days ||
          !value.split('').every(_shiftCodes.contains)) {
        problems.add('$where: expected $days shift letters (${_shiftCodes.join()})');
      }
    }
  }
  final cleared = r['cleared'];
  if (cleared is! List<Object?>) {
    problems.add('roster.cleared: expected a list of days');
  } else {
    for (final d in cleared) {
      if (d is! String || !_isDay(d)) {
        problems.add('roster.cleared: expected days such as 2026-11-03, found ${_show(d)}');
      }
    }
  }
  final done = r['doneBeds'];
  if (done is! Map<String, Object?>) {
    problems.add('roster.doneBeds: expected an object');
  } else {
    for (final MapEntry(:key, :value) in done.entries) {
      final where = 'roster.doneBeds.$key';
      if (!_isDay(key)) problems.add('$where: expected a day such as 2026-11-03');
      if (value is! List<Object?> || !value.every((n) => n is int && n >= 1)) {
        problems.add('$where: expected a list of bed numbers');
      }
    }
  }
}

String _show(Object? v) => switch (v) {
  null => 'nothing',
  String s => '"$s"',
  _ => '$v',
};
