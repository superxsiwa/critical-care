/** The on-screen words for the places in a case, for the problem list ("ขั้นที่ 2 › จัดถาด › การ์ด 3 › รูป"). */
const KEYS: Record<string, string> = {
  bedNum: 'หมายเลขเตียง',
  bedCode: 'ชื่อเตียง',
  patientName: 'ชื่อคนไข้',
  patientAge: 'อายุ',
  caseTitle: 'ชื่อเคสหัตถการ',
  dxBadge: 'ป้ายการวินิจฉัยโรค',
  status: 'สถานะเตียง',
  statusText: 'ข้อความสถานะ',
  doctorName: 'ชื่อแพทย์ผู้สั่งการ',
  doctorAvatar: 'อีโมจิแพทย์',
  stayDuration: 'ระยะเวลาใน CCU',
  clinicalNote: 'บันทึกทางคลินิก',
  stageData: 'ขั้นตอน',
  id: 'รหัส',
  name: 'ชื่อ',
  mechanic: 'รูปแบบกลไก',
  reading: 'เอกสารความรู้',
  doctorSpeech: 'คำพูดแพทย์',
  vitals: 'สัญญาณชีพ',
  hr: 'HR',
  bp: 'BP',
  spo2: 'SpO2',
  map: 'MAP',
  choices1toN: 'เลือกตัวเลือก',
  sequenceTask: 'เรียงลำดับ',
  traysTask: 'จัดถาด',
  unorderedDropTask: 'ลาก-วาง ไม่เป็นลำดับ',
  prompt: 'โจทย์คำสั่ง',
  options: 'ตัวเลือก',
  correct: 'ถูก',
  pool: 'การ์ด',
  text: 'ข้อความ',
  img: 'รูป',
  correctOrder: 'ลำดับที่ถูกต้อง',
  ordered: 'เรียงลำดับในถาด',
  trays: 'ถาด',
  sterile: 'ปลอดเชื้อ',
  expectedIds: 'คำตอบที่ถูก',
  expectedOrder: 'ลำดับในถาด',
};

/** Item words for a position in a list: the 3rd entry of pool is การ์ด 3. */
const ITEMS: Record<string, string> = {
  stageData: 'ขั้นที่',
  options: 'ตัวเลือก',
  pool: 'การ์ด',
  trays: 'ถาด',
};

export function describePath(path: string): string {
  const parts: string[] = [];
  let last = '';
  for (const m of path.matchAll(/\.([A-Za-z0-9_]+)|\[(\d+)\]/g)) {
    if (m[1] !== undefined) {
      last = m[1];
      // A list's own word is said by its entries (ขั้นที่ 2, not ขั้นตอน › ขั้นที่ 2).
      if (!ITEMS[last]) parts.push(KEYS[last] ?? last);
      else parts.push(ITEMS[last]);
    } else {
      const n = Number(m[2]) + 1;
      const item = ITEMS[last];
      if (item) parts[parts.length - 1] = `${item} ${n}`;
      else parts.push(`ข้อ ${n}`);
    }
  }
  return parts.length ? parts.join(' › ') : 'ทั้งเคส';
}

/** The step a path is in (0-based), or null for the case's own fields. */
export function stepOf(path: string): number | null {
  const m = /^\$\.stageData\[(\d+)\]/.exec(path);
  return m ? Number(m[1]) : null;
}
