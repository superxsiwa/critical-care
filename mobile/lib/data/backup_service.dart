import 'package:clock/clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../game/backup.dart';
import 'case_repository.dart';
import 'progress_store.dart';
import 'providers.dart';

/// The app's version for the backup file (`1.0.0+5`); null when the platform cannot say.
final appVersionProvider = FutureProvider<String?>((ref) async {
  try {
    final info = await PackageInfo.fromPlatform();
    return '${info.version}+${info.buildNumber}';
  } on Exception {
    return null;
  }
});

/// The backup file (#19): written from what the app shows, read with every check, restored whole.
class BackupService {
  BackupService(this._ref);

  final Ref _ref;

  /// Everything the player has, as a backup file's text.
  Future<String> exportText() async {
    final settings = await _ref.read(settingsProvider.future);
    return writeBackup(
      PlayerData(
        progress: await _ref.read(progressProvider.future),
        roster: await _ref.read(rosterProvider.future),
        // The cases the ward plays: an imported file that no longer passes is not carried.
        importedCases: (await _ref.read(caseSetProvider.future)).json,
        sound: settings.sound,
        haptics: settings.haptics,
      ),
      createdAt: clock.now(),
      appVersion: await _ref.read(appVersionProvider.future),
    );
  }

  /// Reads a chosen file; nothing changes until [restore] is called with the result.
  Future<BackupRead> read(String text) async {
    final assets = await _ref.read(equipmentAssetsProvider.future);
    return readBackup(text, imageExists: (img) => assets.contains(equipmentAsset(img)));
  }

  /// Replaces the player's data with the backup's. Any duty ends (its day may be gone).
  Future<void> restore(PlayerData data) async {
    _ref.read(dutyProvider.notifier).end();
    _ref.read(progressProvider.notifier).show(data.progress);
    try {
      await _ref.read(progressStoreProvider).restore(data);
    } finally {
      _ref
        ..invalidate(progressProvider)
        ..invalidate(rosterProvider)
        ..invalidate(caseSetProvider)
        ..invalidate(settingsProvider);
    }
  }
}

final backupProvider = Provider((ref) => BackupService(ref));
