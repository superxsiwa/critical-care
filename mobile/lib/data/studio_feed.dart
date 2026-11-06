import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

/// The Case Studio the app follows (step 10): built in, `--dart-define=STUDIO_URL=...` to point a
/// build at another one (a local studio in a test, say).
const studioUrl = String.fromEnvironment(
  'STUDIO_URL',
  defaultValue: 'https://studio.criticalcare.212cafe.com',
);

/// The newest case set the studio published: its revision, when, how many cases, and the path of
/// its file (`/api/published/{revision}`).
class PublishedInfo {
  const PublishedInfo({
    required this.revision,
    required this.publishedAt,
    required this.cases,
    required this.package,
  });

  final int revision;
  final DateTime? publishedAt;
  final int cases;
  final String package;
}

/// The studio could not be asked: no network, the studio down, or an answer the app cannot read.
class StudioUnreachable implements Exception {
  const StudioUnreachable(this.why);

  final String why;

  @override
  String toString() => 'StudioUnreachable: $why';
}

/// The studio's public feed. It sends nothing about the player: one plain GET for what is
/// published, and one for its file when it is new to the phone.
abstract interface class StudioFeed {
  /// The newest published case set; null when the studio has published nothing yet. Throws
  /// [StudioUnreachable].
  Future<PublishedInfo?> latest();

  /// The package file of [info], as text. Throws [StudioUnreachable].
  Future<String> package(PublishedInfo info);
}

class HttpStudioFeed implements StudioFeed {
  HttpStudioFeed(this._client, this._base);

  final http.Client _client;
  final Uri _base;

  static const _timeout = Duration(seconds: 15);

  Future<http.Response> _get(String path) async {
    try {
      return await _client.get(_base.resolve(path)).timeout(_timeout);
    } on Exception catch (e) {
      throw StudioUnreachable('$e');
    }
  }

  @override
  Future<PublishedInfo?> latest() async {
    final res = await _get('/api/published');
    if (res.statusCode == 404) return null;
    if (res.statusCode != 200) throw StudioUnreachable('status ${res.statusCode}');
    try {
      final j = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, Object?>;
      return PublishedInfo(
        revision: j['revision']! as int,
        publishedAt: DateTime.tryParse('${j['publishedAt']}'),
        cases: j['cases']! as int,
        package: j['package']! as String,
      );
    } on Object catch (e) {
      throw StudioUnreachable('unreadable answer: $e');
    }
  }

  @override
  Future<String> package(PublishedInfo info) async {
    final res = await _get(info.package);
    if (res.statusCode != 200) throw StudioUnreachable('status ${res.statusCode}');
    return utf8.decode(res.bodyBytes);
  }
}

final studioFeedProvider = Provider<StudioFeed>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return HttpStudioFeed(client, Uri.parse(studioUrl));
});
