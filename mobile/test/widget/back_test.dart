import 'package:criticalcare/app/sfx.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:criticalcare/features/about/about_screen.dart';
import 'package:criticalcare/features/settings/settings_screen.dart';

import '../support/app.dart';
import '../support/fake_store.dart';

void main() {
  Future<void> pumpHome(WidgetTester tester) =>
      pumpApp(tester, store: MemoryProgressStore(), sfx: SilentSfx());

  const roster = 'ตารางเวรประจำเดือน';
  const ward = 'วอร์ดหัวใจ 8 เตียง';

  Future<void> back(WidgetTester tester, {bool handled = true}) async {
    final result = await tester.binding.handlePopRoute();
    await settle(tester);
    expect(result, handled, reason: handled ? 'the app must not close' : 'the app closes');
  }

  testWidgets('Android back from the ward or settings tab goes to the roster', (tester) async {
    await pumpHome(tester);
    for (final tab in ['วอร์ด', 'ตั้งค่า']) {
      await openTab(tester, tab);
      expect(find.text(roster), findsNothing);
      await back(tester);
      expect(find.text(roster), findsOneWidget);
    }
  });

  testWidgets('Android back on the roster leaves the app', (tester) async {
    await pumpHome(tester);
    await back(tester, handled: false);
  });

  testWidgets('Android back from case sheets returns to the ward', (tester) async {
    await pumpHome(tester);
    await openTab(tester, 'วอร์ด');
    await tapText(tester, '📖 ชีทเฉลยเคส');
    await settle(tester);
    expect(find.text(ward), findsNothing);
    await back(tester);
    expect(find.text(ward), findsOneWidget);
  });

  testWidgets('Android back from about returns to settings', (tester) async {
    await pumpHome(tester);
    await openTab(tester, 'ตั้งค่า');
    await tapText(tester, 'เกี่ยวกับ');
    await settle(tester);
    expect(find.byType(AboutScreen), findsOneWidget);
    await back(tester);
    expect(find.byType(AboutScreen), findsNothing);
    expect(find.byType(SettingsScreen), findsOneWidget);
  });
}
