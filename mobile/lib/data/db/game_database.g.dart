// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'game_database.dart';

// ignore_for_file: type=lint
class $BedRecordsTable extends BedRecords with TableInfo<$BedRecordsTable, BedRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $BedRecordsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _bedNumMeta = const VerificationMeta('bedNum');
  @override
  late final GeneratedColumn<int> bedNum = GeneratedColumn<int>(
    'bed_num',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _passedMeta = const VerificationMeta('passed');
  @override
  late final GeneratedColumn<bool> passed = GeneratedColumn<bool>(
    'passed',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways('CHECK ("passed" IN (0, 1))'),
  );
  static const VerificationMeta _starsMeta = const VerificationMeta('stars');
  @override
  late final GeneratedColumn<int> stars = GeneratedColumn<int>(
    'stars',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [bedNum, passed, stars];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'bed_records';
  @override
  VerificationContext validateIntegrity(Insertable<BedRow> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('bed_num')) {
      context.handle(_bedNumMeta, bedNum.isAcceptableOrUnknown(data['bed_num']!, _bedNumMeta));
    }
    if (data.containsKey('passed')) {
      context.handle(_passedMeta, passed.isAcceptableOrUnknown(data['passed']!, _passedMeta));
    } else if (isInserting) {
      context.missing(_passedMeta);
    }
    if (data.containsKey('stars')) {
      context.handle(_starsMeta, stars.isAcceptableOrUnknown(data['stars']!, _starsMeta));
    } else if (isInserting) {
      context.missing(_starsMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {bedNum};
  @override
  BedRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return BedRow(
      bedNum: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}bed_num'],
      )!,
      passed: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}passed'],
      )!,
      stars: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}stars'])!,
    );
  }

  @override
  $BedRecordsTable createAlias(String alias) {
    return $BedRecordsTable(attachedDatabase, alias);
  }
}

class BedRow extends DataClass implements Insertable<BedRow> {
  final int bedNum;
  final bool passed;
  final int stars;
  const BedRow({required this.bedNum, required this.passed, required this.stars});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['bed_num'] = Variable<int>(bedNum);
    map['passed'] = Variable<bool>(passed);
    map['stars'] = Variable<int>(stars);
    return map;
  }

  BedRecordsCompanion toCompanion(bool nullToAbsent) {
    return BedRecordsCompanion(bedNum: Value(bedNum), passed: Value(passed), stars: Value(stars));
  }

  factory BedRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return BedRow(
      bedNum: serializer.fromJson<int>(json['bedNum']),
      passed: serializer.fromJson<bool>(json['passed']),
      stars: serializer.fromJson<int>(json['stars']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'bedNum': serializer.toJson<int>(bedNum),
      'passed': serializer.toJson<bool>(passed),
      'stars': serializer.toJson<int>(stars),
    };
  }

  BedRow copyWith({int? bedNum, bool? passed, int? stars}) => BedRow(
    bedNum: bedNum ?? this.bedNum,
    passed: passed ?? this.passed,
    stars: stars ?? this.stars,
  );
  BedRow copyWithCompanion(BedRecordsCompanion data) {
    return BedRow(
      bedNum: data.bedNum.present ? data.bedNum.value : this.bedNum,
      passed: data.passed.present ? data.passed.value : this.passed,
      stars: data.stars.present ? data.stars.value : this.stars,
    );
  }

  @override
  String toString() {
    return (StringBuffer('BedRow(')
          ..write('bedNum: $bedNum, ')
          ..write('passed: $passed, ')
          ..write('stars: $stars')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(bedNum, passed, stars);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is BedRow &&
          other.bedNum == this.bedNum &&
          other.passed == this.passed &&
          other.stars == this.stars);
}

class BedRecordsCompanion extends UpdateCompanion<BedRow> {
  final Value<int> bedNum;
  final Value<bool> passed;
  final Value<int> stars;
  const BedRecordsCompanion({
    this.bedNum = const Value.absent(),
    this.passed = const Value.absent(),
    this.stars = const Value.absent(),
  });
  BedRecordsCompanion.insert({
    this.bedNum = const Value.absent(),
    required bool passed,
    required int stars,
  }) : passed = Value(passed),
       stars = Value(stars);
  static Insertable<BedRow> custom({
    Expression<int>? bedNum,
    Expression<bool>? passed,
    Expression<int>? stars,
  }) {
    return RawValuesInsertable({
      if (bedNum != null) 'bed_num': bedNum,
      if (passed != null) 'passed': passed,
      if (stars != null) 'stars': stars,
    });
  }

  BedRecordsCompanion copyWith({Value<int>? bedNum, Value<bool>? passed, Value<int>? stars}) {
    return BedRecordsCompanion(
      bedNum: bedNum ?? this.bedNum,
      passed: passed ?? this.passed,
      stars: stars ?? this.stars,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (bedNum.present) {
      map['bed_num'] = Variable<int>(bedNum.value);
    }
    if (passed.present) {
      map['passed'] = Variable<bool>(passed.value);
    }
    if (stars.present) {
      map['stars'] = Variable<int>(stars.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('BedRecordsCompanion(')
          ..write('bedNum: $bedNum, ')
          ..write('passed: $passed, ')
          ..write('stars: $stars')
          ..write(')'))
        .toString();
  }
}

class $PlayerStatsRowsTable extends PlayerStatsRows
    with TableInfo<$PlayerStatsRowsTable, StatsRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PlayerStatsRowsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _totalPlaySecondsMeta = const VerificationMeta('totalPlaySeconds');
  @override
  late final GeneratedColumn<int> totalPlaySeconds = GeneratedColumn<int>(
    'total_play_seconds',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _totalCompletedCasesMeta = const VerificationMeta(
    'totalCompletedCases',
  );
  @override
  late final GeneratedColumn<int> totalCompletedCases = GeneratedColumn<int>(
    'total_completed_cases',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _perfectCasesMeta = const VerificationMeta('perfectCases');
  @override
  late final GeneratedColumn<int> perfectCases = GeneratedColumn<int>(
    'perfect_cases',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _emergencyCasesDoneMeta = const VerificationMeta(
    'emergencyCasesDone',
  );
  @override
  late final GeneratedColumn<int> emergencyCasesDone = GeneratedColumn<int>(
    'emergency_cases_done',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _replayedCasesMeta = const VerificationMeta('replayedCases');
  @override
  late final GeneratedColumn<int> replayedCases = GeneratedColumn<int>(
    'replayed_cases',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _trayItemsSortedMeta = const VerificationMeta('trayItemsSorted');
  @override
  late final GeneratedColumn<int> trayItemsSorted = GeneratedColumn<int>(
    'tray_items_sorted',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _stepsWithoutMistakeMeta = const VerificationMeta(
    'stepsWithoutMistake',
  );
  @override
  late final GeneratedColumn<int> stepsWithoutMistake = GeneratedColumn<int>(
    'steps_without_mistake',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    totalPlaySeconds,
    totalCompletedCases,
    perfectCases,
    emergencyCasesDone,
    replayedCases,
    trayItemsSorted,
    stepsWithoutMistake,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'player_stats';
  @override
  VerificationContext validateIntegrity(Insertable<StatsRow> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('total_play_seconds')) {
      context.handle(
        _totalPlaySecondsMeta,
        totalPlaySeconds.isAcceptableOrUnknown(data['total_play_seconds']!, _totalPlaySecondsMeta),
      );
    } else if (isInserting) {
      context.missing(_totalPlaySecondsMeta);
    }
    if (data.containsKey('total_completed_cases')) {
      context.handle(
        _totalCompletedCasesMeta,
        totalCompletedCases.isAcceptableOrUnknown(
          data['total_completed_cases']!,
          _totalCompletedCasesMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_totalCompletedCasesMeta);
    }
    if (data.containsKey('perfect_cases')) {
      context.handle(
        _perfectCasesMeta,
        perfectCases.isAcceptableOrUnknown(data['perfect_cases']!, _perfectCasesMeta),
      );
    } else if (isInserting) {
      context.missing(_perfectCasesMeta);
    }
    if (data.containsKey('emergency_cases_done')) {
      context.handle(
        _emergencyCasesDoneMeta,
        emergencyCasesDone.isAcceptableOrUnknown(
          data['emergency_cases_done']!,
          _emergencyCasesDoneMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_emergencyCasesDoneMeta);
    }
    if (data.containsKey('replayed_cases')) {
      context.handle(
        _replayedCasesMeta,
        replayedCases.isAcceptableOrUnknown(data['replayed_cases']!, _replayedCasesMeta),
      );
    } else if (isInserting) {
      context.missing(_replayedCasesMeta);
    }
    if (data.containsKey('tray_items_sorted')) {
      context.handle(
        _trayItemsSortedMeta,
        trayItemsSorted.isAcceptableOrUnknown(data['tray_items_sorted']!, _trayItemsSortedMeta),
      );
    } else if (isInserting) {
      context.missing(_trayItemsSortedMeta);
    }
    if (data.containsKey('steps_without_mistake')) {
      context.handle(
        _stepsWithoutMistakeMeta,
        stepsWithoutMistake.isAcceptableOrUnknown(
          data['steps_without_mistake']!,
          _stepsWithoutMistakeMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_stepsWithoutMistakeMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  StatsRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return StatsRow(
      id: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      totalPlaySeconds: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_play_seconds'],
      )!,
      totalCompletedCases: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_completed_cases'],
      )!,
      perfectCases: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}perfect_cases'],
      )!,
      emergencyCasesDone: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}emergency_cases_done'],
      )!,
      replayedCases: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}replayed_cases'],
      )!,
      trayItemsSorted: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tray_items_sorted'],
      )!,
      stepsWithoutMistake: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}steps_without_mistake'],
      )!,
    );
  }

  @override
  $PlayerStatsRowsTable createAlias(String alias) {
    return $PlayerStatsRowsTable(attachedDatabase, alias);
  }
}

class StatsRow extends DataClass implements Insertable<StatsRow> {
  final int id;
  final int totalPlaySeconds;
  final int totalCompletedCases;
  final int perfectCases;
  final int emergencyCasesDone;
  final int replayedCases;
  final int trayItemsSorted;
  final int stepsWithoutMistake;
  const StatsRow({
    required this.id,
    required this.totalPlaySeconds,
    required this.totalCompletedCases,
    required this.perfectCases,
    required this.emergencyCasesDone,
    required this.replayedCases,
    required this.trayItemsSorted,
    required this.stepsWithoutMistake,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['total_play_seconds'] = Variable<int>(totalPlaySeconds);
    map['total_completed_cases'] = Variable<int>(totalCompletedCases);
    map['perfect_cases'] = Variable<int>(perfectCases);
    map['emergency_cases_done'] = Variable<int>(emergencyCasesDone);
    map['replayed_cases'] = Variable<int>(replayedCases);
    map['tray_items_sorted'] = Variable<int>(trayItemsSorted);
    map['steps_without_mistake'] = Variable<int>(stepsWithoutMistake);
    return map;
  }

  PlayerStatsRowsCompanion toCompanion(bool nullToAbsent) {
    return PlayerStatsRowsCompanion(
      id: Value(id),
      totalPlaySeconds: Value(totalPlaySeconds),
      totalCompletedCases: Value(totalCompletedCases),
      perfectCases: Value(perfectCases),
      emergencyCasesDone: Value(emergencyCasesDone),
      replayedCases: Value(replayedCases),
      trayItemsSorted: Value(trayItemsSorted),
      stepsWithoutMistake: Value(stepsWithoutMistake),
    );
  }

  factory StatsRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return StatsRow(
      id: serializer.fromJson<int>(json['id']),
      totalPlaySeconds: serializer.fromJson<int>(json['totalPlaySeconds']),
      totalCompletedCases: serializer.fromJson<int>(json['totalCompletedCases']),
      perfectCases: serializer.fromJson<int>(json['perfectCases']),
      emergencyCasesDone: serializer.fromJson<int>(json['emergencyCasesDone']),
      replayedCases: serializer.fromJson<int>(json['replayedCases']),
      trayItemsSorted: serializer.fromJson<int>(json['trayItemsSorted']),
      stepsWithoutMistake: serializer.fromJson<int>(json['stepsWithoutMistake']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'totalPlaySeconds': serializer.toJson<int>(totalPlaySeconds),
      'totalCompletedCases': serializer.toJson<int>(totalCompletedCases),
      'perfectCases': serializer.toJson<int>(perfectCases),
      'emergencyCasesDone': serializer.toJson<int>(emergencyCasesDone),
      'replayedCases': serializer.toJson<int>(replayedCases),
      'trayItemsSorted': serializer.toJson<int>(trayItemsSorted),
      'stepsWithoutMistake': serializer.toJson<int>(stepsWithoutMistake),
    };
  }

  StatsRow copyWith({
    int? id,
    int? totalPlaySeconds,
    int? totalCompletedCases,
    int? perfectCases,
    int? emergencyCasesDone,
    int? replayedCases,
    int? trayItemsSorted,
    int? stepsWithoutMistake,
  }) => StatsRow(
    id: id ?? this.id,
    totalPlaySeconds: totalPlaySeconds ?? this.totalPlaySeconds,
    totalCompletedCases: totalCompletedCases ?? this.totalCompletedCases,
    perfectCases: perfectCases ?? this.perfectCases,
    emergencyCasesDone: emergencyCasesDone ?? this.emergencyCasesDone,
    replayedCases: replayedCases ?? this.replayedCases,
    trayItemsSorted: trayItemsSorted ?? this.trayItemsSorted,
    stepsWithoutMistake: stepsWithoutMistake ?? this.stepsWithoutMistake,
  );
  StatsRow copyWithCompanion(PlayerStatsRowsCompanion data) {
    return StatsRow(
      id: data.id.present ? data.id.value : this.id,
      totalPlaySeconds: data.totalPlaySeconds.present
          ? data.totalPlaySeconds.value
          : this.totalPlaySeconds,
      totalCompletedCases: data.totalCompletedCases.present
          ? data.totalCompletedCases.value
          : this.totalCompletedCases,
      perfectCases: data.perfectCases.present ? data.perfectCases.value : this.perfectCases,
      emergencyCasesDone: data.emergencyCasesDone.present
          ? data.emergencyCasesDone.value
          : this.emergencyCasesDone,
      replayedCases: data.replayedCases.present ? data.replayedCases.value : this.replayedCases,
      trayItemsSorted: data.trayItemsSorted.present
          ? data.trayItemsSorted.value
          : this.trayItemsSorted,
      stepsWithoutMistake: data.stepsWithoutMistake.present
          ? data.stepsWithoutMistake.value
          : this.stepsWithoutMistake,
    );
  }

  @override
  String toString() {
    return (StringBuffer('StatsRow(')
          ..write('id: $id, ')
          ..write('totalPlaySeconds: $totalPlaySeconds, ')
          ..write('totalCompletedCases: $totalCompletedCases, ')
          ..write('perfectCases: $perfectCases, ')
          ..write('emergencyCasesDone: $emergencyCasesDone, ')
          ..write('replayedCases: $replayedCases, ')
          ..write('trayItemsSorted: $trayItemsSorted, ')
          ..write('stepsWithoutMistake: $stepsWithoutMistake')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    totalPlaySeconds,
    totalCompletedCases,
    perfectCases,
    emergencyCasesDone,
    replayedCases,
    trayItemsSorted,
    stepsWithoutMistake,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is StatsRow &&
          other.id == this.id &&
          other.totalPlaySeconds == this.totalPlaySeconds &&
          other.totalCompletedCases == this.totalCompletedCases &&
          other.perfectCases == this.perfectCases &&
          other.emergencyCasesDone == this.emergencyCasesDone &&
          other.replayedCases == this.replayedCases &&
          other.trayItemsSorted == this.trayItemsSorted &&
          other.stepsWithoutMistake == this.stepsWithoutMistake);
}

class PlayerStatsRowsCompanion extends UpdateCompanion<StatsRow> {
  final Value<int> id;
  final Value<int> totalPlaySeconds;
  final Value<int> totalCompletedCases;
  final Value<int> perfectCases;
  final Value<int> emergencyCasesDone;
  final Value<int> replayedCases;
  final Value<int> trayItemsSorted;
  final Value<int> stepsWithoutMistake;
  const PlayerStatsRowsCompanion({
    this.id = const Value.absent(),
    this.totalPlaySeconds = const Value.absent(),
    this.totalCompletedCases = const Value.absent(),
    this.perfectCases = const Value.absent(),
    this.emergencyCasesDone = const Value.absent(),
    this.replayedCases = const Value.absent(),
    this.trayItemsSorted = const Value.absent(),
    this.stepsWithoutMistake = const Value.absent(),
  });
  PlayerStatsRowsCompanion.insert({
    this.id = const Value.absent(),
    required int totalPlaySeconds,
    required int totalCompletedCases,
    required int perfectCases,
    required int emergencyCasesDone,
    required int replayedCases,
    required int trayItemsSorted,
    required int stepsWithoutMistake,
  }) : totalPlaySeconds = Value(totalPlaySeconds),
       totalCompletedCases = Value(totalCompletedCases),
       perfectCases = Value(perfectCases),
       emergencyCasesDone = Value(emergencyCasesDone),
       replayedCases = Value(replayedCases),
       trayItemsSorted = Value(trayItemsSorted),
       stepsWithoutMistake = Value(stepsWithoutMistake);
  static Insertable<StatsRow> custom({
    Expression<int>? id,
    Expression<int>? totalPlaySeconds,
    Expression<int>? totalCompletedCases,
    Expression<int>? perfectCases,
    Expression<int>? emergencyCasesDone,
    Expression<int>? replayedCases,
    Expression<int>? trayItemsSorted,
    Expression<int>? stepsWithoutMistake,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (totalPlaySeconds != null) 'total_play_seconds': totalPlaySeconds,
      if (totalCompletedCases != null) 'total_completed_cases': totalCompletedCases,
      if (perfectCases != null) 'perfect_cases': perfectCases,
      if (emergencyCasesDone != null) 'emergency_cases_done': emergencyCasesDone,
      if (replayedCases != null) 'replayed_cases': replayedCases,
      if (trayItemsSorted != null) 'tray_items_sorted': trayItemsSorted,
      if (stepsWithoutMistake != null) 'steps_without_mistake': stepsWithoutMistake,
    });
  }

  PlayerStatsRowsCompanion copyWith({
    Value<int>? id,
    Value<int>? totalPlaySeconds,
    Value<int>? totalCompletedCases,
    Value<int>? perfectCases,
    Value<int>? emergencyCasesDone,
    Value<int>? replayedCases,
    Value<int>? trayItemsSorted,
    Value<int>? stepsWithoutMistake,
  }) {
    return PlayerStatsRowsCompanion(
      id: id ?? this.id,
      totalPlaySeconds: totalPlaySeconds ?? this.totalPlaySeconds,
      totalCompletedCases: totalCompletedCases ?? this.totalCompletedCases,
      perfectCases: perfectCases ?? this.perfectCases,
      emergencyCasesDone: emergencyCasesDone ?? this.emergencyCasesDone,
      replayedCases: replayedCases ?? this.replayedCases,
      trayItemsSorted: trayItemsSorted ?? this.trayItemsSorted,
      stepsWithoutMistake: stepsWithoutMistake ?? this.stepsWithoutMistake,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (totalPlaySeconds.present) {
      map['total_play_seconds'] = Variable<int>(totalPlaySeconds.value);
    }
    if (totalCompletedCases.present) {
      map['total_completed_cases'] = Variable<int>(totalCompletedCases.value);
    }
    if (perfectCases.present) {
      map['perfect_cases'] = Variable<int>(perfectCases.value);
    }
    if (emergencyCasesDone.present) {
      map['emergency_cases_done'] = Variable<int>(emergencyCasesDone.value);
    }
    if (replayedCases.present) {
      map['replayed_cases'] = Variable<int>(replayedCases.value);
    }
    if (trayItemsSorted.present) {
      map['tray_items_sorted'] = Variable<int>(trayItemsSorted.value);
    }
    if (stepsWithoutMistake.present) {
      map['steps_without_mistake'] = Variable<int>(stepsWithoutMistake.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PlayerStatsRowsCompanion(')
          ..write('id: $id, ')
          ..write('totalPlaySeconds: $totalPlaySeconds, ')
          ..write('totalCompletedCases: $totalCompletedCases, ')
          ..write('perfectCases: $perfectCases, ')
          ..write('emergencyCasesDone: $emergencyCasesDone, ')
          ..write('replayedCases: $replayedCases, ')
          ..write('trayItemsSorted: $trayItemsSorted, ')
          ..write('stepsWithoutMistake: $stepsWithoutMistake')
          ..write(')'))
        .toString();
  }
}

class $RosterMonthsTable extends RosterMonths with TableInfo<$RosterMonthsTable, RosterMonthRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RosterMonthsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _monthKeyMeta = const VerificationMeta('monthKey');
  @override
  late final GeneratedColumn<String> monthKey = GeneratedColumn<String>(
    'month_key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _shiftsMeta = const VerificationMeta('shifts');
  @override
  late final GeneratedColumn<String> shifts = GeneratedColumn<String>(
    'shifts',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [monthKey, shifts];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'roster_months';
  @override
  VerificationContext validateIntegrity(
    Insertable<RosterMonthRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('month_key')) {
      context.handle(
        _monthKeyMeta,
        monthKey.isAcceptableOrUnknown(data['month_key']!, _monthKeyMeta),
      );
    } else if (isInserting) {
      context.missing(_monthKeyMeta);
    }
    if (data.containsKey('shifts')) {
      context.handle(_shiftsMeta, shifts.isAcceptableOrUnknown(data['shifts']!, _shiftsMeta));
    } else if (isInserting) {
      context.missing(_shiftsMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {monthKey};
  @override
  RosterMonthRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return RosterMonthRow(
      monthKey: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}month_key'],
      )!,
      shifts: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}shifts'],
      )!,
    );
  }

  @override
  $RosterMonthsTable createAlias(String alias) {
    return $RosterMonthsTable(attachedDatabase, alias);
  }
}

class RosterMonthRow extends DataClass implements Insertable<RosterMonthRow> {
  final String monthKey;
  final String shifts;
  const RosterMonthRow({required this.monthKey, required this.shifts});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['month_key'] = Variable<String>(monthKey);
    map['shifts'] = Variable<String>(shifts);
    return map;
  }

  RosterMonthsCompanion toCompanion(bool nullToAbsent) {
    return RosterMonthsCompanion(monthKey: Value(monthKey), shifts: Value(shifts));
  }

  factory RosterMonthRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return RosterMonthRow(
      monthKey: serializer.fromJson<String>(json['monthKey']),
      shifts: serializer.fromJson<String>(json['shifts']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'monthKey': serializer.toJson<String>(monthKey),
      'shifts': serializer.toJson<String>(shifts),
    };
  }

  RosterMonthRow copyWith({String? monthKey, String? shifts}) =>
      RosterMonthRow(monthKey: monthKey ?? this.monthKey, shifts: shifts ?? this.shifts);
  RosterMonthRow copyWithCompanion(RosterMonthsCompanion data) {
    return RosterMonthRow(
      monthKey: data.monthKey.present ? data.monthKey.value : this.monthKey,
      shifts: data.shifts.present ? data.shifts.value : this.shifts,
    );
  }

  @override
  String toString() {
    return (StringBuffer('RosterMonthRow(')
          ..write('monthKey: $monthKey, ')
          ..write('shifts: $shifts')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(monthKey, shifts);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is RosterMonthRow && other.monthKey == this.monthKey && other.shifts == this.shifts);
}

class RosterMonthsCompanion extends UpdateCompanion<RosterMonthRow> {
  final Value<String> monthKey;
  final Value<String> shifts;
  final Value<int> rowid;
  const RosterMonthsCompanion({
    this.monthKey = const Value.absent(),
    this.shifts = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RosterMonthsCompanion.insert({
    required String monthKey,
    required String shifts,
    this.rowid = const Value.absent(),
  }) : monthKey = Value(monthKey),
       shifts = Value(shifts);
  static Insertable<RosterMonthRow> custom({
    Expression<String>? monthKey,
    Expression<String>? shifts,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (monthKey != null) 'month_key': monthKey,
      if (shifts != null) 'shifts': shifts,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RosterMonthsCompanion copyWith({
    Value<String>? monthKey,
    Value<String>? shifts,
    Value<int>? rowid,
  }) {
    return RosterMonthsCompanion(
      monthKey: monthKey ?? this.monthKey,
      shifts: shifts ?? this.shifts,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (monthKey.present) {
      map['month_key'] = Variable<String>(monthKey.value);
    }
    if (shifts.present) {
      map['shifts'] = Variable<String>(shifts.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RosterMonthsCompanion(')
          ..write('monthKey: $monthKey, ')
          ..write('shifts: $shifts, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RosterClearedDaysTable extends RosterClearedDays
    with TableInfo<$RosterClearedDaysTable, ClearedDayRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RosterClearedDaysTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _dayKeyMeta = const VerificationMeta('dayKey');
  @override
  late final GeneratedColumn<String> dayKey = GeneratedColumn<String>(
    'day_key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [dayKey];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'roster_cleared_days';
  @override
  VerificationContext validateIntegrity(
    Insertable<ClearedDayRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('day_key')) {
      context.handle(_dayKeyMeta, dayKey.isAcceptableOrUnknown(data['day_key']!, _dayKeyMeta));
    } else if (isInserting) {
      context.missing(_dayKeyMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {dayKey};
  @override
  ClearedDayRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ClearedDayRow(
      dayKey: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}day_key'],
      )!,
    );
  }

  @override
  $RosterClearedDaysTable createAlias(String alias) {
    return $RosterClearedDaysTable(attachedDatabase, alias);
  }
}

class ClearedDayRow extends DataClass implements Insertable<ClearedDayRow> {
  final String dayKey;
  const ClearedDayRow({required this.dayKey});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['day_key'] = Variable<String>(dayKey);
    return map;
  }

  RosterClearedDaysCompanion toCompanion(bool nullToAbsent) {
    return RosterClearedDaysCompanion(dayKey: Value(dayKey));
  }

  factory ClearedDayRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ClearedDayRow(dayKey: serializer.fromJson<String>(json['dayKey']));
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{'dayKey': serializer.toJson<String>(dayKey)};
  }

  ClearedDayRow copyWith({String? dayKey}) => ClearedDayRow(dayKey: dayKey ?? this.dayKey);
  ClearedDayRow copyWithCompanion(RosterClearedDaysCompanion data) {
    return ClearedDayRow(dayKey: data.dayKey.present ? data.dayKey.value : this.dayKey);
  }

  @override
  String toString() {
    return (StringBuffer('ClearedDayRow(')
          ..write('dayKey: $dayKey')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => dayKey.hashCode;
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is ClearedDayRow && other.dayKey == this.dayKey);
}

class RosterClearedDaysCompanion extends UpdateCompanion<ClearedDayRow> {
  final Value<String> dayKey;
  final Value<int> rowid;
  const RosterClearedDaysCompanion({
    this.dayKey = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RosterClearedDaysCompanion.insert({required String dayKey, this.rowid = const Value.absent()})
    : dayKey = Value(dayKey);
  static Insertable<ClearedDayRow> custom({Expression<String>? dayKey, Expression<int>? rowid}) {
    return RawValuesInsertable({
      if (dayKey != null) 'day_key': dayKey,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RosterClearedDaysCompanion copyWith({Value<String>? dayKey, Value<int>? rowid}) {
    return RosterClearedDaysCompanion(dayKey: dayKey ?? this.dayKey, rowid: rowid ?? this.rowid);
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (dayKey.present) {
      map['day_key'] = Variable<String>(dayKey.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RosterClearedDaysCompanion(')
          ..write('dayKey: $dayKey, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $RosterDoneBedsTable extends RosterDoneBeds with TableInfo<$RosterDoneBedsTable, DoneBedRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $RosterDoneBedsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _dayKeyMeta = const VerificationMeta('dayKey');
  @override
  late final GeneratedColumn<String> dayKey = GeneratedColumn<String>(
    'day_key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _bedNumMeta = const VerificationMeta('bedNum');
  @override
  late final GeneratedColumn<int> bedNum = GeneratedColumn<int>(
    'bed_num',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [dayKey, bedNum];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'roster_done_beds';
  @override
  VerificationContext validateIntegrity(
    Insertable<DoneBedRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('day_key')) {
      context.handle(_dayKeyMeta, dayKey.isAcceptableOrUnknown(data['day_key']!, _dayKeyMeta));
    } else if (isInserting) {
      context.missing(_dayKeyMeta);
    }
    if (data.containsKey('bed_num')) {
      context.handle(_bedNumMeta, bedNum.isAcceptableOrUnknown(data['bed_num']!, _bedNumMeta));
    } else if (isInserting) {
      context.missing(_bedNumMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {dayKey, bedNum};
  @override
  DoneBedRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return DoneBedRow(
      dayKey: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}day_key'],
      )!,
      bedNum: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}bed_num'],
      )!,
    );
  }

  @override
  $RosterDoneBedsTable createAlias(String alias) {
    return $RosterDoneBedsTable(attachedDatabase, alias);
  }
}

class DoneBedRow extends DataClass implements Insertable<DoneBedRow> {
  final String dayKey;
  final int bedNum;
  const DoneBedRow({required this.dayKey, required this.bedNum});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['day_key'] = Variable<String>(dayKey);
    map['bed_num'] = Variable<int>(bedNum);
    return map;
  }

  RosterDoneBedsCompanion toCompanion(bool nullToAbsent) {
    return RosterDoneBedsCompanion(dayKey: Value(dayKey), bedNum: Value(bedNum));
  }

  factory DoneBedRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return DoneBedRow(
      dayKey: serializer.fromJson<String>(json['dayKey']),
      bedNum: serializer.fromJson<int>(json['bedNum']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'dayKey': serializer.toJson<String>(dayKey),
      'bedNum': serializer.toJson<int>(bedNum),
    };
  }

  DoneBedRow copyWith({String? dayKey, int? bedNum}) =>
      DoneBedRow(dayKey: dayKey ?? this.dayKey, bedNum: bedNum ?? this.bedNum);
  DoneBedRow copyWithCompanion(RosterDoneBedsCompanion data) {
    return DoneBedRow(
      dayKey: data.dayKey.present ? data.dayKey.value : this.dayKey,
      bedNum: data.bedNum.present ? data.bedNum.value : this.bedNum,
    );
  }

  @override
  String toString() {
    return (StringBuffer('DoneBedRow(')
          ..write('dayKey: $dayKey, ')
          ..write('bedNum: $bedNum')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(dayKey, bedNum);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is DoneBedRow && other.dayKey == this.dayKey && other.bedNum == this.bedNum);
}

class RosterDoneBedsCompanion extends UpdateCompanion<DoneBedRow> {
  final Value<String> dayKey;
  final Value<int> bedNum;
  final Value<int> rowid;
  const RosterDoneBedsCompanion({
    this.dayKey = const Value.absent(),
    this.bedNum = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  RosterDoneBedsCompanion.insert({
    required String dayKey,
    required int bedNum,
    this.rowid = const Value.absent(),
  }) : dayKey = Value(dayKey),
       bedNum = Value(bedNum);
  static Insertable<DoneBedRow> custom({
    Expression<String>? dayKey,
    Expression<int>? bedNum,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (dayKey != null) 'day_key': dayKey,
      if (bedNum != null) 'bed_num': bedNum,
      if (rowid != null) 'rowid': rowid,
    });
  }

  RosterDoneBedsCompanion copyWith({Value<String>? dayKey, Value<int>? bedNum, Value<int>? rowid}) {
    return RosterDoneBedsCompanion(
      dayKey: dayKey ?? this.dayKey,
      bedNum: bedNum ?? this.bedNum,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (dayKey.present) {
      map['day_key'] = Variable<String>(dayKey.value);
    }
    if (bedNum.present) {
      map['bed_num'] = Variable<int>(bedNum.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('RosterDoneBedsCompanion(')
          ..write('dayKey: $dayKey, ')
          ..write('bedNum: $bedNum, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ImportedCaseFilesTable extends ImportedCaseFiles
    with TableInfo<$ImportedCaseFilesTable, CaseFileRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ImportedCaseFilesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _jsonMeta = const VerificationMeta('json');
  @override
  late final GeneratedColumn<String> json = GeneratedColumn<String>(
    'json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _savedAtMeta = const VerificationMeta('savedAt');
  @override
  late final GeneratedColumn<DateTime> savedAt = GeneratedColumn<DateTime>(
    'saved_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [id, json, savedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'imported_case_files';
  @override
  VerificationContext validateIntegrity(
    Insertable<CaseFileRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('json')) {
      context.handle(_jsonMeta, json.isAcceptableOrUnknown(data['json']!, _jsonMeta));
    } else if (isInserting) {
      context.missing(_jsonMeta);
    }
    if (data.containsKey('saved_at')) {
      context.handle(_savedAtMeta, savedAt.isAcceptableOrUnknown(data['saved_at']!, _savedAtMeta));
    } else if (isInserting) {
      context.missing(_savedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  CaseFileRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CaseFileRow(
      id: attachedDatabase.typeMapping.read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      json: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}json'])!,
      savedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}saved_at'],
      )!,
    );
  }

  @override
  $ImportedCaseFilesTable createAlias(String alias) {
    return $ImportedCaseFilesTable(attachedDatabase, alias);
  }
}

class CaseFileRow extends DataClass implements Insertable<CaseFileRow> {
  final int id;
  final String json;
  final DateTime savedAt;
  const CaseFileRow({required this.id, required this.json, required this.savedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['json'] = Variable<String>(json);
    map['saved_at'] = Variable<DateTime>(savedAt);
    return map;
  }

  ImportedCaseFilesCompanion toCompanion(bool nullToAbsent) {
    return ImportedCaseFilesCompanion(id: Value(id), json: Value(json), savedAt: Value(savedAt));
  }

  factory CaseFileRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CaseFileRow(
      id: serializer.fromJson<int>(json['id']),
      json: serializer.fromJson<String>(json['json']),
      savedAt: serializer.fromJson<DateTime>(json['savedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'json': serializer.toJson<String>(json),
      'savedAt': serializer.toJson<DateTime>(savedAt),
    };
  }

  CaseFileRow copyWith({int? id, String? json, DateTime? savedAt}) =>
      CaseFileRow(id: id ?? this.id, json: json ?? this.json, savedAt: savedAt ?? this.savedAt);
  CaseFileRow copyWithCompanion(ImportedCaseFilesCompanion data) {
    return CaseFileRow(
      id: data.id.present ? data.id.value : this.id,
      json: data.json.present ? data.json.value : this.json,
      savedAt: data.savedAt.present ? data.savedAt.value : this.savedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CaseFileRow(')
          ..write('id: $id, ')
          ..write('json: $json, ')
          ..write('savedAt: $savedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, json, savedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CaseFileRow &&
          other.id == this.id &&
          other.json == this.json &&
          other.savedAt == this.savedAt);
}

class ImportedCaseFilesCompanion extends UpdateCompanion<CaseFileRow> {
  final Value<int> id;
  final Value<String> json;
  final Value<DateTime> savedAt;
  const ImportedCaseFilesCompanion({
    this.id = const Value.absent(),
    this.json = const Value.absent(),
    this.savedAt = const Value.absent(),
  });
  ImportedCaseFilesCompanion.insert({
    this.id = const Value.absent(),
    required String json,
    required DateTime savedAt,
  }) : json = Value(json),
       savedAt = Value(savedAt);
  static Insertable<CaseFileRow> custom({
    Expression<int>? id,
    Expression<String>? json,
    Expression<DateTime>? savedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (json != null) 'json': json,
      if (savedAt != null) 'saved_at': savedAt,
    });
  }

  ImportedCaseFilesCompanion copyWith({
    Value<int>? id,
    Value<String>? json,
    Value<DateTime>? savedAt,
  }) {
    return ImportedCaseFilesCompanion(
      id: id ?? this.id,
      json: json ?? this.json,
      savedAt: savedAt ?? this.savedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (json.present) {
      map['json'] = Variable<String>(json.value);
    }
    if (savedAt.present) {
      map['saved_at'] = Variable<DateTime>(savedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ImportedCaseFilesCompanion(')
          ..write('id: $id, ')
          ..write('json: $json, ')
          ..write('savedAt: $savedAt')
          ..write(')'))
        .toString();
  }
}

class $StoreMetaTable extends StoreMeta with TableInfo<$StoreMetaTable, MetaRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $StoreMetaTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'store_meta';
  @override
  VerificationContext validateIntegrity(Insertable<MetaRow> instance, {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(_keyMeta, key.isAcceptableOrUnknown(data['key']!, _keyMeta));
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(_valueMeta, value.isAcceptableOrUnknown(data['value']!, _valueMeta));
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  MetaRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MetaRow(
      key: attachedDatabase.typeMapping.read(DriftSqlType.string, data['${effectivePrefix}key'])!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $StoreMetaTable createAlias(String alias) {
    return $StoreMetaTable(attachedDatabase, alias);
  }
}

class MetaRow extends DataClass implements Insertable<MetaRow> {
  final String key;
  final String value;
  const MetaRow({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  StoreMetaCompanion toCompanion(bool nullToAbsent) {
    return StoreMetaCompanion(key: Value(key), value: Value(value));
  }

  factory MetaRow.fromJson(Map<String, dynamic> json, {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MetaRow(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  MetaRow copyWith({String? key, String? value}) =>
      MetaRow(key: key ?? this.key, value: value ?? this.value);
  MetaRow copyWithCompanion(StoreMetaCompanion data) {
    return MetaRow(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MetaRow(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MetaRow && other.key == this.key && other.value == this.value);
}

class StoreMetaCompanion extends UpdateCompanion<MetaRow> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const StoreMetaCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  StoreMetaCompanion.insert({
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value);
  static Insertable<MetaRow> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  StoreMetaCompanion copyWith({Value<String>? key, Value<String>? value, Value<int>? rowid}) {
    return StoreMetaCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('StoreMetaCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$GameDatabase extends GeneratedDatabase {
  _$GameDatabase(QueryExecutor e) : super(e);
  $GameDatabaseManager get managers => $GameDatabaseManager(this);
  late final $BedRecordsTable bedRecords = $BedRecordsTable(this);
  late final $PlayerStatsRowsTable playerStatsRows = $PlayerStatsRowsTable(this);
  late final $RosterMonthsTable rosterMonths = $RosterMonthsTable(this);
  late final $RosterClearedDaysTable rosterClearedDays = $RosterClearedDaysTable(this);
  late final $RosterDoneBedsTable rosterDoneBeds = $RosterDoneBedsTable(this);
  late final $ImportedCaseFilesTable importedCaseFiles = $ImportedCaseFilesTable(this);
  late final $StoreMetaTable storeMeta = $StoreMetaTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    bedRecords,
    playerStatsRows,
    rosterMonths,
    rosterClearedDays,
    rosterDoneBeds,
    importedCaseFiles,
    storeMeta,
  ];
}

typedef $$BedRecordsTableCreateCompanionBuilder = BedRecordsCompanion Function({
  Value<int> bedNum,
  required bool passed,
  required int stars,
});
typedef $$BedRecordsTableUpdateCompanionBuilder = BedRecordsCompanion Function({
  Value<int> bedNum,
  Value<bool> passed,
  Value<int> stars,
});

class $$BedRecordsTableFilterComposer extends Composer<_$GameDatabase, $BedRecordsTable> {
  $$BedRecordsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get passed =>
      $composableBuilder(column: $table.passed, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get stars =>
      $composableBuilder(column: $table.stars, builder: (column) => ColumnFilters(column));
}

class $$BedRecordsTableOrderingComposer extends Composer<_$GameDatabase, $BedRecordsTable> {
  $$BedRecordsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get passed =>
      $composableBuilder(column: $table.passed, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get stars =>
      $composableBuilder(column: $table.stars, builder: (column) => ColumnOrderings(column));
}

class $$BedRecordsTableAnnotationComposer extends Composer<_$GameDatabase, $BedRecordsTable> {
  $$BedRecordsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => column);

  GeneratedColumn<bool> get passed =>
      $composableBuilder(column: $table.passed, builder: (column) => column);

  GeneratedColumn<int> get stars =>
      $composableBuilder(column: $table.stars, builder: (column) => column);
}

class $$BedRecordsTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $BedRecordsTable,
          BedRow,
          $$BedRecordsTableFilterComposer,
          $$BedRecordsTableOrderingComposer,
          $$BedRecordsTableAnnotationComposer,
          $$BedRecordsTableCreateCompanionBuilder,
          $$BedRecordsTableUpdateCompanionBuilder,
          (BedRow, BaseReferences<_$GameDatabase, $BedRecordsTable, BedRow>),
          BedRow,
          PrefetchHooks Function()
        > {
  $$BedRecordsTableTableManager(_$GameDatabase db, $BedRecordsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$BedRecordsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$BedRecordsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$BedRecordsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> bedNum = const Value.absent(),
            Value<bool> passed = const Value.absent(),
            Value<int> stars = const Value.absent(),
          }) => BedRecordsCompanion(bedNum: bedNum, passed: passed, stars: stars),
          createCompanionCallback: ({
            Value<int> bedNum = const Value.absent(),
            required bool passed,
            required int stars,
          }) => BedRecordsCompanion.insert(bedNum: bedNum, passed: passed, stars: stars),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$BedRecordsTable, BedRow>(table),
                  BaseReferences<_$GameDatabase, $BedRecordsTable, BedRow>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$BedRecordsTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $BedRecordsTable,
      BedRow,
      $$BedRecordsTableFilterComposer,
      $$BedRecordsTableOrderingComposer,
      $$BedRecordsTableAnnotationComposer,
      $$BedRecordsTableCreateCompanionBuilder,
      $$BedRecordsTableUpdateCompanionBuilder,
      (BedRow, BaseReferences<_$GameDatabase, $BedRecordsTable, BedRow>),
      BedRow,
      PrefetchHooks Function()
    >;
typedef $$PlayerStatsRowsTableCreateCompanionBuilder = PlayerStatsRowsCompanion Function({
  Value<int> id,
  required int totalPlaySeconds,
  required int totalCompletedCases,
  required int perfectCases,
  required int emergencyCasesDone,
  required int replayedCases,
  required int trayItemsSorted,
  required int stepsWithoutMistake,
});
typedef $$PlayerStatsRowsTableUpdateCompanionBuilder = PlayerStatsRowsCompanion Function({
  Value<int> id,
  Value<int> totalPlaySeconds,
  Value<int> totalCompletedCases,
  Value<int> perfectCases,
  Value<int> emergencyCasesDone,
  Value<int> replayedCases,
  Value<int> trayItemsSorted,
  Value<int> stepsWithoutMistake,
});

class $$PlayerStatsRowsTableFilterComposer extends Composer<_$GameDatabase, $PlayerStatsRowsTable> {
  $$PlayerStatsRowsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get totalPlaySeconds => $composableBuilder(
    column: $table.totalPlaySeconds,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalCompletedCases => $composableBuilder(
    column: $table.totalCompletedCases,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get perfectCases =>
      $composableBuilder(column: $table.perfectCases, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get emergencyCasesDone => $composableBuilder(
    column: $table.emergencyCasesDone,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get replayedCases =>
      $composableBuilder(column: $table.replayedCases, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get trayItemsSorted => $composableBuilder(
    column: $table.trayItemsSorted,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get stepsWithoutMistake => $composableBuilder(
    column: $table.stepsWithoutMistake,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PlayerStatsRowsTableOrderingComposer
    extends Composer<_$GameDatabase, $PlayerStatsRowsTable> {
  $$PlayerStatsRowsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get totalPlaySeconds => $composableBuilder(
    column: $table.totalPlaySeconds,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalCompletedCases => $composableBuilder(
    column: $table.totalCompletedCases,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get perfectCases =>
      $composableBuilder(column: $table.perfectCases, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get emergencyCasesDone => $composableBuilder(
    column: $table.emergencyCasesDone,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get replayedCases => $composableBuilder(
    column: $table.replayedCases,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get trayItemsSorted => $composableBuilder(
    column: $table.trayItemsSorted,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get stepsWithoutMistake => $composableBuilder(
    column: $table.stepsWithoutMistake,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PlayerStatsRowsTableAnnotationComposer
    extends Composer<_$GameDatabase, $PlayerStatsRowsTable> {
  $$PlayerStatsRowsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get totalPlaySeconds =>
      $composableBuilder(column: $table.totalPlaySeconds, builder: (column) => column);

  GeneratedColumn<int> get totalCompletedCases =>
      $composableBuilder(column: $table.totalCompletedCases, builder: (column) => column);

  GeneratedColumn<int> get perfectCases =>
      $composableBuilder(column: $table.perfectCases, builder: (column) => column);

  GeneratedColumn<int> get emergencyCasesDone =>
      $composableBuilder(column: $table.emergencyCasesDone, builder: (column) => column);

  GeneratedColumn<int> get replayedCases =>
      $composableBuilder(column: $table.replayedCases, builder: (column) => column);

  GeneratedColumn<int> get trayItemsSorted =>
      $composableBuilder(column: $table.trayItemsSorted, builder: (column) => column);

  GeneratedColumn<int> get stepsWithoutMistake =>
      $composableBuilder(column: $table.stepsWithoutMistake, builder: (column) => column);
}

class $$PlayerStatsRowsTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $PlayerStatsRowsTable,
          StatsRow,
          $$PlayerStatsRowsTableFilterComposer,
          $$PlayerStatsRowsTableOrderingComposer,
          $$PlayerStatsRowsTableAnnotationComposer,
          $$PlayerStatsRowsTableCreateCompanionBuilder,
          $$PlayerStatsRowsTableUpdateCompanionBuilder,
          (StatsRow, BaseReferences<_$GameDatabase, $PlayerStatsRowsTable, StatsRow>),
          StatsRow,
          PrefetchHooks Function()
        > {
  $$PlayerStatsRowsTableTableManager(_$GameDatabase db, $PlayerStatsRowsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PlayerStatsRowsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PlayerStatsRowsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PlayerStatsRowsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> totalPlaySeconds = const Value.absent(),
                Value<int> totalCompletedCases = const Value.absent(),
                Value<int> perfectCases = const Value.absent(),
                Value<int> emergencyCasesDone = const Value.absent(),
                Value<int> replayedCases = const Value.absent(),
                Value<int> trayItemsSorted = const Value.absent(),
                Value<int> stepsWithoutMistake = const Value.absent(),
              }) => PlayerStatsRowsCompanion(
                id: id,
                totalPlaySeconds: totalPlaySeconds,
                totalCompletedCases: totalCompletedCases,
                perfectCases: perfectCases,
                emergencyCasesDone: emergencyCasesDone,
                replayedCases: replayedCases,
                trayItemsSorted: trayItemsSorted,
                stepsWithoutMistake: stepsWithoutMistake,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int totalPlaySeconds,
                required int totalCompletedCases,
                required int perfectCases,
                required int emergencyCasesDone,
                required int replayedCases,
                required int trayItemsSorted,
                required int stepsWithoutMistake,
              }) => PlayerStatsRowsCompanion.insert(
                id: id,
                totalPlaySeconds: totalPlaySeconds,
                totalCompletedCases: totalCompletedCases,
                perfectCases: perfectCases,
                emergencyCasesDone: emergencyCasesDone,
                replayedCases: replayedCases,
                trayItemsSorted: trayItemsSorted,
                stepsWithoutMistake: stepsWithoutMistake,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$PlayerStatsRowsTable, StatsRow>(table),
                  BaseReferences<_$GameDatabase, $PlayerStatsRowsTable, StatsRow>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PlayerStatsRowsTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $PlayerStatsRowsTable,
      StatsRow,
      $$PlayerStatsRowsTableFilterComposer,
      $$PlayerStatsRowsTableOrderingComposer,
      $$PlayerStatsRowsTableAnnotationComposer,
      $$PlayerStatsRowsTableCreateCompanionBuilder,
      $$PlayerStatsRowsTableUpdateCompanionBuilder,
      (StatsRow, BaseReferences<_$GameDatabase, $PlayerStatsRowsTable, StatsRow>),
      StatsRow,
      PrefetchHooks Function()
    >;
typedef $$RosterMonthsTableCreateCompanionBuilder = RosterMonthsCompanion Function({
  required String monthKey,
  required String shifts,
  Value<int> rowid,
});
typedef $$RosterMonthsTableUpdateCompanionBuilder = RosterMonthsCompanion Function({
  Value<String> monthKey,
  Value<String> shifts,
  Value<int> rowid,
});

class $$RosterMonthsTableFilterComposer extends Composer<_$GameDatabase, $RosterMonthsTable> {
  $$RosterMonthsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get monthKey =>
      $composableBuilder(column: $table.monthKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get shifts =>
      $composableBuilder(column: $table.shifts, builder: (column) => ColumnFilters(column));
}

class $$RosterMonthsTableOrderingComposer extends Composer<_$GameDatabase, $RosterMonthsTable> {
  $$RosterMonthsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get monthKey =>
      $composableBuilder(column: $table.monthKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get shifts =>
      $composableBuilder(column: $table.shifts, builder: (column) => ColumnOrderings(column));
}

class $$RosterMonthsTableAnnotationComposer extends Composer<_$GameDatabase, $RosterMonthsTable> {
  $$RosterMonthsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get monthKey =>
      $composableBuilder(column: $table.monthKey, builder: (column) => column);

  GeneratedColumn<String> get shifts =>
      $composableBuilder(column: $table.shifts, builder: (column) => column);
}

class $$RosterMonthsTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $RosterMonthsTable,
          RosterMonthRow,
          $$RosterMonthsTableFilterComposer,
          $$RosterMonthsTableOrderingComposer,
          $$RosterMonthsTableAnnotationComposer,
          $$RosterMonthsTableCreateCompanionBuilder,
          $$RosterMonthsTableUpdateCompanionBuilder,
          (RosterMonthRow, BaseReferences<_$GameDatabase, $RosterMonthsTable, RosterMonthRow>),
          RosterMonthRow,
          PrefetchHooks Function()
        > {
  $$RosterMonthsTableTableManager(_$GameDatabase db, $RosterMonthsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$RosterMonthsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$RosterMonthsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RosterMonthsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> monthKey = const Value.absent(),
            Value<String> shifts = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => RosterMonthsCompanion(monthKey: monthKey, shifts: shifts, rowid: rowid),
          createCompanionCallback: ({
            required String monthKey,
            required String shifts,
            Value<int> rowid = const Value.absent(),
          }) => RosterMonthsCompanion.insert(monthKey: monthKey, shifts: shifts, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$RosterMonthsTable, RosterMonthRow>(table),
                  BaseReferences<_$GameDatabase, $RosterMonthsTable, RosterMonthRow>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$RosterMonthsTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $RosterMonthsTable,
      RosterMonthRow,
      $$RosterMonthsTableFilterComposer,
      $$RosterMonthsTableOrderingComposer,
      $$RosterMonthsTableAnnotationComposer,
      $$RosterMonthsTableCreateCompanionBuilder,
      $$RosterMonthsTableUpdateCompanionBuilder,
      (RosterMonthRow, BaseReferences<_$GameDatabase, $RosterMonthsTable, RosterMonthRow>),
      RosterMonthRow,
      PrefetchHooks Function()
    >;
typedef $$RosterClearedDaysTableCreateCompanionBuilder = RosterClearedDaysCompanion Function({
  required String dayKey,
  Value<int> rowid,
});
typedef $$RosterClearedDaysTableUpdateCompanionBuilder = RosterClearedDaysCompanion Function({
  Value<String> dayKey,
  Value<int> rowid,
});

class $$RosterClearedDaysTableFilterComposer
    extends Composer<_$GameDatabase, $RosterClearedDaysTable> {
  $$RosterClearedDaysTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => ColumnFilters(column));
}

class $$RosterClearedDaysTableOrderingComposer
    extends Composer<_$GameDatabase, $RosterClearedDaysTable> {
  $$RosterClearedDaysTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => ColumnOrderings(column));
}

class $$RosterClearedDaysTableAnnotationComposer
    extends Composer<_$GameDatabase, $RosterClearedDaysTable> {
  $$RosterClearedDaysTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => column);
}

class $$RosterClearedDaysTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $RosterClearedDaysTable,
          ClearedDayRow,
          $$RosterClearedDaysTableFilterComposer,
          $$RosterClearedDaysTableOrderingComposer,
          $$RosterClearedDaysTableAnnotationComposer,
          $$RosterClearedDaysTableCreateCompanionBuilder,
          $$RosterClearedDaysTableUpdateCompanionBuilder,
          (ClearedDayRow, BaseReferences<_$GameDatabase, $RosterClearedDaysTable, ClearedDayRow>),
          ClearedDayRow,
          PrefetchHooks Function()
        > {
  $$RosterClearedDaysTableTableManager(_$GameDatabase db, $RosterClearedDaysTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RosterClearedDaysTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RosterClearedDaysTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RosterClearedDaysTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> dayKey = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => RosterClearedDaysCompanion(dayKey: dayKey, rowid: rowid),
          createCompanionCallback: ({
            required String dayKey,
            Value<int> rowid = const Value.absent(),
          }) => RosterClearedDaysCompanion.insert(dayKey: dayKey, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$RosterClearedDaysTable, ClearedDayRow>(table),
                  BaseReferences<_$GameDatabase, $RosterClearedDaysTable, ClearedDayRow>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$RosterClearedDaysTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $RosterClearedDaysTable,
      ClearedDayRow,
      $$RosterClearedDaysTableFilterComposer,
      $$RosterClearedDaysTableOrderingComposer,
      $$RosterClearedDaysTableAnnotationComposer,
      $$RosterClearedDaysTableCreateCompanionBuilder,
      $$RosterClearedDaysTableUpdateCompanionBuilder,
      (ClearedDayRow, BaseReferences<_$GameDatabase, $RosterClearedDaysTable, ClearedDayRow>),
      ClearedDayRow,
      PrefetchHooks Function()
    >;
typedef $$RosterDoneBedsTableCreateCompanionBuilder = RosterDoneBedsCompanion Function({
  required String dayKey,
  required int bedNum,
  Value<int> rowid,
});
typedef $$RosterDoneBedsTableUpdateCompanionBuilder = RosterDoneBedsCompanion Function({
  Value<String> dayKey,
  Value<int> bedNum,
  Value<int> rowid,
});

class $$RosterDoneBedsTableFilterComposer extends Composer<_$GameDatabase, $RosterDoneBedsTable> {
  $$RosterDoneBedsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => ColumnFilters(column));
}

class $$RosterDoneBedsTableOrderingComposer extends Composer<_$GameDatabase, $RosterDoneBedsTable> {
  $$RosterDoneBedsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => ColumnOrderings(column));
}

class $$RosterDoneBedsTableAnnotationComposer
    extends Composer<_$GameDatabase, $RosterDoneBedsTable> {
  $$RosterDoneBedsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get dayKey =>
      $composableBuilder(column: $table.dayKey, builder: (column) => column);

  GeneratedColumn<int> get bedNum =>
      $composableBuilder(column: $table.bedNum, builder: (column) => column);
}

class $$RosterDoneBedsTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $RosterDoneBedsTable,
          DoneBedRow,
          $$RosterDoneBedsTableFilterComposer,
          $$RosterDoneBedsTableOrderingComposer,
          $$RosterDoneBedsTableAnnotationComposer,
          $$RosterDoneBedsTableCreateCompanionBuilder,
          $$RosterDoneBedsTableUpdateCompanionBuilder,
          (DoneBedRow, BaseReferences<_$GameDatabase, $RosterDoneBedsTable, DoneBedRow>),
          DoneBedRow,
          PrefetchHooks Function()
        > {
  $$RosterDoneBedsTableTableManager(_$GameDatabase db, $RosterDoneBedsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$RosterDoneBedsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$RosterDoneBedsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$RosterDoneBedsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> dayKey = const Value.absent(),
            Value<int> bedNum = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => RosterDoneBedsCompanion(dayKey: dayKey, bedNum: bedNum, rowid: rowid),
          createCompanionCallback: ({
            required String dayKey,
            required int bedNum,
            Value<int> rowid = const Value.absent(),
          }) => RosterDoneBedsCompanion.insert(dayKey: dayKey, bedNum: bedNum, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$RosterDoneBedsTable, DoneBedRow>(table),
                  BaseReferences<_$GameDatabase, $RosterDoneBedsTable, DoneBedRow>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$RosterDoneBedsTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $RosterDoneBedsTable,
      DoneBedRow,
      $$RosterDoneBedsTableFilterComposer,
      $$RosterDoneBedsTableOrderingComposer,
      $$RosterDoneBedsTableAnnotationComposer,
      $$RosterDoneBedsTableCreateCompanionBuilder,
      $$RosterDoneBedsTableUpdateCompanionBuilder,
      (DoneBedRow, BaseReferences<_$GameDatabase, $RosterDoneBedsTable, DoneBedRow>),
      DoneBedRow,
      PrefetchHooks Function()
    >;
typedef $$ImportedCaseFilesTableCreateCompanionBuilder = ImportedCaseFilesCompanion Function({
  Value<int> id,
  required String json,
  required DateTime savedAt,
});
typedef $$ImportedCaseFilesTableUpdateCompanionBuilder = ImportedCaseFilesCompanion Function({
  Value<int> id,
  Value<String> json,
  Value<DateTime> savedAt,
});

class $$ImportedCaseFilesTableFilterComposer
    extends Composer<_$GameDatabase, $ImportedCaseFilesTable> {
  $$ImportedCaseFilesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get savedAt =>
      $composableBuilder(column: $table.savedAt, builder: (column) => ColumnFilters(column));
}

class $$ImportedCaseFilesTableOrderingComposer
    extends Composer<_$GameDatabase, $ImportedCaseFilesTable> {
  $$ImportedCaseFilesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get savedAt =>
      $composableBuilder(column: $table.savedAt, builder: (column) => ColumnOrderings(column));
}

class $$ImportedCaseFilesTableAnnotationComposer
    extends Composer<_$GameDatabase, $ImportedCaseFilesTable> {
  $$ImportedCaseFilesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id => $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get json =>
      $composableBuilder(column: $table.json, builder: (column) => column);

  GeneratedColumn<DateTime> get savedAt =>
      $composableBuilder(column: $table.savedAt, builder: (column) => column);
}

class $$ImportedCaseFilesTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $ImportedCaseFilesTable,
          CaseFileRow,
          $$ImportedCaseFilesTableFilterComposer,
          $$ImportedCaseFilesTableOrderingComposer,
          $$ImportedCaseFilesTableAnnotationComposer,
          $$ImportedCaseFilesTableCreateCompanionBuilder,
          $$ImportedCaseFilesTableUpdateCompanionBuilder,
          (CaseFileRow, BaseReferences<_$GameDatabase, $ImportedCaseFilesTable, CaseFileRow>),
          CaseFileRow,
          PrefetchHooks Function()
        > {
  $$ImportedCaseFilesTableTableManager(_$GameDatabase db, $ImportedCaseFilesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ImportedCaseFilesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ImportedCaseFilesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ImportedCaseFilesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> json = const Value.absent(),
            Value<DateTime> savedAt = const Value.absent(),
          }) => ImportedCaseFilesCompanion(id: id, json: json, savedAt: savedAt),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String json,
            required DateTime savedAt,
          }) => ImportedCaseFilesCompanion.insert(id: id, json: json, savedAt: savedAt),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$ImportedCaseFilesTable, CaseFileRow>(table),
                  BaseReferences<_$GameDatabase, $ImportedCaseFilesTable, CaseFileRow>(
                    db,
                    table,
                    e,
                  ),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ImportedCaseFilesTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $ImportedCaseFilesTable,
      CaseFileRow,
      $$ImportedCaseFilesTableFilterComposer,
      $$ImportedCaseFilesTableOrderingComposer,
      $$ImportedCaseFilesTableAnnotationComposer,
      $$ImportedCaseFilesTableCreateCompanionBuilder,
      $$ImportedCaseFilesTableUpdateCompanionBuilder,
      (CaseFileRow, BaseReferences<_$GameDatabase, $ImportedCaseFilesTable, CaseFileRow>),
      CaseFileRow,
      PrefetchHooks Function()
    >;
typedef $$StoreMetaTableCreateCompanionBuilder = StoreMetaCompanion Function({
  required String key,
  required String value,
  Value<int> rowid,
});
typedef $$StoreMetaTableUpdateCompanionBuilder = StoreMetaCompanion Function({
  Value<String> key,
  Value<String> value,
  Value<int> rowid,
});

class $$StoreMetaTableFilterComposer extends Composer<_$GameDatabase, $StoreMetaTable> {
  $$StoreMetaTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnFilters(column));
}

class $$StoreMetaTableOrderingComposer extends Composer<_$GameDatabase, $StoreMetaTable> {
  $$StoreMetaTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => ColumnOrderings(column));
}

class $$StoreMetaTableAnnotationComposer extends Composer<_$GameDatabase, $StoreMetaTable> {
  $$StoreMetaTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$StoreMetaTableTableManager
    extends
        RootTableManager<
          _$GameDatabase,
          $StoreMetaTable,
          MetaRow,
          $$StoreMetaTableFilterComposer,
          $$StoreMetaTableOrderingComposer,
          $$StoreMetaTableAnnotationComposer,
          $$StoreMetaTableCreateCompanionBuilder,
          $$StoreMetaTableUpdateCompanionBuilder,
          (MetaRow, BaseReferences<_$GameDatabase, $StoreMetaTable, MetaRow>),
          MetaRow,
          PrefetchHooks Function()
        > {
  $$StoreMetaTableTableManager(_$GameDatabase db, $StoreMetaTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () => $$StoreMetaTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () => $$StoreMetaTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$StoreMetaTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> key = const Value.absent(),
            Value<String> value = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) => StoreMetaCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback: ({
            required String key,
            required String value,
            Value<int> rowid = const Value.absent(),
          }) => StoreMetaCompanion.insert(key: key, value: value, rowid: rowid),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable<$StoreMetaTable, MetaRow>(table),
                  BaseReferences<_$GameDatabase, $StoreMetaTable, MetaRow>(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$StoreMetaTableProcessedTableManager =
    ProcessedTableManager<
      _$GameDatabase,
      $StoreMetaTable,
      MetaRow,
      $$StoreMetaTableFilterComposer,
      $$StoreMetaTableOrderingComposer,
      $$StoreMetaTableAnnotationComposer,
      $$StoreMetaTableCreateCompanionBuilder,
      $$StoreMetaTableUpdateCompanionBuilder,
      (MetaRow, BaseReferences<_$GameDatabase, $StoreMetaTable, MetaRow>),
      MetaRow,
      PrefetchHooks Function()
    >;

class $GameDatabaseManager {
  final _$GameDatabase _db;
  $GameDatabaseManager(this._db);
  $$BedRecordsTableTableManager get bedRecords =>
      $$BedRecordsTableTableManager(_db, _db.bedRecords);
  $$PlayerStatsRowsTableTableManager get playerStatsRows =>
      $$PlayerStatsRowsTableTableManager(_db, _db.playerStatsRows);
  $$RosterMonthsTableTableManager get rosterMonths =>
      $$RosterMonthsTableTableManager(_db, _db.rosterMonths);
  $$RosterClearedDaysTableTableManager get rosterClearedDays =>
      $$RosterClearedDaysTableTableManager(_db, _db.rosterClearedDays);
  $$RosterDoneBedsTableTableManager get rosterDoneBeds =>
      $$RosterDoneBedsTableTableManager(_db, _db.rosterDoneBeds);
  $$ImportedCaseFilesTableTableManager get importedCaseFiles =>
      $$ImportedCaseFilesTableTableManager(_db, _db.importedCaseFiles);
  $$StoreMetaTableTableManager get storeMeta => $$StoreMetaTableTableManager(_db, _db.storeMeta);
}
