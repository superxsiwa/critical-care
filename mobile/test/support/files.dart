import 'dart:io';

import 'package:criticalcare/data/case_files.dart';
import 'package:flutter/services.dart';

/// The system's open and save dialogs, scripted.
class FakeCaseFiles implements CaseFiles {
  FakeCaseFiles([this.toPick]);

  String? toPick;
  final saved = <String, String>{};

  @override
  Future<String?> pick() async => toPick;

  @override
  Future<bool> save(String name, String text) async {
    saved[name] = text;
    return true;
  }
}

/// Assets read straight from disk (the test's rootBundle loads them asynchronously, which a
/// widget test's fake clock never lets finish).
class DiskBundle extends CachingAssetBundle {
  @override
  Future<ByteData> load(String key) async => ByteData.sublistView(File(key).readAsBytesSync());
}
