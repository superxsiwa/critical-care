import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../game/backup.dart';
import '../game/case_session.dart';
import '../game/progress.dart';
import '../game/roster.dart';
import 'db/game_database.dart';
import 'db_progress_store.dart';

/// The player's settings (his SettingsPage): both on by default.
class GameSettings {
  const GameSettings({this.sound = true, this.haptics = true});

  final bool sound;
  final bool haptics;

  GameSettings copyWith({bool? sound, bool? haptics}) =>
      GameSettings(sound: sound ?? this.sound, haptics: haptics ?? this.haptics);
}

/// Whether the ward follows the Case Studio's published cases (step 10), and which revision it
/// plays. Following is on by default; importing a file or going back to the shipped cases turns it
/// off.
class StudioLink {
  const StudioLink({this.follow = true, this.revision, this.checkedAt});

  final bool follow;

  /// The studio revision the ward plays now; null when its cases did not come from the studio.
  final int? revision;

  /// When the studio last answered a check.
  final DateTime? checkedAt;

  StudioLink copyWith({bool? follow, int? Function()? revision, DateTime? Function()? checkedAt}) =>
      StudioLink(
        follow: follow ?? this.follow,
        revision: revision == null ? this.revision : revision(),
        checkedAt: checkedAt == null ? this.checkedAt : checkedAt(),
      );
}

/// Where the player's data lives on the device: [DbProgressStore] (SQLite, #19) in the app, a
/// memory store in widget tests.
abstract interface class ProgressStore {
  Future<Progress> load();
  Future<void> save(Progress progress);

  /// Whether the player has seen the "for training only" notice.
  Future<bool> noticeSeen();
  Future<void> markNoticeSeen();

  Future<GameSettings> loadSettings();
  Future<void> saveSettings(GameSettings settings);

  Future<Roster> loadRoster();
  Future<void> saveRoster(Roster roster);

  /// The imported case file, as JSON text; null when the ward plays the shipped cases.
  Future<String?> loadImportedCases();
  Future<void> saveImportedCases(String? json);

  Future<StudioLink> loadStudio();
  Future<void> saveStudio(StudioLink link);

  /// A backup replaces progress, roster, imported cases and settings; the first three all or
  /// nothing. The studio revision is forgotten (the restored cases may be another's), so a ward
  /// that follows the studio takes the newest set again at its next check.
  Future<void> restore(PlayerData data);
}

final progressStoreProvider = Provider<ProgressStore>((ref) {
  final db = GameDatabase.open();
  ref.onDispose(db.close);
  return DbProgressStore(db);
});

class ProgressNotifier extends AsyncNotifier<Progress> {
  @override
  Future<Progress> build() => ref.watch(progressStoreProvider).load();

  /// Saves a finished case and says what it changed; a level up is judged on the ward's beds
  /// [ward].
  Future<RecordOutcome> record(CaseResult result, {Iterable<int>? ward}) async {
    if (state.value == null) await future;
    final current = state.value ?? Progress.empty;
    final outcome = current.record(result, ward: ward);
    state = AsyncData(outcome.progress);
    await ref.read(progressStoreProvider).save(outcome.progress);
    return outcome;
  }

  /// Adds play time (the play clock calls it every few seconds).
  Future<void> addPlayTime(int seconds) async {
    if (state.value == null) await future;
    final current = state.value ?? Progress.empty;
    final next = current.played(seconds);
    state = AsyncData(next);
    await ref.read(progressStoreProvider).save(next);
  }

  /// A restored backup, shown at once and before it is written, so a play-clock tick saves on
  /// top of it rather than putting the old progress back.
  void show(Progress progress) => state = AsyncData(progress);

  /// "Reset progress" in settings: every bed and counter back to zero.
  Future<void> reset() async {
    state = const AsyncData(Progress.empty);
    await ref.read(progressStoreProvider).save(Progress.empty);
  }
}

final progressProvider = AsyncNotifierProvider<ProgressNotifier, Progress>(ProgressNotifier.new);

class SettingsNotifier extends AsyncNotifier<GameSettings> {
  @override
  Future<GameSettings> build() => ref.watch(progressStoreProvider).loadSettings();

  Future<void> set(GameSettings settings) async {
    state = AsyncData(settings);
    await ref.read(progressStoreProvider).saveSettings(settings);
  }
}

final settingsProvider = AsyncNotifierProvider<SettingsNotifier, GameSettings>(
  SettingsNotifier.new,
);

/// Draws the roster's shifts; tests override it with a seeded one.
final randomProvider = Provider<Random>((ref) => Random());

class RosterNotifier extends AsyncNotifier<Roster> {
  @override
  Future<Roster> build() => ref.watch(progressStoreProvider).loadRoster();

  /// Waits for the saved roster. Each method reads `state` only AFTER this await, so two calls in
  /// a row (two screens asking for the same month) never both draw a schedule.
  Future<void> _loaded() async {
    if (state.value == null) await future;
  }

  Future<void> _save(Roster roster) async {
    state = AsyncData(roster);
    await ref.read(progressStoreProvider).saveRoster(roster);
  }

  /// Gives [month] its random schedule the first time it is shown.
  Future<void> ensure(RosterMonth month) async {
    await _loaded();
    final roster = state.value ?? Roster.empty;
    if (!roster.has(month)) await _save(roster.roll(month, ref.read(randomProvider)));
  }

  /// "🎲 สุ่มเวรใหม่": new shifts from the playable day on. Ends a duty in that month.
  Future<void> reroll(RosterMonth month) async {
    await _loaded();
    if (ref.read(dutyProvider)?.month == month) ref.read(dutyProvider.notifier).end();
    await _save((state.value ?? Roster.empty).roll(month, ref.read(randomProvider)));
  }

  /// Counts a finished bed towards the current duty; true when it cleared the day, which ends
  /// the duty.
  Future<bool> recordBed(int bedNum, List<int> bedNums) async {
    final duty = ref.read(dutyProvider);
    if (duty == null) return false;
    await _loaded();
    final roster = state.value ?? Roster.empty;
    final r = roster.recordBed(duty, bedNum, bedNums);
    if (identical(r.roster, roster)) return false;
    await _save(r.roster);
    if (r.cleared) ref.read(dutyProvider.notifier).end();
    return r.cleared;
  }

  /// "Reset progress": every day unplayed again, the schedules kept.
  Future<void> reset() async {
    ref.read(dutyProvider.notifier).end();
    await _loaded();
    await _save((state.value ?? Roster.empty).withoutProgress());
  }
}

final rosterProvider = AsyncNotifierProvider<RosterNotifier, Roster>(RosterNotifier.new);

/// The roster day the player is on duty for, if any (kept in memory, like his ward filter).
class DutyNotifier extends Notifier<Duty?> {
  @override
  Duty? build() => null;

  void start(Duty duty) => state = duty;
  void end() => state = null;
}

final dutyProvider = NotifierProvider<DutyNotifier, Duty?>(DutyNotifier.new);
