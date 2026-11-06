import 'dart:convert';
import 'dart:io';

import 'package:criticalcare/data/studio_feed.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  final base = Uri.parse('https://studio.example');
  final requests = <http.BaseRequest>[];

  HttpStudioFeed feed(Future<http.Response> Function(http.Request) answer) {
    requests.clear();
    return HttpStudioFeed(
      MockClient((r) {
        requests.add(r);
        return answer(r);
      }),
      base,
    );
  }

  http.Response json(Object body, [int status = 200]) => http.Response.bytes(
    utf8.encode(jsonEncode(body)),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );

  test('the newest revision, then its file, with plain GETs that carry nothing', () async {
    final f = feed(
      (r) async => switch (r.url.path) {
        '/api/published' => json({
          'revision': 3,
          'publishedAt': '2026-11-06T10:00:00Z',
          'cases': 8,
          'package': '/api/published/3',
        }),
        '/api/published/3' => json({'format': 'critical-care-cases', 'revision': 3, 'cases': []}),
        _ => http.Response('', 404),
      },
    );
    final info = (await f.latest())!;
    expect(info.revision, 3);
    expect(info.cases, 8);
    expect(info.publishedAt, DateTime.utc(2026, 11, 6, 10));
    final text = await f.package(info);
    expect(jsonDecode(text), containsPair('revision', 3));
    expect(requests.map((r) => '${r.method} ${r.url}'), [
      'GET https://studio.example/api/published',
      'GET https://studio.example/api/published/3',
    ]);
    // Nothing about the player: no cookie, no body, no header of ours.
    for (final r in requests) {
      expect(r.headers.keys.where((k) => k.toLowerCase() != 'content-type'), isEmpty);
      expect((r as http.Request).body, isEmpty);
    }
  });

  test('nothing published yet is null', () async {
    final f = feed((r) async => json({'detail': 'Nothing is published yet', 'code': 'none'}, 404));
    expect(await f.latest(), isNull);
  });

  test('no network, a studio error or an answer it cannot read: unreachable', () async {
    for (final answer in <Future<http.Response> Function(http.Request)>[
      (r) async => throw const SocketException('no network'),
      (r) async => http.Response('', 502),
      (r) async => http.Response('<html>', 200),
      (r) async => json({'revision': 'three'}),
    ]) {
      await expectLater(feed(answer).latest(), throwsA(isA<StudioUnreachable>()));
    }
    final info = PublishedInfo(
      revision: 1,
      publishedAt: null,
      cases: 1,
      package: '/api/published/1',
    );
    await expectLater(
      feed((r) async => http.Response('', 404)).package(info),
      throwsA(isA<StudioUnreachable>()),
    );
  });
}
