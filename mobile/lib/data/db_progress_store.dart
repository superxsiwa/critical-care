import 'package:clock/clock.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../game/backup.dart';
import '../game/case_import.dart';
import '../game/progress.dart';
import '../game/roster.dart';
import 'db/game_database.dart';
import 'legacy_prefs.dart';
import 'progress_store.dart';

/// Progress, the roster and the imported cases in SQLite ([GameDatabase]); the small settings
/// (sound, vibration, the notice flag) stay in SharedPreferences, as #19 allows. The first use
/// moves the data of older builds out of SharedPreferences ([moveLegacyPrefs]).
class DbProgressStore implements ProgressStore {
  DbProgressStore(this._db, [SharedPreferencesAsync? prefs])
    : _prefs = prefs ?? SharedPreferencesAsync();

  final GameDatabase _db;
  final SharedPreferencesAsync _prefs;
  late final Future<void> _ready = moveLegacyPrefs(_db, _prefs);

  static const _noticeKey = 'notice.seen';
  static const _soundKey = 'settings.sound';
  static const _hapticsKey = 'settings.haptics';
  static const _followKey = 'studio.follow';
  static const _revisionKey = 'studio.revision';
  static const _checkedKey = 'studio.checkedAt';

  Future<GameDatabase> get _open async {
    await _ready;
    return _db;
  }

  @override
  Future<Progress> load() async => (await _open).readProgress();

  @override
  Future<void> save(Progress progress) async => (await _open).writeProgress(progress);

  @override
  Future<Roster> loadRoster() async => (await _open).readRoster();

  @override
  Future<void> saveRoster(Roster roster) async => (await _open).writeRoster(roster);

  @override
  Future<String?> loadImportedCases() async => (await _open).readImportedCases();

  @override
  Future<void> saveImportedCases(String? json) async =>
      (await _open).writeImportedCases(json, savedAt: clock.now());

  @override
  Future<void> restore(PlayerData data) async {
    final db = await _open;
    final cases = data.importedCases;
    await db.transaction(() async {
      await db.writeProgress(data.progress);
      await db.writeRoster(data.roster);
      await db.writeImportedCases(
        cases == null ? null : writeCaseFile(cases),
        savedAt: clock.now(),
      );
    });
    await saveSettings(GameSettings(sound: data.sound, haptics: data.haptics));
    await _prefs.remove(_revisionKey);
  }

  @override
  Future<StudioLink> loadStudio() async {
    final checked = await _prefs.getString(_checkedKey);
    return StudioLink(
      follow: await _prefs.getBool(_followKey) ?? true,
      revision: await _prefs.getInt(_revisionKey),
      checkedAt: checked == null ? null : DateTime.tryParse(checked),
    );
  }

  @override
  Future<void> saveStudio(StudioLink link) async {
    await _prefs.setBool(_followKey, link.follow);
    final revision = link.revision;
    revision == null
        ? await _prefs.remove(_revisionKey)
        : await _prefs.setInt(_revisionKey, revision);
    final checked = link.checkedAt;
    checked == null
        ? await _prefs.remove(_checkedKey)
        : await _prefs.setString(_checkedKey, checked.toUtc().toIso8601String());
  }

  @override
  Future<bool> noticeSeen() async => await _prefs.getBool(_noticeKey) ?? false;

  @override
  Future<void> markNoticeSeen() => _prefs.setBool(_noticeKey, true);

  @override
  Future<GameSettings> loadSettings() async => GameSettings(
    sound: await _prefs.getBool(_soundKey) ?? true,
    haptics: await _prefs.getBool(_hapticsKey) ?? true,
  );

  @override
  Future<void> saveSettings(GameSettings settings) async {
    await _prefs.setBool(_soundKey, settings.sound);
    await _prefs.setBool(_hapticsKey, settings.haptics);
  }
}
