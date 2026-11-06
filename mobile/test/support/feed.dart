import 'package:criticalcare/data/studio_feed.dart';

/// The Case Studio's feed in memory: what it has published ([info] and its file in [packages]),
/// or no network at all ([offline]). Counts the requests, so a test can see none were made.
class FakeStudioFeed implements StudioFeed {
  FakeStudioFeed({this.info, Map<int, String>? packages, this.offline = false})
    : packages = packages ?? {};

  PublishedInfo? info;
  final Map<int, String> packages;
  bool offline;
  int latestCalls = 0;
  int packageCalls = 0;

  /// Publishes [text] as the next revision, as the studio's ประกาศใช้ในแอป does.
  void publish(String text, {required int cases}) {
    final revision = (info?.revision ?? 0) + 1;
    packages[revision] = text;
    info = PublishedInfo(
      revision: revision,
      publishedAt: DateTime.utc(2026, 11, 6, 10),
      cases: cases,
      package: '/api/published/$revision',
    );
  }

  @override
  Future<PublishedInfo?> latest() async {
    latestCalls++;
    if (offline) throw const StudioUnreachable('offline');
    return info;
  }

  @override
  Future<String> package(PublishedInfo info) async {
    packageCalls++;
    if (offline) throw const StudioUnreachable('offline');
    return packages[info.revision]!;
  }
}
