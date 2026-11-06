import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../game/case_import.dart';
import '../game/case_model.dart';
import '../game/progress.dart';
import 'case_repository.dart';
import 'progress_store.dart';
import 'studio_follow.dart';

final caseRepositoryProvider = Provider((ref) => CaseRepository(rootBundle));

/// The 8 cases shipped in the app, beds 1 to 8.
final bundledCasesProvider = FutureProvider<List<BedCase>>(
  (ref) => ref.watch(caseRepositoryProvider).loadBundled(),
);

/// The equipment pictures shipped in the app (asset paths), to check an imported file against.
final equipmentAssetsProvider = FutureProvider<Set<String>>((ref) async {
  final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
  return {
    for (final a in manifest.listAssets())
      if (a.startsWith('assets/equipment/')) a,
  };
});

/// The cases in the ward: an imported file's, else the ones shipped in the app.
class CaseSet {
  const CaseSet(this.cases, {this.json});

  final List<BedCase> cases;

  /// The imported file's cases as kept and exported; null for the shipped cases.
  final List<Map<String, Object?>>? json;

  bool get imported => json != null;
}

class CasesNotifier extends AsyncNotifier<CaseSet> {
  @override
  Future<CaseSet> build() async {
    final text = await ref.watch(progressStoreProvider).loadImportedCases();
    if (text != null) {
      // A file that no longer passes (a newer app checks more) falls back to the shipped cases.
      if (readCaseFile(text, imageExists: await _imageExists()) case CasesRead(
        :final cases,
        :final json,
      )) {
        return CaseSet(cases, json: json);
      }
    }
    return CaseSet(await ref.watch(bundledCasesProvider.future));
  }

  Future<bool Function(String img)> _imageExists() async {
    final assets = await ref.read(equipmentAssetsProvider.future);
    return (img) => assets.contains(equipmentAsset(img));
  }

  /// Reads a chosen file; nothing changes until [use] is called with the result.
  Future<CaseImport> read(String text) async =>
      readCaseFile(text, imageExists: await _imageExists());

  /// The ward takes the file's cases (his import: they replace all of them). Progress stays,
  /// by bed number, like his; a duty ends, its beds may have changed. A file the player picked
  /// ([studioRevision] null) stops following the studio; the studio's own set keeps it.
  Future<void> use(CasesRead read, {int? studioRevision}) async {
    await ref.read(progressStoreProvider).saveImportedCases(writeCaseFile(read.json));
    if (studioRevision == null) await ref.read(studioProvider.notifier).stopFollowing();
    ref.read(dutyProvider.notifier).end();
    state = AsyncData(CaseSet(read.cases, json: read.json));
  }

  /// "🔄 คืนค่าเคสตั้งต้น": back to the cases shipped in the app, no longer the studio's.
  Future<void> useBundled() async {
    await ref.read(progressStoreProvider).saveImportedCases(null);
    await ref.read(studioProvider.notifier).stopFollowing();
    ref.read(dutyProvider.notifier).end();
    state = AsyncData(CaseSet(await ref.read(bundledCasesProvider.future)));
  }

  /// The ward's cases as his export writes them.
  Future<String> exportText() async {
    if (state.value == null) await future;
    final json = state.value?.json ?? await ref.read(caseRepositoryProvider).loadBundledJson();
    return writeCaseFile(json);
  }
}

final caseSetProvider = AsyncNotifierProvider<CasesNotifier, CaseSet>(CasesNotifier.new);

/// The ward's cases, in bed order.
final casesProvider = Provider<AsyncValue<List<BedCase>>>(
  (ref) => ref.watch(caseSetProvider).whenData((s) => s.cases),
);

/// The player's progress over the ward's beds: stars, beds passed and the level count only the
/// cases in the ward, like his (the counters are the player's, whatever the cases).
final wardProgressProvider = Provider<Progress>((ref) {
  final progress = ref.watch(progressProvider).value ?? Progress.empty;
  final cases = ref.watch(casesProvider).value;
  return cases == null ? progress : progress.within([for (final c in cases) c.bedNum]);
});
