import 'dart:convert';

import 'package:criticalcare/data/progress_store.dart';
import 'package:criticalcare/game/backup.dart';
import 'package:criticalcare/game/progress.dart';
import 'package:criticalcare/game/roster.dart';

/// Progress kept in memory, for widget tests (no platform channel).
class MemoryProgressStore implements ProgressStore {
  MemoryProgressStore({
    this.progress = Progress.empty,
    this.seen = true,
    this.roster = Roster.empty,
    this.importedCases,
  });

  Progress progress;
  bool seen;
  Roster roster;
  String? importedCases;
  int saves = 0;

  @override
  Future<Progress> load() async => progress;

  @override
  Future<void> save(Progress p) async {
    progress = p;
    saves++;
  }

  @override
  Future<bool> noticeSeen() async => seen;

  @override
  Future<void> markNoticeSeen() async => seen = true;

  GameSettings settings = const GameSettings();

  @override
  Future<GameSettings> loadSettings() async => settings;

  @override
  Future<void> saveSettings(GameSettings s) async => settings = s;

  @override
  Future<Roster> loadRoster() async => roster;

  @override
  Future<void> saveRoster(Roster r) async => roster = r;

  @override
  Future<String?> loadImportedCases() async => importedCases;

  @override
  Future<void> saveImportedCases(String? json) async => importedCases = json;

  @override
  Future<void> restore(PlayerData data) async {
    progress = data.progress;
    roster = data.roster;
    final cases = data.importedCases;
    importedCases = cases == null ? null : jsonEncode(cases);
    settings = GameSettings(sound: data.sound, haptics: data.haptics);
  }
}
