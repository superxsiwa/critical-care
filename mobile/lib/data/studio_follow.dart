import 'package:clock/clock.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../game/case_import.dart';
import 'progress_store.dart';
import 'providers.dart';
import 'studio_feed.dart';

/// What the last check of the studio found.
enum StudioCheck {
  /// The ward took a newer published set.
  updated,

  /// The ward already plays the newest set.
  upToDate,

  /// The studio has published nothing yet: the ward keeps its cases.
  nothingPublished,

  /// The studio did not answer (no network, or it is down): the ward keeps its cases.
  unreachable,

  /// The published set does not pass this app's check (made for a newer app, say): kept out.
  refused,
}

/// The ward's link to the studio and the last check's result (this run of the app only).
class StudioStatus {
  const StudioStatus(this.link, {this.last, this.published, this.checking = false});

  final StudioLink link;
  final StudioCheck? last;

  /// What the studio said it has, at the last check that reached it.
  final PublishedInfo? published;
  final bool checking;
}

/// Follows the Case Studio's published cases (step 10): when the ward follows it, a check takes
/// the newest published set if it is newer than the one the ward plays and passes the app's own
/// check of a case file, exactly as a file import would. Offline, or with the studio down, the ward
/// keeps its cases and the game plays on.
class StudioNotifier extends AsyncNotifier<StudioStatus> {
  bool _checkedAtStart = false;

  @override
  Future<StudioStatus> build() async =>
      StudioStatus(await ref.watch(progressStoreProvider).loadStudio());

  ProgressStore get _store => ref.read(progressStoreProvider);

  /// The check when the app opens, once per run; null when the ward does not follow the studio.
  Future<StudioCheck?> checkAtStart() async {
    if (_checkedAtStart) return null;
    _checkedAtStart = true;
    return check();
  }

  /// Asks the studio now; null when the ward does not follow it.
  Future<StudioCheck?> check() async {
    final status = await future;
    if (!status.link.follow || status.checking) return null;
    state = AsyncData(
      StudioStatus(status.link, last: status.last, published: status.published, checking: true),
    );
    final PublishedInfo? info;
    try {
      info = await ref.read(studioFeedProvider).latest();
    } on StudioUnreachable {
      return _done(status.link, StudioCheck.unreachable, status.published);
    }
    var link = status.link.copyWith(checkedAt: () => clock.now());
    if (info == null) return _done(link, StudioCheck.nothingPublished, null);
    if (info.revision == link.revision) return _done(link, StudioCheck.upToDate, info);
    final String text;
    try {
      text = await ref.read(studioFeedProvider).package(info);
    } on StudioUnreachable {
      return _done(status.link, StudioCheck.unreachable, status.published);
    }
    // The ward's own first load must be done before its cases are swapped: on the web the
    // database opens slowly, and a load that finished later would put the old cases back.
    await ref.read(caseSetProvider.future);
    final cases = ref.read(caseSetProvider.notifier);
    switch (await cases.read(text)) {
      case CasesRejected():
        return _done(link, StudioCheck.refused, info);
      case final CasesRead read:
        final revision = info.revision;
        await cases.use(read, studioRevision: revision);
        link = link.copyWith(revision: () => revision);
        return _done(link, StudioCheck.updated, info);
    }
  }

  Future<StudioCheck> _done(StudioLink link, StudioCheck last, PublishedInfo? published) async {
    await _store.saveStudio(link);
    state = AsyncData(StudioStatus(link, last: last, published: published));
    return last;
  }

  /// The switch รับเคสจากสตูดิโอ: on checks at once; off keeps the cases the ward has.
  Future<StudioCheck?> setFollow(bool follow) async {
    final status = await future;
    final link = status.link.copyWith(follow: follow);
    await _store.saveStudio(link);
    state = AsyncData(StudioStatus(link));
    return follow ? check() : null;
  }

  /// The ward took a file, or the shipped cases: they are no longer the studio's.
  Future<void> stopFollowing() async {
    final status = await future;
    final link = status.link.copyWith(follow: false, revision: () => null);
    await _store.saveStudio(link);
    state = AsyncData(StudioStatus(link));
  }
}

final studioProvider = AsyncNotifierProvider<StudioNotifier, StudioStatus>(StudioNotifier.new);
