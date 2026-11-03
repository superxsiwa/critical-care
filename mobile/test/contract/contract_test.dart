import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/game/case_import.dart';
import 'package:criticalcare/game/file_formats.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/cases.dart';

/// The shared case package contract (`../contract/`): the app must reach the same verdict on
/// every example as `verdicts.json` says, and the Case Studio's server runs the same file.
const contract = '../contract';

final schema = JsonSchema.create(
  jsonDecode(File('$contract/case-package.v1.schema.json').readAsStringSync()),
);

bool imageExists(String img) {
  final m = RegExp(r'(?:^|/)equipment/([a-z0-9_]+\.png)$').firstMatch(img);
  return m != null && File('assets/equipment/${m[1]}').existsSync();
}

void main() {
  final verdicts = (jsonDecode(File('$contract/examples/verdicts.json').readAsStringSync()) as List)
      .cast<Map<String, Object?>>();

  test('the contract has valid and invalid examples', () {
    expect(verdicts.where((v) => v['ok'] == true), isNotEmpty);
    expect(verdicts.where((v) => v['ok'] == false), isNotEmpty);
  });

  for (final v in verdicts) {
    final file = v['file'] as String;
    final text = File('$contract/examples/$file').readAsStringSync();

    test('$file: the app ${v['ok'] == true ? 'accepts it' : 'refuses it'} (${v['about']})', () {
      final read = readCaseFile(text, imageExists: imageExists);
      if (v['ok'] == true) {
        expect(read, isA<CasesRead>(), reason: '$read');
        expect([for (final c in (read as CasesRead).cases) c.bedNum], v['beds']);
      } else {
        expect(read, isA<CasesRejected>());
        expect(
          (read as CasesRejected).problems,
          contains(contains(v['problem'] as String)),
          reason: 'the contract says the problem reads "${v['problem']}"',
        );
      }
    });

    if (v['schema'] != 'skip') {
      test('$file: the schema says ${v['schema']}', () {
        final result = schema.validate(jsonDecode(text));
        expect(result.isValid, v['schema'] == 'pass', reason: '${result.errors}');
      });
    }
  }

  test('all 8 cases shipped in the app fit the schema as a package', () {
    final package = {
      'format': casePackageFormat,
      'version': casePackageVersion,
      'cases': [for (var n = 1; n <= 8; n++) bedJson(n)],
    };
    final result = schema.validate(package);
    expect(result.isValid, isTrue, reason: '${result.errors}');
  });

  test('the schema names the same format and version as the app', () {
    final props =
        (jsonDecode(File('$contract/case-package.v1.schema.json').readAsStringSync())
                as Map)['properties']
            as Map;
    expect((props['format'] as Map)['const'], casePackageFormat);
    expect((props['version'] as Map)['const'], casePackageVersion);
  });
}
