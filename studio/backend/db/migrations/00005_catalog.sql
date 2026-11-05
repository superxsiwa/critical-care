-- +goose Up
-- The equipment names and the knowledge articles authors read while writing cases (his pages
-- จัดการอุปกรณ์ and จัดการคลังความรู้, 2026-11-04), kept on the server instead of in the page. Both stay
-- in the studio: neither goes into the case package, and the app never sees them.
--
-- An equipment entry names one of the app's own pictures (the server's equipment list, checked on
-- every add), at most one entry per picture; its picture cannot change, only its names and category.
-- Ids are never given out again (AUTOINCREMENT), and version goes up with every change, so a page
-- still open on an old or deleted entry cannot save over someone else's, as with drafts.
CREATE TABLE equipment (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file       TEXT    NOT NULL UNIQUE,
    name_th    TEXT    NOT NULL,
    name_en    TEXT    NOT NULL DEFAULT '',
    category   TEXT    NOT NULL,
    version    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL,
    created_by INTEGER REFERENCES users (id),
    updated_by INTEGER REFERENCES users (id)
);

-- A knowledge article. Its text is clinical content where it says how to care for a patient (the
-- MAP article, for one): the clinical reviewer's to check, not the studio's.
CREATE TABLE knowledge (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    summary    TEXT    NOT NULL DEFAULT '',
    content    TEXT    NOT NULL DEFAULT '',
    version    INTEGER NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL,
    created_by INTEGER REFERENCES users (id),
    updated_by INTEGER REFERENCES users (id)
);

-- Seeded once, word for word from his pages' built-in lists (equipment-data.ts, knowledge-data.ts
-- of b9cc366), on the date he wrote them. Deleting every row later does not bring them back.
INSERT INTO equipment (file, name_th, name_en, category, version, created_at, updated_at) VALUES
    ('bp_monitor.png', 'เครื่องวัดความดันโลหิต', 'Blood Pressure Monitor', 'การติดตามสัญญาณชีพ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('ecg_monitor.png', 'จอมอนิเตอร์คลื่นไฟฟ้าหัวใจ', 'ECG Monitor', 'การติดตามสัญญาณชีพ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('first_aid_kit.png', 'กล่องปฐมพยาบาล', 'First Aid Kit', 'อุปกรณ์ทั่วไป', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('iv_bag.png', 'ถุงสารน้ำทางหลอดเลือดดำ', 'IV Infusion Bag', 'ยาและหัตถการ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('medical_chart.png', 'แฟ้มประวัติผู้ป่วย', 'Medical Chart', 'อุปกรณ์ทั่วไป', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('medicine_bottle.png', 'ขวดยา', 'Medicine Bottle', 'ยาและหัตถการ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('otoscope.png', 'เครื่องตรวจหู', 'Otoscope', 'การประเมินผู้ป่วย', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('oxygen_mask.png', 'หน้ากากให้ออกซิเจน', 'Oxygen Mask', 'ระบบทางเดินหายใจ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('penlight.png', 'ไฟฉายตรวจม่านตา', 'Penlight', 'การประเมินผู้ป่วย', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('pulse_oximeter.png', 'เครื่องวัดระดับออกซิเจนในเลือด', 'Pulse Oximeter', 'การติดตามสัญญาณชีพ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('reflex_hammer.png', 'ค้อนเคาะสะท้อน', 'Reflex Hammer', 'การประเมินผู้ป่วย', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('scissors_forceps.png', 'กรรไกรและคีมคีบปลอดเชื้อ', 'Scissors and Forceps', 'ยาและหัตถการ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('stethoscope.png', 'หูฟังแพทย์', 'Stethoscope', 'การประเมินผู้ป่วย', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('syringe.png', 'กระบอกฉีดยา', 'Syringe', 'ยาและหัตถการ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('thermometer_digital.png', 'เทอร์โมมิเตอร์ดิจิทัล', 'Digital Thermometer', 'การติดตามสัญญาณชีพ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('thermometer_glass.png', 'ปรอทวัดไข้ชนิดแก้ว', 'Glass Thermometer', 'การติดตามสัญญาณชีพ', 1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z');
INSERT INTO knowledge (title, category, summary, content, version, created_at, updated_at) VALUES
    ('โครงสร้างเคสมาตรฐาน 6 ขั้นตอนใน CCU', 'โครงสร้างเคส', 'แนวทางการออกแบบลำดับเวลา 6 ขั้นตอนตั้งแต่แรกรับจนถึงส่งเวร',
     'เคสผู้ป่วยวิกฤตในแอปแบ่งออกเป็น 6 ขั้นตอน: ขั้น 1 ประเมินแรกรับ, ขั้น 2 เตรียมความพร้อม, ขั้น 3 หัตถการฉุกเฉิน, ขั้น 4 ประเมินผลหลังทำ, ขั้น 5 ให้การรักษาต่อเนื่อง, ขั้น 6 สรุปและรายงาน ISBAR',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('กลไกภารกิจ Choices 1..N (การเลือกตัวเลือก)', 'กลไกภารกิจ', 'การตั้งโจทย์เลือกตัวเลือก สำหรับการวินิจฉัยและการตัดสินใจทางคลินิก',
     'ใช้สำหรับทดสอบการวินิจฉัยโรคเบื้องต้น การแปลผลคลื่นไฟฟ้าหัวใจ หรือการเลือกยาขนานแรก สามารถกำหนดตัวเลือกที่ถูกต้องได้มากกว่า 1 ข้อ เพื่อให้นักศึกษาฝึกคิดรอบด้าน',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('กลไกภารกิจ Sequence (เรียงลำดับขั้นตอนและ ISBAR)', 'กลไกภารกิจ', 'การฝึกปฏิบัติหัตถการตามลำดับขั้นตอนมาตรฐาน',
     'เหมาะสำหรับขั้นตอนการใส่ท่อช่วยหายใจ (Intubation Sequence) หรือการส่งเวรแบบ ISBAR การ์ดที่ไม่ได้ใส่ในคำตอบที่ถูกต้องจะทำหน้าที่เป็นตัวลวงเพื่อทดสอบความแม่นยำ',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('กลไกภารกิจ Multi-Tray (จัดอุปกรณ์ลงถาด)', 'กลไกภารกิจ', 'การฝึกเทคนิคปลอดเชื้อและการแยกประเภทอุปกรณ์ลงถาด',
     'เหมาะกับการจัดเตรียมเซ็ตหัตถการ เช่น ถาดปลอดเชื้อสำหรับทำหัตถการ และถาดอุปกรณ์ทั่วไป โดยอุปกรณ์ทุกชิ้นในการ์ดต้องมีถาดรองรับเพื่อผ่านเกณฑ์การตรวจสอบ',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('เกณฑ์การกำหนดสัญญาณชีพและการคำนวณ MAP', 'สัญญาณชีพ', 'สูตรการคำนวณ Mean Arterial Pressure และการตั้งค่า BP, SpO2',
     'MAP คำนวณจากสูตร (2*DBP + SBP) / 3 ค่าปกติอยู่ในช่วง 70-105 mmHg หากต่ำกว่า 65 mmHg บ่งชี้ถึงภาวะเนื้อเยื่อขาดเลือด ส่วน SpO2 ต้องระบุเป็นเปอร์เซ็นต์เสมอ',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z'),
    ('การรายงานสถานการณ์ผู้ป่วยแบบ ISBAR ในภาวะวิกฤต', 'การสื่อสาร', 'แบบแผนการสื่อสารที่มีประสิทธิภาพระหว่างพยาบาลและแพทย์',
     'I - Identify (ระบุตนเองและคนไข้), S - Situation (สถานการณ์ปัจจุบัน), B - Background (ประวัติที่เกี่ยวข้อง), A - Assessment (ผลการประเมิน), R - Recommendation (ข้อเสนอแนะ)',
     1, '2026-11-04T00:00:00Z', '2026-11-04T00:00:00Z');

-- +goose Down
DROP TABLE knowledge;
DROP TABLE equipment;
