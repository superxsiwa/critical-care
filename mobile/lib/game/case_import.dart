/// Reading and writing a case file, after superxsiwa's JSON import and export (CaseManagerPage,
/// `importCases` in his backend, `handleExportCases` in App.tsx). A file holds every case: an
/// import replaces them all.
library;

import 'dart:convert';

import 'case_model.dart';
import 'case_validation.dart';
import 'file_formats.dart';

sealed class CaseImport {
  const CaseImport();
}

/// Every case read and playable, in bed order, with the JSON to keep and export again.
class CasesRead extends CaseImport {
  const CasesRead(this.cases, this.json);

  final List<BedCase> cases;
  final List<Map<String, Object?>> json;
}

/// Nothing imported: what is wrong, one line per problem (paths name the JSON field).
class CasesRejected extends CaseImport {
  const CasesRejected(this.problems);

  final List<String> problems;
}

/// Reads [text]: a case package (`contract/README.md`: `format`, `version`, `cases`), or his
/// format, a list of cases or an object with a `cases` list, where a missing or unreadable
/// `bedNum` takes the case's place in the list. A package newer than this app, another named
/// file (a backup) or an unknown format is refused. Then every case must pass the same
/// checks as the cases shipped in the app ([imageExists] answers for equipment pictures); one
/// bad case rejects the whole file, so the ward never holds a case that cannot be played.
CaseImport readCaseFile(String text, {bool Function(String img)? imageExists}) {
  final Object? decoded;
  try {
    // A byte order mark (some Windows editors write one) is not JSON.
    decoded = jsonDecode(text.startsWith('\uFEFF') ? text.substring(1) : text);
  } on FormatException catch (e) {
    return CasesRejected(['not JSON: ${e.message}']);
  }
  if (decoded is Map<String, Object?> && decoded['format'] != null) {
    if (_packageProblem(decoded) case final String problem) return CasesRejected([problem]);
    if (decoded['cases'] case final List<Object?> l when l.isEmpty) {
      return const CasesRejected(['cases: expected at least one case']);
    }
  }
  final list = switch (decoded) {
    final List<Object?> l => l,
    {'cases': final List<Object?> l} => l,
    _ => null,
  };
  if (list == null || list.isEmpty) {
    return const CasesRejected(['expected a list of cases, or {"cases": [...]}']);
  }

  final problems = <String>[];
  final read = <(BedCase, Map<String, Object?>)>[];
  for (final (i, item) in list.indexed) {
    final where = 'case ${i + 1}';
    if (item is! Map<String, Object?>) {
      problems.add('$where: expected an object');
      continue;
    }
    final json = {...item, 'bedNum': _bedNum(item['bedNum']) ?? i + 1};
    final BedCase bedCase;
    try {
      bedCase = BedCase.fromJson(json);
    } on CaseFormatException catch (e) {
      problems.add('$where: ${e.path}: ${e.message}');
      continue;
    }
    for (final issue in validateCase(bedCase, imageExists: imageExists)) {
      problems.add('$where (bed ${bedCase.bedNum}): $issue');
    }
    read.add((bedCase, json));
  }

  final seen = <int>{};
  for (final (c, _) in read) {
    if (!seen.add(c.bedNum)) problems.add('bed ${c.bedNum} is in the file twice');
  }
  if (problems.isNotEmpty) return CasesRejected(problems);
  read.sort((a, b) => a.$1.bedNum.compareTo(b.$1.bedNum));
  return CasesRead([for (final (c, _) in read) c], [for (final (_, j) in read) j]);
}

/// Why a file that names its `format` cannot be read as a case package, or null when it can.
String? _packageProblem(Map<String, Object?> file) {
  final format = file['format'];
  if (format == backupFormat) {
    return 'this is a backup file, not a case file: restore it under the backup in settings';
  }
  if (format != casePackageFormat) return 'not a case package (format "$format")';
  final version = file['version'];
  if (version is! int || version < 1) {
    return 'version: expected a whole number from 1, found ${version ?? 'nothing'}';
  }
  if (version > casePackageVersion) {
    return 'made by a newer Case Studio (package version $version, this app reads up to '
        '$casePackageVersion): update the app first';
  }
  if (file['cases'] is! List) return 'cases: expected a list of cases';
  return null;
}

/// His `Number(c.bedNum) || i + 1`: a number or numeric text above zero, else null.
int? _bedNum(Object? v) {
  final n = switch (v) {
    final num n => n,
    final String s => num.tryParse(s.trim()),
    _ => null,
  };
  return n != null && n > 0 && n == n.roundToDouble() ? n.toInt() : null;
}

/// The file his export writes: every case, indented by two spaces (`JSON.stringify(beds, null, 2)`).
String writeCaseFile(List<Map<String, Object?>> cases) =>
    const JsonEncoder.withIndent('  ').convert(cases);

/// His export's file name: `award_ccu_cases_<date>.json`.
String caseFileName(DateTime day) =>
    'award_ccu_cases_${day.year}-${_two(day.month)}-${_two(day.day)}.json';

String _two(int n) => n.toString().padLeft(2, '0');
