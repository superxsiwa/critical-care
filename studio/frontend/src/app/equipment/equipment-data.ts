export interface EquipmentItem {
  file: string;
  nameTh: string;
  nameEn: string;
  category: string;
}

export const EQUIPMENT_CATALOG: Record<
  string,
  { nameTh: string; nameEn: string; category: string }
> = {
  'bp_monitor.png': {
    nameTh: 'เครื่องวัดความดันโลหิต',
    nameEn: 'Blood Pressure Monitor',
    category: 'การติดตามสัญญาณชีพ',
  },
  'ecg_monitor.png': {
    nameTh: 'จอมอนิเตอร์คลื่นไฟฟ้าหัวใจ',
    nameEn: 'ECG Monitor',
    category: 'การติดตามสัญญาณชีพ',
  },
  'pulse_oximeter.png': {
    nameTh: 'เครื่องวัดระดับออกซิเจนในเลือด',
    nameEn: 'Pulse Oximeter',
    category: 'การติดตามสัญญาณชีพ',
  },
  'thermometer_digital.png': {
    nameTh: 'เทอร์โมมิเตอร์ดิจิทัล',
    nameEn: 'Digital Thermometer',
    category: 'การติดตามสัญญาณชีพ',
  },
  'thermometer_glass.png': {
    nameTh: 'ปรอทวัดไข้ชนิดแก้ว',
    nameEn: 'Glass Thermometer',
    category: 'การติดตามสัญญาณชีพ',
  },
  'stethoscope.png': {
    nameTh: 'หูฟังแพทย์',
    nameEn: 'Stethoscope',
    category: 'การประเมินผู้ป่วย',
  },
  'penlight.png': {
    nameTh: 'ไฟฉายตรวจม่านตา',
    nameEn: 'Penlight',
    category: 'การประเมินผู้ป่วย',
  },
  'reflex_hammer.png': {
    nameTh: 'ค้อนเคาะสะท้อน',
    nameEn: 'Reflex Hammer',
    category: 'การประเมินผู้ป่วย',
  },
  'otoscope.png': {
    nameTh: 'เครื่องตรวจหู',
    nameEn: 'Otoscope',
    category: 'การประเมินผู้ป่วย',
  },
  'oxygen_mask.png': {
    nameTh: 'หน้ากากให้ออกซิเจน',
    nameEn: 'Oxygen Mask',
    category: 'ระบบทางเดินหายใจ',
  },
  'syringe.png': {
    nameTh: 'กระบอกฉีดยา',
    nameEn: 'Syringe',
    category: 'ยาและหัตถการ',
  },
  'iv_bag.png': {
    nameTh: 'ถุงสารน้ำทางหลอดเลือดดำ',
    nameEn: 'IV Infusion Bag',
    category: 'ยาและหัตถการ',
  },
  'medicine_bottle.png': {
    nameTh: 'ขวดยา',
    nameEn: 'Medicine Bottle',
    category: 'ยาและหัตถการ',
  },
  'scissors_forceps.png': {
    nameTh: 'กรรไกรและคีมคีบปลอดเชื้อ',
    nameEn: 'Scissors and Forceps',
    category: 'ยาและหัตถการ',
  },
  'first_aid_kit.png': {
    nameTh: 'กล่องปฐมพยาบาล',
    nameEn: 'First Aid Kit',
    category: 'อุปกรณ์ทั่วไป',
  },
  'medical_chart.png': {
    nameTh: 'แฟ้มประวัติผู้ป่วย',
    nameEn: 'Medical Chart',
    category: 'อุปกรณ์ทั่วไป',
  },
};
