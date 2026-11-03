import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/app/sfx.dart';
import 'package:criticalcare/data/backup_service.dart';
import 'package:criticalcare/data/case_files.dart';
import 'package:criticalcare/data/case_repository.dart';
import 'package:criticalcare/data/providers.dart';
import 'package:criticalcare/game/backup.dart';
import 'package:criticalcare/game/case_session.dart';
import 'package:criticalcare/game/progress.dart';
import 'package:criticalcare/game/roster.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/app.dart';
import '../support/cases.dart';
import '../support/fake_store.dart';
import '../support/files.dart';

CaseResult done(int bed, int stars) => CaseResult(
  bedNum: bed,
  stars: stars,
  mistakes: 3 - stars,
  traysSorted: 0,
  flawlessSteps: 0,
  isEmergency: false,
);

void main() {
  late MemoryProgressStore store;
  late FakeCaseFiles files;

  Future<void> pumpSettings(WidgetTester tester, {Progress progress = Progress.empty}) async {
    store = MemoryProgressStore(progress: progress);
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
        appVersionProvider.overrideWith((ref) async => '1.0.0+6'),
      ],
    );
    await openTab(tester, 'ตั้งค่า');
  }

  testWidgets('export saves a backup file of what the player has', (tester) async {
    files = FakeCaseFiles();
    await pumpSettings(tester, progress: Progress.empty.record(done(2, 3)).progress);
    expect(find.text('💾 สำรองข้อมูล'), findsOneWidget);
    await tapText(tester, 'ส่งออกไฟล์สำรองข้อมูล');
    await settle(tester);
    expect(find.text('บันทึกไฟล์สำรองข้อมูลเรียบร้อย 💾'), findsOneWidget);

    final MapEntry(key: name, value: text) = files.saved.entries.single;
    expect(name, matches(RegExp(r'^critical_care_backup_\d{4}-\d{2}-\d{2}\.json$')));
    final read = readBackup(text);
    expect(read, isA<BackupOk>());
    expect((read as BackupOk).data.progress.bed(2).stars, 3);
    expect(jsonDecode(text)['app'], '1.0.0+6');
  });

  testWidgets('restore replaces everything after a yes', (tester) async {
    final backup = writeBackup(
      PlayerData(
        progress: Progress.empty.record(done(1, 3)).progress.record(done(4, 2)).progress,
        roster: Roster.empty,
        importedCases: [bedJson(1), bedJson(4)],
        haptics: false,
      ),
      createdAt: DateTime(2026, 11, 3, 9, 5),
    );
    files = FakeCaseFiles(backup);
    await pumpSettings(tester, progress: Progress.empty.record(done(7, 1)).progress);

    await tapText(tester, 'กู้คืนจากไฟล์สำรองข้อมูล');
    await settle(tester);
    expect(find.text('กู้คืนข้อมูลจากไฟล์นี้?'), findsOneWidget);
    expect(find.textContaining('3/11/2569 09:05'), findsOneWidget);
    await tapText(tester, 'กู้คืน');
    await settle(tester);

    expect(find.text('กู้คืนข้อมูลเรียบร้อย ✅'), findsOneWidget);
    expect(store.progress.bed(1).stars, 3);
    expect(store.progress.bed(7).stars, 0, reason: 'the old progress is replaced');
    expect(jsonDecode(store.importedCases!), hasLength(2));
    expect(store.settings.haptics, isFalse);
    expect(find.text('ใช้เคสที่นำเข้าจากไฟล์ 2 เคส'), findsOneWidget);

    await openTab(tester, 'วอร์ด');
    expect(find.text('วอร์ดหัวใจ 2 เตียง'), findsOneWidget);
    expect(find.text('ผ่านแล้ว 2/2 เตียง'), findsOneWidget);
  });

  testWidgets('a case file picked as a backup changes nothing and says why', (tester) async {
    files = FakeCaseFiles(jsonEncode([bedJson(1)]));
    await pumpSettings(tester, progress: Progress.empty.record(done(7, 1)).progress);
    await tapText(tester, 'กู้คืนจากไฟล์สำรองข้อมูล');
    await settle(tester);
    expect(find.text('ใช้ไฟล์สำรองข้อมูลนี้ไม่ได้'), findsOneWidget);
    expect(find.textContaining('this is a case file'), findsOneWidget);
    await tapText(tester, 'ปิด');
    await settle(tester);
    expect(store.progress.bed(7).stars, 1);
    expect(store.importedCases, isNull);
  });

  testWidgets('saying no to the restore changes nothing', (tester) async {
    files = FakeCaseFiles(
      writeBackup(
        const PlayerData(progress: Progress.empty, roster: Roster.empty),
        createdAt: DateTime(2026, 11, 3),
      ),
    );
    await pumpSettings(tester, progress: Progress.empty.record(done(7, 1)).progress);
    await tapText(tester, 'กู้คืนจากไฟล์สำรองข้อมูล');
    await settle(tester);
    await tapText(tester, 'ยกเลิก');
    await settle(tester);
    expect(store.progress.bed(7).stars, 1);
  });
}
