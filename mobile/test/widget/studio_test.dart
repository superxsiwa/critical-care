import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/app/sfx.dart';
import 'package:criticalcare/data/case_files.dart';
import 'package:criticalcare/data/case_repository.dart';
import 'package:criticalcare/data/progress_store.dart';
import 'package:criticalcare/data/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/app.dart';
import '../support/cases.dart';
import '../support/fake_store.dart';
import '../support/feed.dart';
import '../support/files.dart';

/// A package as the studio publishes it: version 1 with its revision.
String published(int revision, List<Map<String, Object?>> cases) => jsonEncode({
  'format': 'critical-care-cases',
  'version': 1,
  'revision': revision,
  'publishedAt': '2026-11-06T10:00:00Z',
  'cases': cases,
});

void main() {
  late MemoryProgressStore store;
  late FakeStudioFeed feed;
  late FakeCaseFiles files;

  setUp(() {
    store = MemoryProgressStore();
    feed = FakeStudioFeed();
    files = FakeCaseFiles();
  });

  /// The app as it opens, with this test's store, studio and files.
  Future<void> open(WidgetTester tester) => pumpApp(
    tester,
    store: store,
    sfx: SilentSfx(),
    feed: feed,
    overrides: [
      caseFilesProvider.overrideWithValue(files),
      caseRepositoryProvider.overrideWithValue(CaseRepository(DiskBundle())),
      equipmentAssetsProvider.overrideWith(
        (ref) async => {for (final f in Directory('assets/equipment').listSync()) f.path},
      ),
    ],
  );

  testWidgets('as it opens, the app takes the set the studio published', (tester) async {
    feed.publish(published(1, [bedJson(2), bedJson(1)]), cases: 2);
    await open(tester);
    expect(find.text('อัปเดตเคสจากสตูดิโอแล้ว: ฉบับที่ 1 (2 เคส)'), findsOneWidget);
    expect(jsonDecode(store.importedCases!), hasLength(2));
    expect(store.studio.revision, 1);
    expect(store.studio.checkedAt, isNotNull);

    await openTab(tester, 'วอร์ด');
    expect(find.text('วอร์ดหัวใจ 2 เตียง'), findsOneWidget);
    await openTab(tester, 'ตั้งค่า');
    expect(find.text('ใช้เคสจากสตูดิโอ 2 เคส'), findsOneWidget);
    expect(find.textContaining('ใช้ชุดเคสฉบับที่ 1 จากสตูดิโอ'), findsOneWidget);
  });

  testWidgets('a slow first load of the ward does not undo the studio set (the web\'s SQLite)', (
    tester,
  ) async {
    store = MemoryProgressStore(casesDelay: const Duration(milliseconds: 300));
    feed.publish(published(1, [bedJson(2), bedJson(1)]), cases: 2);
    await open(tester);
    await settle(tester);
    expect(store.studio.revision, 1);
    await openTab(tester, 'วอร์ด');
    expect(find.text('วอร์ดหัวใจ 2 เตียง'), findsOneWidget);
  });

  testWidgets('the same revision again is not downloaded', (tester) async {
    feed.publish(published(1, [bedJson(1)]), cases: 1);
    store
      ..importedCases = jsonEncode([bedJson(1)])
      ..studio = const StudioLink(revision: 1);
    await open(tester);
    expect(feed.latestCalls, 1);
    expect(feed.packageCalls, 0);
    expect(find.textContaining('อัปเดตเคสจากสตูดิโอ'), findsNothing);
  });

  testWidgets(
    'offline, or nothing published: the ward keeps its cases and the app says so only when asked',
    (tester) async {
      feed.offline = true;
      await open(tester);
      expect(store.importedCases, isNull);
      expect(find.byType(SnackBar), findsNothing);
      await openTab(tester, 'ตั้งค่า');
      await tapText(tester, '🔄 ตรวจหาเคสใหม่');
      await settle(tester);
      expect(find.text('ติดต่อสตูดิโอไม่ได้: ใช้เคสชุดเดิม'), findsWidgets);

      feed.offline = false;
      await tapText(tester, '🔄 ตรวจหาเคสใหม่');
      await settle(tester);
      expect(find.text('สตูดิโอยังไม่ได้ประกาศใช้เคส: ใช้เคสชุดเดิม'), findsWidgets);
      expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
    },
  );

  testWidgets('a set this app would refuse is kept out', (tester) async {
    final bad = copyJson(bedJson(1));
    (bad['stageData'] as List).removeLast();
    feed.publish(published(1, [bad]), cases: 1);
    await open(tester);
    expect(store.importedCases, isNull);
    expect(store.studio.revision, isNull);
    await openTab(tester, 'ตั้งค่า');
    expect(find.textContaining('ชุดเคสฉบับที่ 1 ในสตูดิโอเปิดในแอปนี้ไม่ได้'), findsOneWidget);
    expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
  });

  testWidgets('check now takes a newer revision', (tester) async {
    feed.publish(published(1, [bedJson(1)]), cases: 1);
    await open(tester);
    expect(store.studio.revision, 1);
    feed.publish(published(2, [bedJson(1), bedJson(2), bedJson(3)]), cases: 3);
    await openTab(tester, 'ตั้งค่า');
    await tapText(tester, '🔄 ตรวจหาเคสใหม่');
    await settle(tester);
    expect(find.text('อัปเดตเคสจากสตูดิโอแล้ว: ฉบับที่ 2 (3 เคส)'), findsOneWidget);
    expect(store.studio.revision, 2);
    expect(find.text('ใช้เคสจากสตูดิโอ 3 เคส'), findsOneWidget);
    await tapText(tester, '🔄 ตรวจหาเคสใหม่');
    await settle(tester);
    expect(find.text('เป็นชุดเคสล่าสุดแล้ว (ฉบับที่ 2)'), findsOneWidget);
  });

  testWidgets('a file import stops following; switching it on takes the studio set again', (
    tester,
  ) async {
    feed.publish(published(1, [bedJson(1)]), cases: 1);
    await open(tester);
    await openTab(tester, 'ตั้งค่า');
    files.toPick = jsonEncode([bedJson(4), bedJson(5)]);
    await tapText(tester, '📥 นำเข้าไฟล์ JSON');
    await settle(tester);
    expect(find.textContaining('และจะหยุดรับเคสจากสตูดิโอ'), findsOneWidget);
    await tapText(tester, 'นำเข้า');
    await settle(tester);
    expect(store.studio.follow, isFalse);
    expect(store.studio.revision, isNull);
    expect(find.text('ใช้เคสที่นำเข้าจากไฟล์ 2 เคส'), findsOneWidget);

    // Not following: the next start asks the studio nothing.
    final asked = feed.latestCalls;
    await open(tester);
    expect(feed.latestCalls, asked);
    expect(jsonDecode(store.importedCases!), hasLength(2));

    await openTab(tester, 'ตั้งค่า');
    await tapText(tester, 'เคสจากสตูดิโอ');
    await settle(tester);
    expect(store.studio.follow, isTrue);
    expect(store.studio.revision, 1);
    expect(find.text('ใช้เคสจากสตูดิโอ 1 เคส'), findsOneWidget);
  });

  testWidgets('back to the shipped cases stops following too', (tester) async {
    feed.publish(published(1, [bedJson(1)]), cases: 1);
    await open(tester);
    await openTab(tester, 'ตั้งค่า');
    await tapText(tester, '🔄 คืนค่าเคสตั้งต้น');
    await settle(tester);
    expect(find.textContaining('และจะหยุดรับเคสจากสตูดิโอ'), findsOneWidget);
    await tapText(tester, 'คืนค่าเริ่มต้น');
    await settle(tester);
    expect(store.importedCases, isNull);
    expect(store.studio.follow, isFalse);
    expect(find.text('ใช้เคสมาตรฐาน CCU 8 เตียง'), findsOneWidget);
  });
}
