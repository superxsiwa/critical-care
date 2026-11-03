import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/app/sfx.dart';
import 'package:criticalcare/data/case_files.dart';
import 'package:criticalcare/data/case_repository.dart';
import 'package:criticalcare/data/providers.dart';
import 'package:criticalcare/game/case_session.dart';
import 'package:criticalcare/game/progress.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/app.dart';
import '../support/cases.dart';
import '../support/fake_store.dart';
import '../support/files.dart';

void main() {
  late MemoryProgressStore store;
  late FakeCaseFiles files;

  Future<void> pumpSettings(
    WidgetTester tester, {
    String? imported,
    Progress progress = Progress.empty,
  }) async {
    store = MemoryProgressStore(importedCases: imported, progress: progress);
    await pumpApp(
      tester,
      store: store,
      sfx: SilentSfx(),
      overrides: [
        caseFilesProvider.overrideWithValue(files),
        caseRepositoryProvider.overrideWithValue(CaseRepository(DiskBundle())),
        equipmentAssetsProvider.overrideWith(
          (ref) async => {for (final f in Directory('assets/equipment').listSync()) f.path},
        ),
      ],
    );
    await openTab(tester, 'ตั้งค่า');
  }

  testWidgets('import: the file\'s cases replace the ward\'s after a yes', (tester) async {
    files = FakeCaseFiles(jsonEncode([bedJson(3), bedJson(1)]));
    CaseResult done(int bed, int stars) => CaseResult(
      bedNum: bed,
      stars: stars,
      mistakes: 3 - stars,
      traysSorted: 0,
      flawlessSteps: 0,
      isEmergency: false,
    );
    await pumpSettings(
      tester,
      progress: Progress.empty.record(done(1, 1)).progress.record(done(2, 3)).progress,
    );
    expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
    expect(find.text('🔄 คืนค่าเคสตั้งต้น'), findsNothing);

    await tapText(tester, '📥 นำเข้าไฟล์ JSON');
    await settle(tester);
    expect(find.text('แทนที่เคสทั้งหมด?'), findsOneWidget);
    await tapText(tester, 'นำเข้า');
    await settle(tester);
    expect(find.text('นำเข้าเคสสำเร็จทั้งหมด 2 เคส 🎉'), findsOneWidget);
    expect(find.text('ใช้เคสที่นำเข้าจากไฟล์ 2 เคส'), findsOneWidget);
    expect(jsonDecode(store.importedCases!), hasLength(2));

    await openTab(tester, 'วอร์ด');
    expect(find.text('วอร์ดหัวใจ 2 เตียง'), findsOneWidget);
    expect(find.text(bed(3).caseTitle), findsOneWidget);
    expect(find.text(bed(2).caseTitle), findsNothing);
    // Bed 02's 3 stars stay saved but no longer count: the ward holds beds 01 and 03.
    expect(find.text('ผ่านแล้ว 1/2 เตียง'), findsOneWidget);
    expect(find.bySemanticsLabel('ดาวทั้งหมด 1/6'), findsOneWidget);
    expect(store.progress.bed(2).stars, 3);
  });

  testWidgets('import: a bad file changes nothing and says why', (tester) async {
    final bad = copyJson(bedJson(1));
    (bad['stageData'] as List).removeLast();
    files = FakeCaseFiles(jsonEncode([bad]));
    await pumpSettings(tester);
    await tapText(tester, '📥 นำเข้าไฟล์ JSON');
    await settle(tester);
    expect(find.text('รูปแบบไฟล์ JSON ไม่ถูกต้อง'), findsOneWidget);
    expect(find.textContaining('has 5 steps, expected 6'), findsOneWidget);
    await tapText(tester, 'ปิด');
    await settle(tester);
    expect(store.importedCases, isNull);
    expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
  });

  testWidgets('import: cancelling the file dialog does nothing', (tester) async {
    files = FakeCaseFiles();
    await pumpSettings(tester);
    await tapText(tester, '📥 นำเข้าไฟล์ JSON');
    await settle(tester);
    expect(find.text('แทนที่เคสทั้งหมด?'), findsNothing);
    expect(store.importedCases, isNull);
  });

  testWidgets('export writes the ward\'s cases like his, named like his', (tester) async {
    files = FakeCaseFiles();
    await pumpSettings(tester);
    await tapText(tester, 'ส่งออกไฟล์ JSON');
    await settle(tester);
    expect(find.text('ดาวน์โหลดไฟล์ JSON เรียบร้อย 📤'), findsOneWidget);
    final MapEntry(key: name, value: text) = files.saved.entries.single;
    expect(name, matches(RegExp(r'^award_ccu_cases_\d{4}-\d{2}-\d{2}\.json$')));
    expect(jsonDecode(text), [for (var n = 1; n <= 8; n++) bedJson(n)]);
  });

  testWidgets('back to the standard cases after an import', (tester) async {
    files = FakeCaseFiles();
    await pumpSettings(tester, imported: jsonEncode([bedJson(5)]));
    expect(find.text('ใช้เคสที่นำเข้าจากไฟล์ 1 เคส'), findsOneWidget);
    await tapText(tester, '🔄 คืนค่าเคสตั้งต้น');
    await settle(tester);
    expect(find.text('คืนค่าเคสตั้งต้น?'), findsOneWidget);
    await tapText(tester, 'คืนค่าเริ่มต้น');
    await settle(tester);
    expect(find.text('คืนค่าเคสมาตรฐาน CCU เรียบร้อย 🔄'), findsOneWidget);
    expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
    expect(store.importedCases, isNull);
  });
}
