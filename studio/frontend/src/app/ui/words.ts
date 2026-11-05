import { ApiError } from '../api/studio-api';

/** The server's refusal codes in the screen's words. Problem texts of a case stay the server's. */
const REFUSALS: Record<string, string> = {
  'signed-out': 'กรุณาเข้าสู่ระบบ',
  wrong: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  inactive: 'บัญชีนี้ถูกปิดอยู่ ติดต่อผู้ดูแลระบบ',
  'admin-only': 'เฉพาะผู้ดูแลระบบเท่านั้น',
  csrf: 'คำขอนี้ไม่ได้มาจากหน้าของสตูดิโอ: โหลดหน้าใหม่แล้วลองอีกครั้ง',
  'password-short': 'รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร',
  'password-long': 'รหัสผ่านยาวได้ไม่เกิน 128 ตัวอักษร',
  'password-blank': 'รหัสผ่านต้องไม่เป็นช่องว่างทั้งหมด',
  'password-username': 'รหัสผ่านต้องไม่เหมือนชื่อผู้ใช้',
  'password-common': 'รหัสผ่านนี้คนใช้กันทั่วไป เลือกรหัสอื่น',
  'username-bad': 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีด และขีดล่าง 2 ถึง 40 ตัว',
  'username-taken': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว',
  'name-blank': 'ใส่ชื่อของเจ้าของบัญชี',
  self: 'ปิดบัญชีหรือสิทธิ์ผู้ดูแลของตัวเองไม่ได้',
  'last-admin': 'ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน',
  'not-found': 'ไม่พบรายการนี้',
  'email-bad': 'อีเมลนี้ไม่ถูกต้อง',
  'email-taken': 'บัญชีอื่นใช้อีเมลนี้แล้ว',
  'no-sign-in': 'ใส่อีเมล Google หรือรหัสผ่าน อย่างน้อยอย่างหนึ่ง เพื่อให้เข้าสู่ระบบได้',
};

/** Why a Google sign-in was refused (the server's /signin?google=<code>), in the screen's words. */
export const GOOGLE_REFUSALS: Record<string, string> = {
  cancelled: 'ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว',
  expired: 'การเข้าสู่ระบบด้วย Google หมดเวลา ลองอีกครั้ง',
  failed: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองอีกครั้ง',
  unavailable: 'ติดต่อ Google ไม่ได้ในขณะนี้ ลองอีกครั้ง หรือใช้รหัสผ่าน',
  unverified: 'Google ยังไม่ได้ยืนยันอีเมลของบัญชี Google นี้',
  'no-account': 'ยังไม่มีบัญชีสำหรับอีเมล Google นี้ ขอให้ Admin ใส่อีเมลนี้ในบัญชีของคุณ',
  'other-google': 'บัญชีที่มีอีเมลนี้ผูกกับบัญชี Google อื่นอยู่แล้ว ขอให้ Admin ยกเลิกการผูกก่อน',
  inactive: 'บัญชีนี้ถูกปิดอยู่ ติดต่อ Admin',
  'popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างของ Google: อนุญาตป๊อปอัปของหน้านี้แล้วลองอีกครั้ง',
};

/** A refusal in words: Thai for the codes the screen knows, the server's own text otherwise. */
export function failure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    if (e.code === 'throttled')
      return `ใส่รหัสผ่านผิดหลายครั้ง ลองใหม่ในอีก ${e.body.minutes ?? 15} นาที`;
    return REFUSALS[e.code] ?? e.body.detail;
  }
  return String(e);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
