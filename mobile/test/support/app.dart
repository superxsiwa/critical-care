import 'dart:math';

import 'package:criticalcare/app/app.dart';
import 'package:criticalcare/app/sfx.dart';
import 'package:criticalcare/data/progress_store.dart';
import 'package:criticalcare/data/providers.dart';
import 'package:criticalcare/data/studio_feed.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'cases.dart';
import 'fake_store.dart';
import 'feed.dart';

/// The whole app with the 8 bundled cases, storage in memory, no sound and seeded roster draws,
/// on a phone-sized screen unless [size] says otherwise. It opens on the roster, like the app. The
/// Case Studio is [feed] (by default one that has published nothing): never the network.
Future<void> pumpApp(
  WidgetTester tester, {
  required MemoryProgressStore store,
  required SilentSfx sfx,
  Size size = const Size(1080, 2400),
  double pixelRatio = 2.625,
  int seed = 1,
  List<Override> overrides = const [],
  StudioFeed? feed,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = pixelRatio;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        bundledCasesProvider.overrideWith((ref) async => [for (var n = 1; n <= 8; n++) bed(n)]),
        progressStoreProvider.overrideWithValue(store),
        sfxProvider.overrideWithValue(sfx),
        randomProvider.overrideWithValue(Random(seed)),
        studioFeedProvider.overrideWithValue(feed ?? FakeStudioFeed()),
        ...overrides,
      ],
      child: const CriticalCareApp(),
    ),
  );
  await settle(tester);
}

/// Taps a tab in the bottom bar (ตารางเวร, วอร์ด, ตั้งค่า).
Future<void> openTab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
  await settle(tester);
}

/// Lets animations and async work move on; never pumpAndSettle (the ECG and pulses never stop).
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// Taps [text], scrolling a lazy list (the settings page) down to it first when it is not built yet.
Future<void> tapText(WidgetTester tester, String text) async {
  if (find.text(text).evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      find.text(text),
      300,
      scrollable: find.byType(Scrollable).first,
    );
  }
  final f = find.text(text).last;
  await tester.ensureVisible(f);
  await tester.pump();
  await tester.tap(f);
  await tester.pump();
}
