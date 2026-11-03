import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_th.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('th')];

  /// No description provided for @appTitle.
  ///
  /// In th, this message translates to:
  /// **'Critical Care'**
  String get appTitle;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'โหลดเคสไม่สำเร็จ'**
  String get casesLoadError;

  /// No description provided for @stepOf.
  ///
  /// In th, this message translates to:
  /// **'ขั้นที่ {step}/{total}'**
  String stepOf(int step, int total);

  /// No description provided for @stepDot.
  ///
  /// In th, this message translates to:
  /// **'ขั้นที่ {step}'**
  String stepDot(int step);

  /// No description provided for @liveStars.
  ///
  /// In th, this message translates to:
  /// **'ดาวที่ได้ตอนนี้ {stars} ดวง'**
  String liveStars(int stars);

  /// No description provided for @secondsShort.
  ///
  /// In th, this message translates to:
  /// **'{seconds}s'**
  String secondsShort(int seconds);

  /// No description provided for @reading.
  ///
  /// In th, this message translates to:
  /// **'📖 สาระความรู้'**
  String get reading;

  /// No description provided for @check.
  ///
  /// In th, this message translates to:
  /// **'ตรวจคำตอบ'**
  String get check;

  /// No description provided for @goOn.
  ///
  /// In th, this message translates to:
  /// **'ไปต่อ'**
  String get goOn;

  /// No description provided for @previous.
  ///
  /// In th, this message translates to:
  /// **'ย้อนกลับ'**
  String get previous;

  /// No description provided for @showAnswerGoOn.
  ///
  /// In th, this message translates to:
  /// **'💡 ดูเฉลย & ไปต่อ'**
  String get showAnswerGoOn;

  /// No description provided for @resetStep.
  ///
  /// In th, this message translates to:
  /// **'จัดใหม่'**
  String get resetStep;

  /// No description provided for @allStepsDone.
  ///
  /// In th, this message translates to:
  /// **'✓ ทำหัตถการครบทุกขั้นตอนแล้ว'**
  String get allStepsDone;

  /// No description provided for @leaveCase.
  ///
  /// In th, this message translates to:
  /// **'ออกจากเคส'**
  String get leaveCase;

  /// No description provided for @hintSequence.
  ///
  /// In th, this message translates to:
  /// **'แตะการ์ดเพื่อเติมช่องถัดไป · ลากเพื่อสลับตำแหน่ง · แตะการ์ดที่วางแล้วเพื่อเอาออก'**
  String get hintSequence;

  /// No description provided for @hintTrays.
  ///
  /// In th, this message translates to:
  /// **'แตะการ์ดแล้วแตะถาดที่ต้องการ · หรือกดค้างแล้วลากไปวาง · แตะการ์ดในถาดเพื่อเอาออก'**
  String get hintTrays;

  /// No description provided for @hintDropBox.
  ///
  /// In th, this message translates to:
  /// **'แตะหรือลากการ์ดที่ถูกต้องใส่กล่อง · แตะการ์ดในกล่องเพื่อเอาออก'**
  String get hintDropBox;

  /// No description provided for @poolEmpty.
  ///
  /// In th, this message translates to:
  /// **'วางครบทุกใบแล้ว 🎉'**
  String get poolEmpty;

  /// No description provided for @slotPlaceholder.
  ///
  /// In th, this message translates to:
  /// **'ลากการ์ดมาวางที่นี่'**
  String get slotPlaceholder;

  /// No description provided for @trayPlaceholder.
  ///
  /// In th, this message translates to:
  /// **'วางอุปกรณ์ในถาดนี้'**
  String get trayPlaceholder;

  /// No description provided for @dropBoxTitle.
  ///
  /// In th, this message translates to:
  /// **'กล่องปฏิบัติการพยาบาล'**
  String get dropBoxTitle;

  /// No description provided for @dropBoxPlaceholder.
  ///
  /// In th, this message translates to:
  /// **'วางการ์ดที่ถูกต้องที่นี่'**
  String get dropBoxPlaceholder;

  /// No description provided for @notReady.
  ///
  /// In th, this message translates to:
  /// **'ยังไม่ครบ: {reason}'**
  String notReady(String reason);

  /// No description provided for @notReadyOption.
  ///
  /// In th, this message translates to:
  /// **'เลือกตัวเลือกอย่างน้อย 1 ข้อ'**
  String get notReadyOption;

  /// No description provided for @notReadySlots.
  ///
  /// In th, this message translates to:
  /// **'วางการ์ดให้ครบทุกช่อง'**
  String get notReadySlots;

  /// No description provided for @notReadyPool.
  ///
  /// In th, this message translates to:
  /// **'หยิบอุปกรณ์ลงถาดให้ครบทุกชิ้น'**
  String get notReadyPool;

  /// No description provided for @notReadyDropBox.
  ///
  /// In th, this message translates to:
  /// **'เลือกให้ครบ {count} ข้อ'**
  String notReadyDropBox(int count);

  /// No description provided for @errorWrongOption.
  ///
  /// In th, this message translates to:
  /// **'มีข้อที่ไม่ควรเลือกอยู่ (ข้อสีแดง)'**
  String get errorWrongOption;

  /// No description provided for @errorMissingOptions.
  ///
  /// In th, this message translates to:
  /// **'ยังเลือกไม่ครบทุกข้อที่ต้องตรวจสอบ'**
  String get errorMissingOptions;

  /// No description provided for @errorSequence.
  ///
  /// In th, this message translates to:
  /// **'ลำดับบางข้อยังไม่ถูกต้อง (การ์ดสีแดงอยู่ผิดตำแหน่ง)'**
  String get errorSequence;

  /// No description provided for @errorTrayOrder.
  ///
  /// In th, this message translates to:
  /// **'ลำดับใน “{tray}” ยังไม่ถูกต้อง'**
  String errorTrayOrder(String tray);

  /// No description provided for @errorTrayWrong.
  ///
  /// In th, this message translates to:
  /// **'ใน “{tray}” มีอุปกรณ์อยู่ผิดถาด'**
  String errorTrayWrong(String tray);

  /// No description provided for @errorUnsafe.
  ///
  /// In th, this message translates to:
  /// **'มีการพยาบาลที่ไม่ปลอดภัยปนอยู่ (การ์ดสีแดง) ลองเอาออกแล้วเลือกใหม่'**
  String get errorUnsafe;

  /// No description provided for @errorTimeout.
  ///
  /// In th, this message translates to:
  /// **'จัดเตรียมอุปกรณ์ไม่ทันในเวลา 20 วินาที'**
  String get errorTimeout;

  /// No description provided for @praise1.
  ///
  /// In th, this message translates to:
  /// **'ยอดเยี่ยม!'**
  String get praise1;

  /// No description provided for @praise2.
  ///
  /// In th, this message translates to:
  /// **'เก่งมาก!'**
  String get praise2;

  /// No description provided for @praise3.
  ///
  /// In th, this message translates to:
  /// **'เป๊ะเลย!'**
  String get praise3;

  /// No description provided for @praise4.
  ///
  /// In th, this message translates to:
  /// **'สุดยอด!'**
  String get praise4;

  /// No description provided for @passedSub.
  ///
  /// In th, this message translates to:
  /// **'ผ่านขั้นตอนนี้แล้ว ถูกต้องตามหลักความปลอดภัย'**
  String get passedSub;

  /// No description provided for @failedTitle.
  ///
  /// In th, this message translates to:
  /// **'ยังไม่ถูกน้า (ครั้งที่ {strike}/3)'**
  String failedTitle(int strike);

  /// No description provided for @failedSub.
  ///
  /// In th, this message translates to:
  /// **'ลองดูจุดที่ขึ้นสีแดงอีกครั้ง'**
  String get failedSub;

  /// No description provided for @mercyTitle.
  ///
  /// In th, this message translates to:
  /// **'พยายามได้ดีมากแล้วจ้า!'**
  String get mercyTitle;

  /// No description provided for @mercySub.
  ///
  /// In th, this message translates to:
  /// **'ผิดครบ 3 ครั้งแล้ว สามารถดูเฉลยแล้วไปต่อได้เลยนะ'**
  String get mercySub;

  /// No description provided for @timeoutTitle.
  ///
  /// In th, this message translates to:
  /// **'หมดเวลา 20 วินาที! (ครั้งที่ {strike}/3)'**
  String timeoutTitle(int strike);

  /// No description provided for @timeoutSub.
  ///
  /// In th, this message translates to:
  /// **'การจัดเตรียมอุปกรณ์ในภาวะฉุกเฉินต้องรวดเร็วและแม่นยำ ลองใหม่อีกครั้งนะ'**
  String get timeoutSub;

  /// No description provided for @timeoutMercyTitle.
  ///
  /// In th, this message translates to:
  /// **'หมดเวลา 20 วินาที!'**
  String get timeoutMercyTitle;

  /// No description provided for @timeoutMercySub.
  ///
  /// In th, this message translates to:
  /// **'ผิด/หมดเวลาครบ 3 ครั้งแล้ว สามารถดูเฉลยแล้วไปต่อได้เลยนะ'**
  String get timeoutMercySub;

  /// No description provided for @answerTitle.
  ///
  /// In th, this message translates to:
  /// **'💡 เฉลยคำตอบที่ถูกต้อง'**
  String get answerTitle;

  /// No description provided for @answerSub.
  ///
  /// In th, this message translates to:
  /// **'ระบบได้จัดเรียงคำตอบที่ถูกต้องให้แล้ว ศึกษาแล้วกดไปต่อได้เลยจ้า'**
  String get answerSub;

  /// No description provided for @tryAgain.
  ///
  /// In th, this message translates to:
  /// **'ลองอีกครั้ง'**
  String get tryAgain;

  /// No description provided for @tryAgainTimed.
  ///
  /// In th, this message translates to:
  /// **'ลองอีกครั้ง (จับเวลา 20 วิ)'**
  String get tryAgainTimed;

  /// No description provided for @tryAgainShort.
  ///
  /// In th, this message translates to:
  /// **'ลองอีกที'**
  String get tryAgainShort;

  /// No description provided for @caseDone.
  ///
  /// In th, this message translates to:
  /// **'เสร็จสิ้นเคส!'**
  String get caseDone;

  /// No description provided for @caseDonePerfect.
  ///
  /// In th, this message translates to:
  /// **'สุดยอด! ตอบเป๊ะทุกข้อ ได้ครบ 3 ดาวเลย'**
  String get caseDonePerfect;

  /// No description provided for @caseDoneReplay.
  ///
  /// In th, this message translates to:
  /// **'ผ่านเคสสำเร็จ! ลองเล่นซ้ำเพื่อเก็บให้ครบ 3 ดาวนะ'**
  String get caseDoneReplay;

  /// No description provided for @nextBed.
  ///
  /// In th, this message translates to:
  /// **'เตียงถัดไป ▶'**
  String get nextBed;

  /// No description provided for @backToWard.
  ///
  /// In th, this message translates to:
  /// **'กลับวอร์ด'**
  String get backToWard;

  /// No description provided for @replayForStars.
  ///
  /// In th, this message translates to:
  /// **'เล่นซ้ำเก็บ 3 ดาว'**
  String get replayForStars;

  /// No description provided for @leaveTitle.
  ///
  /// In th, this message translates to:
  /// **'ออกจากเคสนี้?'**
  String get leaveTitle;

  /// No description provided for @leaveBody.
  ///
  /// In th, this message translates to:
  /// **'ความคืบหน้าในเคสนี้จะหายไป ต้องเริ่มใหม่ตั้งแต่ขั้นแรก'**
  String get leaveBody;

  /// No description provided for @cancel.
  ///
  /// In th, this message translates to:
  /// **'ยกเลิก'**
  String get cancel;

  /// No description provided for @wardTitle.
  ///
  /// In th, this message translates to:
  /// **'วอร์ดหัวใจ {count} เตียง'**
  String wardTitle(int count);

  /// No description provided for @wardHint.
  ///
  /// In th, this message translates to:
  /// **'แตะที่เตียงเพื่อเริ่มทำการพยาบาลและหัตถการ'**
  String get wardHint;

  /// No description provided for @startNow.
  ///
  /// In th, this message translates to:
  /// **'เริ่มเลย'**
  String get startNow;

  /// No description provided for @continuePlay.
  ///
  /// In th, this message translates to:
  /// **'เล่นต่อ'**
  String get continuePlay;

  /// No description provided for @bedPassed.
  ///
  /// In th, this message translates to:
  /// **'ผ่านแล้ว'**
  String get bedPassed;

  /// No description provided for @nurseStation.
  ///
  /// In th, this message translates to:
  /// **'เคาน์เตอร์พยาบาล'**
  String get nurseStation;

  /// No description provided for @passedOf.
  ///
  /// In th, this message translates to:
  /// **'ผ่านแล้ว {passed}/{total} เตียง'**
  String passedOf(int passed, int total);

  /// Ours: opens the answer sheets of every case (for the clinical reviewer and instructors).
  ///
  /// In th, this message translates to:
  /// **'📖 ชีทเฉลยเคส'**
  String get caseSheets;

  /// No description provided for @totalStars.
  ///
  /// In th, this message translates to:
  /// **'ดาวทั้งหมด {stars}/{max}'**
  String totalStars(int stars, int max);

  /// No description provided for @levelRank.
  ///
  /// In th, this message translates to:
  /// **'Lv.{level} · {rank}'**
  String levelRank(int level, String rank);

  /// No description provided for @caseDoneGained.
  ///
  /// In th, this message translates to:
  /// **'ผ่านเคสสำเร็จ! ลองเล่นซ้ำเพื่อเก็บให้ครบ 3 ดาวนะ (ได้ดาวเพิ่ม +{gained})'**
  String caseDoneGained(int gained);

  /// No description provided for @levelUp.
  ///
  /// In th, this message translates to:
  /// **'⬆️ เลื่อนระดับ! Lv.{level} · {rank}'**
  String levelUp(int level, String rank);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'เกี่ยวกับ'**
  String get about;

  /// Ours: list of the answer sheets.
  ///
  /// In th, this message translates to:
  /// **'ชีทเฉลยเคส'**
  String get sheetsTitle;

  /// No description provided for @sheetsIntro.
  ///
  /// In th, this message translates to:
  /// **'ทุกขั้นตอนพร้อมคำตอบที่ถูกต้อง สำหรับผู้ตรวจเนื้อหาทางคลินิกและอาจารย์'**
  String get sheetsIntro;

  /// No description provided for @sheetTitle.
  ///
  /// In th, this message translates to:
  /// **'ชีทเฉลย {bedCode}'**
  String sheetTitle(String bedCode);

  /// No description provided for @sheetCorrect.
  ///
  /// In th, this message translates to:
  /// **'ถูก'**
  String get sheetCorrect;

  /// No description provided for @sheetWrong.
  ///
  /// In th, this message translates to:
  /// **'ไม่ควรเลือก'**
  String get sheetWrong;

  /// No description provided for @sheetOrder.
  ///
  /// In th, this message translates to:
  /// **'ลำดับที่ถูกต้อง'**
  String get sheetOrder;

  /// No description provided for @sheetSafe.
  ///
  /// In th, this message translates to:
  /// **'ควรทำ'**
  String get sheetSafe;

  /// No description provided for @sheetUnsafe.
  ///
  /// In th, this message translates to:
  /// **'ไม่ควรทำ'**
  String get sheetUnsafe;

  /// No description provided for @sheetInOrder.
  ///
  /// In th, this message translates to:
  /// **'เรียงตามลำดับ'**
  String get sheetInOrder;

  /// No description provided for @sheetAnyOrder.
  ///
  /// In th, this message translates to:
  /// **'ไม่ต้องเรียงลำดับ'**
  String get sheetAnyOrder;

  /// No description provided for @sheetDoctor.
  ///
  /// In th, this message translates to:
  /// **'แพทย์'**
  String get sheetDoctor;

  /// No description provided for @sheetNote.
  ///
  /// In th, this message translates to:
  /// **'บันทึกทางคลินิก'**
  String get sheetNote;

  /// Ours: first-launch notice.
  ///
  /// In th, this message translates to:
  /// **'สำหรับการฝึกเท่านั้น'**
  String get noticeTitle;

  /// No description provided for @noticeBody.
  ///
  /// In th, this message translates to:
  /// **'เกมนี้ใช้ฝึกทักษะการพยาบาลผู้ป่วยวิกฤตเท่านั้น ไม่ใช่แนวทางเวชปฏิบัติ และห้ามใช้ประกอบการตัดสินใจดูแลผู้ป่วยจริง เนื้อหาทางคลินิกอยู่ระหว่างการตรวจทาน'**
  String get noticeBody;

  /// No description provided for @noticeOk.
  ///
  /// In th, this message translates to:
  /// **'เข้าใจแล้ว'**
  String get noticeOk;

  /// No description provided for @aboutVersion.
  ///
  /// In th, this message translates to:
  /// **'เวอร์ชัน {version} · build {build}'**
  String aboutVersion(String version, String build);

  /// No description provided for @aboutCases.
  ///
  /// In th, this message translates to:
  /// **'เคสและการออกแบบเกม: superxsiwa (A-WARD CCU)'**
  String get aboutCases;

  /// No description provided for @aboutClinical.
  ///
  /// In th, this message translates to:
  /// **'ตรวจทานเนื้อหาทางคลินิก: พยาบาลวิชาชีพ (อยู่ระหว่างตรวจทาน)'**
  String get aboutClinical;

  /// No description provided for @aboutBuiltBy.
  ///
  /// In th, this message translates to:
  /// **'พัฒนาแอป: ColabsCraft'**
  String get aboutBuiltBy;

  /// No description provided for @aboutOffline.
  ///
  /// In th, this message translates to:
  /// **'ทำงานออฟไลน์ ไม่ส่งข้อมูลใดๆ ออกจากเครื่อง ความก้าวหน้าเก็บไว้ในเครื่องนี้เท่านั้น'**
  String get aboutOffline;

  /// No description provided for @aboutLicenses.
  ///
  /// In th, this message translates to:
  /// **'สัญญาอนุญาตโอเพนซอร์ส'**
  String get aboutLicenses;

  /// No description provided for @settingsTitle.
  ///
  /// In th, this message translates to:
  /// **'ตั้งค่า'**
  String get settingsTitle;

  /// No description provided for @soundTitle.
  ///
  /// In th, this message translates to:
  /// **'🔊 เสียงเอฟเฟกต์'**
  String get soundTitle;

  /// No description provided for @soundSub.
  ///
  /// In th, this message translates to:
  /// **'เสียงตอนหยิบ วาง และผ่านด่าน'**
  String get soundSub;

  /// No description provided for @hapticsTitle.
  ///
  /// In th, this message translates to:
  /// **'📳 การสั่น'**
  String get hapticsTitle;

  /// No description provided for @hapticsSub.
  ///
  /// In th, this message translates to:
  /// **'สั่นเบาๆ เมื่อตอบถูก/ผิด (มือถือ)'**
  String get hapticsSub;

  /// No description provided for @resetTitle.
  ///
  /// In th, this message translates to:
  /// **'ล้างความก้าวหน้า'**
  String get resetTitle;

  /// No description provided for @resetConfirmTitle.
  ///
  /// In th, this message translates to:
  /// **'ล้างความก้าวหน้าทั้งหมด?'**
  String get resetConfirmTitle;

  /// No description provided for @resetConfirmBody.
  ///
  /// In th, this message translates to:
  /// **'ดาวและเตียงที่ผ่านแล้วจะหายไป ย้อนกลับไม่ได้'**
  String get resetConfirmBody;

  /// No description provided for @resetConfirm.
  ///
  /// In th, this message translates to:
  /// **'ล้างข้อมูล'**
  String get resetConfirm;

  /// No description provided for @resetDone.
  ///
  /// In th, this message translates to:
  /// **'ล้างความก้าวหน้าแล้ว'**
  String get resetDone;

  /// No description provided for @tabRoster.
  ///
  /// In th, this message translates to:
  /// **'ตารางเวร'**
  String get tabRoster;

  /// No description provided for @tabWard.
  ///
  /// In th, this message translates to:
  /// **'วอร์ด'**
  String get tabWard;

  /// No description provided for @rosterBadge.
  ///
  /// In th, this message translates to:
  /// **'📅 ปฏิทินเวรพยาบาล CCU'**
  String get rosterBadge;

  /// No description provided for @reroll.
  ///
  /// In th, this message translates to:
  /// **'🎲 สุ่มเวรใหม่'**
  String get reroll;

  /// No description provided for @rerolled.
  ///
  /// In th, this message translates to:
  /// **'สุ่มเวรใหม่ประจำเดือนแล้ว 🎲'**
  String get rerolled;

  /// No description provided for @rosterTitle.
  ///
  /// In th, this message translates to:
  /// **'ตารางเวรประจำเดือน'**
  String get rosterTitle;

  /// No description provided for @rosterHint.
  ///
  /// In th, this message translates to:
  /// **'ต้องเล่นผ่านเวรเรียงตามวัน (ช่องสีทองที่มีเครื่องหมาย ▶ เล่นวันนี้ได้) ปฏิบัติงานให้ครบเพื่อก้าวสู่วันถัดไป'**
  String get rosterHint;

  /// The part of rosterHint shown in gold.
  ///
  /// In th, this message translates to:
  /// **'▶ เล่นวันนี้ได้'**
  String get rosterHintMark;

  /// No description provided for @prevMonth.
  ///
  /// In th, this message translates to:
  /// **'เดือนก่อนหน้า'**
  String get prevMonth;

  /// No description provided for @nextMonth.
  ///
  /// In th, this message translates to:
  /// **'เดือนถัดไป'**
  String get nextMonth;

  /// No description provided for @dayLocked.
  ///
  /// In th, this message translates to:
  /// **'ยังเข้าเวรนี้ไม่ได้! กรุณาผ่านเวรวันที่ {day} ให้สำเร็จก่อน'**
  String dayLocked(int day);

  /// No description provided for @dayPlayable.
  ///
  /// In th, this message translates to:
  /// **'เล่นวันนี้ได้ (เวรปัจจุบัน)'**
  String get dayPlayable;

  /// No description provided for @dayDone.
  ///
  /// In th, this message translates to:
  /// **'ผ่านเวรนี้แล้ว'**
  String get dayDone;

  /// No description provided for @dayNotYet.
  ///
  /// In th, this message translates to:
  /// **'ยังไม่ถึงวันเข้าเวร'**
  String get dayNotYet;

  /// No description provided for @dayTitle.
  ///
  /// In th, this message translates to:
  /// **'วัน{weekday}ที่ {day} {month} {year}'**
  String dayTitle(String weekday, int day, String month, int year);

  /// No description provided for @myShiftToday.
  ///
  /// In th, this message translates to:
  /// **'เวรของคุณวันนี้: {shift}'**
  String myShiftToday(String shift);

  /// No description provided for @shiftPassed.
  ///
  /// In th, this message translates to:
  /// **'✓ ผ่านเวรนี้แล้ว'**
  String get shiftPassed;

  /// No description provided for @offName.
  ///
  /// In th, this message translates to:
  /// **'วันหยุดพักผ่อน (Off)'**
  String get offName;

  /// No description provided for @offTitle.
  ///
  /// In th, this message translates to:
  /// **'วันนี้เป็นวันหยุดของคุณ (Off)'**
  String get offTitle;

  /// No description provided for @offHint.
  ///
  /// In th, this message translates to:
  /// **'พักผ่อนให้เต็มที่ หรือเลือกดูเคสหัตถการในวอร์ดเพื่อทบทวนความรู้ได้เสมอ'**
  String get offHint;

  /// No description provided for @seeWholeWard.
  ///
  /// In th, this message translates to:
  /// **'ดูวอร์ดทั้งหมด'**
  String get seeWholeWard;

  /// No description provided for @yourShift.
  ///
  /// In th, this message translates to:
  /// **'เวรของคุณ'**
  String get yourShift;

  /// No description provided for @shiftMetaDone.
  ///
  /// In th, this message translates to:
  /// **'หัวหน้าเวร: {nurse} · คนไข้ในความรับผิดชอบ ({done}/{total} เคส)'**
  String shiftMetaDone(String nurse, int done, int total);

  /// Ours: the other shifts of the day, without a count.
  ///
  /// In th, this message translates to:
  /// **'หัวหน้าเวร: {nurse} · คนไข้ในความรับผิดชอบ {total} เคส'**
  String shiftMeta(String nurse, int total);

  /// No description provided for @bedNo.
  ///
  /// In th, this message translates to:
  /// **'เตียง {bed}'**
  String bedNo(String bed);

  /// No description provided for @enterShift.
  ///
  /// In th, this message translates to:
  /// **'เข้าวอร์ดเวรนี้'**
  String get enterShift;

  /// No description provided for @reviewShift.
  ///
  /// In th, this message translates to:
  /// **'ทบทวนวอร์ดเวรนี้'**
  String get reviewShift;

  /// No description provided for @pillMorning.
  ///
  /// In th, this message translates to:
  /// **'เช้า'**
  String get pillMorning;

  /// No description provided for @pillAfternoon.
  ///
  /// In th, this message translates to:
  /// **'บ่าย'**
  String get pillAfternoon;

  /// No description provided for @pillNight.
  ///
  /// In th, this message translates to:
  /// **'ดึก'**
  String get pillNight;

  /// No description provided for @pillOff.
  ///
  /// In th, this message translates to:
  /// **'OFF'**
  String get pillOff;

  /// No description provided for @dutyTitle.
  ///
  /// In th, this message translates to:
  /// **'ประจำการ: {shift}'**
  String dutyTitle(String shift);

  /// No description provided for @dutyBeds.
  ///
  /// In th, this message translates to:
  /// **'เน้นเตียงที่ได้รับมอบหมายในเวร ({beds})'**
  String dutyBeds(String beds);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'วันที่ {day}: ทำแล้ว {done}/{total} เคส'**
  String dutyToday(int day, int done, int total);

  /// No description provided for @showAllBeds.
  ///
  /// In th, this message translates to:
  /// **'แสดงทุกเตียง ✕'**
  String get showAllBeds;

  /// No description provided for @shiftCleared.
  ///
  /// In th, this message translates to:
  /// **'🎉 ยินดีด้วย! ปฏิบัติหน้าที่ครบใน{shift}แล้ว ปลดล็อกวันที่ {day} เรียบร้อย!'**
  String shiftCleared(String shift, int day);

  /// Ours: his message would name day 32.
  ///
  /// In th, this message translates to:
  /// **'🎉 ยินดีด้วย! ปฏิบัติหน้าที่ครบใน{shift}แล้ว ผ่านเวรครบทั้งเดือนแล้ว!'**
  String monthCleared(String shift);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'กลับตารางเวร'**
  String get backToRoster;

  /// No description provided for @tabProgress.
  ///
  /// In th, this message translates to:
  /// **'ความก้าวหน้า'**
  String get tabProgress;

  /// No description provided for @progressTitle.
  ///
  /// In th, this message translates to:
  /// **'ความก้าวหน้า & เป้าหมาย (Milestones)'**
  String get progressTitle;

  /// No description provided for @ringOf.
  ///
  /// In th, this message translates to:
  /// **'จาก {max} ดาวเตียง'**
  String ringOf(int max);

  /// No description provided for @progressHint.
  ///
  /// In th, this message translates to:
  /// **'ผ่านแล้ว {passed} / {total} เตียง · ดาวสะสมรวมทั้งหมด {grand} ⭐'**
  String progressHint(int passed, int total, int grand);

  /// No description provided for @statHours.
  ///
  /// In th, this message translates to:
  /// **'ชั่วโมงบิน CCU'**
  String get statHours;

  /// No description provided for @minutesShort.
  ///
  /// In th, this message translates to:
  /// **'{minutes} น.'**
  String minutesShort(int minutes);

  /// No description provided for @hoursShort.
  ///
  /// In th, this message translates to:
  /// **'{hours} ชม.'**
  String hoursShort(String hours);

  /// No description provided for @statCases.
  ///
  /// In th, this message translates to:
  /// **'หัตถการสำเร็จ'**
  String get statCases;

  /// No description provided for @timesCount.
  ///
  /// In th, this message translates to:
  /// **'{count} ครั้ง'**
  String timesCount(int count);

  /// No description provided for @statMilestones.
  ///
  /// In th, this message translates to:
  /// **'ดาว Milestone'**
  String get statMilestones;

  /// No description provided for @milestoneStarsOf.
  ///
  /// In th, this message translates to:
  /// **'{stars} / {max} ⭐'**
  String milestoneStarsOf(int stars, int max);

  /// No description provided for @goalsTitle.
  ///
  /// In th, this message translates to:
  /// **'🏆 เป้าหมายสะสมดาว (Goals & Milestones)'**
  String get goalsTitle;

  /// No description provided for @goalsSub.
  ///
  /// In th, this message translates to:
  /// **'ทำครบเงื่อนไขเพื่อรับดาวเพิ่ม'**
  String get goalsSub;

  /// No description provided for @goalNow.
  ///
  /// In th, this message translates to:
  /// **'ปัจจุบัน:'**
  String get goalNow;

  /// No description provided for @goalNext.
  ///
  /// In th, this message translates to:
  /// **'เป้าดาวถัดไป ({stars}⭐): {target}'**
  String goalNext(int stars, String target);

  /// No description provided for @goalMax.
  ///
  /// In th, this message translates to:
  /// **'✓ ได้ครบ 3 ดาวแล้ว!'**
  String get goalMax;

  /// No description provided for @hoursValue.
  ///
  /// In th, this message translates to:
  /// **'{hours} ชม. ({minutes} นาที)'**
  String hoursValue(String hours, int minutes);

  /// Ours: the screen reader label of his XP bar.
  ///
  /// In th, this message translates to:
  /// **'EXP สู่เลเวลถัดไป {percent}%'**
  String expBar(int percent);

  /// His '📁 จัดการเคสหัตถการ & ตารางคะแนน (Instructor Portal)', shortened: no scoreboard in v1.
  ///
  /// In th, this message translates to:
  /// **'📁 จัดการเคสหัตถการ'**
  String get casesTitle;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'ใช้เคสมาตรฐาน CCU {count} เตียง'**
  String casesShipped(int count);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'ใช้เคสที่นำเข้าจากไฟล์ {count} เคส'**
  String casesImported(int count);

  /// No description provided for @exportCases.
  ///
  /// In th, this message translates to:
  /// **'ส่งออกไฟล์ JSON'**
  String get exportCases;

  /// No description provided for @exported.
  ///
  /// In th, this message translates to:
  /// **'ดาวน์โหลดไฟล์ JSON เรียบร้อย 📤'**
  String get exported;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'ส่งออกไฟล์ไม่สำเร็จ'**
  String get exportFailed;

  /// No description provided for @importCases.
  ///
  /// In th, this message translates to:
  /// **'📥 นำเข้าไฟล์ JSON'**
  String get importCases;

  /// No description provided for @importBadTitle.
  ///
  /// In th, this message translates to:
  /// **'รูปแบบไฟล์ JSON ไม่ถูกต้อง'**
  String get importBadTitle;

  /// No description provided for @importReadError.
  ///
  /// In th, this message translates to:
  /// **'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON'**
  String get importReadError;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'แทนที่เคสทั้งหมด?'**
  String get importConfirmTitle;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'เคสในวอร์ดจะถูกแทนที่ด้วย {count} เคสจากไฟล์นี้ ดาวที่ได้แล้วยังอยู่ตามหมายเลขเตียง'**
  String importConfirmBody(int count);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'นำเข้า'**
  String get importConfirm;

  /// No description provided for @imported.
  ///
  /// In th, this message translates to:
  /// **'นำเข้าเคสสำเร็จทั้งหมด {count} เคส 🎉'**
  String imported(int count);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'และอีก {count} ข้อ'**
  String moreProblems(int count);

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'ปิด'**
  String get close;

  /// No description provided for @resetCases.
  ///
  /// In th, this message translates to:
  /// **'🔄 คืนค่าเคสตั้งต้น'**
  String get resetCases;

  /// No description provided for @resetCasesTitle.
  ///
  /// In th, this message translates to:
  /// **'คืนค่าเคสตั้งต้น?'**
  String get resetCasesTitle;

  /// No description provided for @resetCasesBody.
  ///
  /// In th, this message translates to:
  /// **'เคสทั้งหมดจะถูกรีเซ็ตกลับเป็น 8 เตียงมาตรฐานของ CCU'**
  String get resetCasesBody;

  /// No description provided for @resetCasesConfirm.
  ///
  /// In th, this message translates to:
  /// **'คืนค่าเริ่มต้น'**
  String get resetCasesConfirm;

  /// No description provided for @resetCasesDone.
  ///
  /// In th, this message translates to:
  /// **'คืนค่าเคสมาตรฐาน CCU เรียบร้อย 🔄'**
  String get resetCasesDone;

  /// His '📖 สาระความรู้' without the emoji: the chip draws a book icon.
  ///
  /// In th, this message translates to:
  /// **'สาระความรู้'**
  String get readingChip;

  /// Ours.
  ///
  /// In th, this message translates to:
  /// **'แตะเพื่ออ่าน'**
  String get tapToRead;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'💾 สำรองข้อมูล'**
  String get backupTitle;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'ดาว ตารางเวร เคสที่นำเข้า และการตั้งค่า รวมไว้ในไฟล์เดียว ใช้ย้ายไปเครื่องใหม่หรือหลังติดตั้งแอปใหม่'**
  String get backupSub;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'ส่งออกไฟล์สำรองข้อมูล'**
  String get exportBackup;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'บันทึกไฟล์สำรองข้อมูลเรียบร้อย 💾'**
  String get backupSaved;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'บันทึกไฟล์สำรองข้อมูลไม่สำเร็จ'**
  String get backupFailed;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'กู้คืนจากไฟล์สำรองข้อมูล'**
  String get restoreBackup;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'เกิดข้อผิดพลาดในการอ่านไฟล์'**
  String get restoreReadError;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'ใช้ไฟล์สำรองข้อมูลนี้ไม่ได้'**
  String get restoreBadTitle;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'กู้คืนข้อมูลจากไฟล์นี้?'**
  String get restoreConfirmTitle;

  /// Ours (#19). date: when the backup was made, as d/M/yyyy (Buddhist era) HH:mm.
  ///
  /// In th, this message translates to:
  /// **'ดาว ตารางเวร เคสที่นำเข้า และการตั้งค่าในเครื่องนี้ จะถูกแทนที่ด้วยข้อมูลในไฟล์ที่บันทึกเมื่อ {date} ย้อนกลับไม่ได้'**
  String restoreConfirmBody(String date);

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'กู้คืน'**
  String get restoreConfirm;

  /// Ours (#19).
  ///
  /// In th, this message translates to:
  /// **'กู้คืนข้อมูลเรียบร้อย ✅'**
  String get restored;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['th'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'th':
      return AppLocalizationsTh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
