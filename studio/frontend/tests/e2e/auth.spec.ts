import { type Page } from '@playwright/test';
import { ADMIN, expect, openDraft, test } from '../support/studio';

async function signInHere(page: Page, username: string, password: string): Promise<void> {
  await page.getByLabel('ชื่อผู้ใช้').fill(username);
  await page.getByLabel('รหัสผ่าน').fill(password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
}

test.describe('signed out', () => {
  test.use({ signedIn: false });

  test('every page asks to sign in first, then goes on to it', async ({ page, studio }) => {
    const [id] = await studio.importExample('valid/minimal.json');
    await page.goto(`/drafts/${id}`);
    await expect(page).toHaveURL(new RegExp(`/signin\\?next=%2Fdrafts%2F${id}$`));
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ Case Studio' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'บัญชี' })).toBeHidden();

    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByText('ใส่ชื่อผู้ใช้')).toBeVisible();
    await signInHere(page, ADMIN.username, 'not-the-password');
    await expect(page.getByRole('alert')).toHaveText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    await expect(page.getByLabel('รหัสผ่าน')).toHaveValue('');

    await signInHere(page, ADMIN.username.toUpperCase(), ADMIN.password);
    await expect(page).toHaveURL(new RegExp(`/drafts/${id}$`));
    await expect(page.getByRole('navigation', { name: 'บัญชี' })).toContainText(ADMIN.name);

    // Signing out ends it: the pages ask again.
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/signin\?next=%2F$/);
  });

  test('a next= that leaves the site is not followed', async ({ page }) => {
    await page.goto('/signin?next=//evil.example/x');
    await signInHere(page, ADMIN.username, ADMIN.password);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });

  test('an admin adds an instructor, who works on the shared drafts but not on accounts', async ({
    page,
    browser,
    studio,
  }) => {
    const [id] = await studio.importExample('valid/minimal.json');
    await page.goto('/signin');
    await signInHere(page, ADMIN.username, ADMIN.password);
    await page.getByRole('link', { name: 'บัญชีผู้ใช้' }).click();
    const form = page.getByRole('region', { name: 'เพิ่มบัญชี' });
    await form.getByLabel('ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)').fill('anna b');
    await form.getByLabel('ชื่อ-นามสกุล').fill('อาจารย์แอนนา');
    await form.getByRole('button', { name: 'สุ่มรหัสผ่าน' }).click();
    await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
    await expect(form.getByText('ใช้ได้เฉพาะตัวอักษรอังกฤษ')).toBeVisible();
    await form.getByLabel('ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)').fill('anna');
    await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
    const handed = page.getByTestId('handed-password');
    await expect(handed).toHaveText(/^[a-z2-9]{14}$/);
    const password = (await handed.textContent())!;
    const row = page.getByRole('row', { name: /anna/ });
    await expect(row).toContainText('อาจารย์');
    await expect(row).toContainText('ใช้งาน');
    // The same username again (in other letters) is refused on its field.
    await form.getByLabel('ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)').fill('ANNA');
    await form.getByLabel('ชื่อ-นามสกุล').fill('อีกคน');
    await form.getByLabel('รหัสผ่านเริ่มต้น').fill('another-password-9');
    await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
    await expect(form.getByText('ชื่อผู้ใช้นี้มีคนใช้แล้ว')).toBeVisible();

    // Anna, in a browser of her own.
    const theirs = await browser.newContext({ baseURL: studio.url });
    const anna = await theirs.newPage();
    await anna.goto('/');
    await signInHere(anna, 'anna', password);
    await expect(anna.getByRole('navigation', { name: 'บัญชี' })).toContainText('อาจารย์แอนนา');
    await expect(anna.getByRole('link', { name: 'บัญชีผู้ใช้' })).toBeHidden();
    await anna.goto('/users');
    await expect(anna).toHaveURL(/\/$/);
    await openDraft(anna, id);
    await anna.getByLabel('ชื่อเคสหัตถการ').fill('แก้โดยแอนนา');
    await anna.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(anna.getByText('บันทึกแล้ว (ฉบับที่ 2)')).toBeVisible();
    await expect(anna.getByText('โดย อาจารย์แอนนา')).toBeVisible();

    // The admin's list says who saved it; then Anna's account is switched off.
    await page.goto('/');
    await expect(page.getByRole('row', { name: /แก้โดยแอนนา/ })).toContainText('โดย อาจารย์แอนนา');
    await page.getByRole('link', { name: 'บัญชีผู้ใช้' }).click();
    await page.getByRole('button', { name: 'ปิดบัญชี anna' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ปิดบัญชี' }).click();
    await expect(page.getByRole('row', { name: /anna/ })).toContainText('ปิดอยู่');
    // Her next request finds her signed out; signing in again is refused.
    await anna.getByLabel('ชื่อเคสหัตถการ').fill('อีกครั้ง');
    await anna.getByRole('button', { name: 'บันทึก', exact: true }).click();
    const dialog = anna.getByRole('dialog');
    await expect(dialog).toContainText('กรุณาเข้าสู่ระบบอีกครั้ง');
    await dialog.getByLabel('ชื่อผู้ใช้').fill('anna');
    await dialog.getByLabel('รหัสผ่าน').fill(password);
    await dialog.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('บัญชีนี้ถูกปิดอยู่ ติดต่อผู้ดูแลระบบ');
    await theirs.close();
  });
});

test('a session that ends mid-edit: sign in again over the page, the edit is kept and saved', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await page.getByLabel('ชื่อเคสหัตถการ').fill('ยังไม่ได้บันทึก');
  await page.context().clearCookies({ name: 'casestudio_session' });
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('กรุณาเข้าสู่ระบบอีกครั้ง');
  await dialog.getByLabel('ชื่อผู้ใช้').fill(ADMIN.username);
  await dialog.getByLabel('รหัสผ่าน').fill(ADMIN.password);
  await dialog.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('เข้าสู่ระบบแล้ว: ทำรายการเดิมอีกครั้ง')).toBeVisible();
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue('ยังไม่ได้บันทึก');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByText('บันทึกแล้ว (ฉบับที่ 2)')).toBeVisible();
  const d = await studio.api<{ case: { caseTitle: string } }>('GET', `/api/drafts/${id}`);
  expect(d.body.case.caseTitle).toBe('ยังไม่ได้บันทึก');
});

test("changing one's password: checked, and the other sessions end", async ({ page, studio }) => {
  const other = await studio.signIn(ADMIN.username, ADMIN.password);
  await page.goto('/');
  await page.getByRole('link', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  await page.getByLabel('รหัสผ่านปัจจุบัน').fill('wrong-current-1');
  await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('a-new-password-1');
  await page.getByLabel('รหัสผ่านใหม่อีกครั้ง').fill('a-new-password-2');
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  await expect(page.getByText('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')).toBeVisible();
  await page.getByLabel('รหัสผ่านใหม่อีกครั้ง').fill('a-new-password-1');
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  await expect(page.getByText('รหัสผ่านปัจจุบันไม่ถูกต้อง')).toBeVisible();
  await page.getByLabel('รหัสผ่านปัจจุบัน').fill(ADMIN.password);
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  await expect(page.getByText('เปลี่ยนรหัสผ่านแล้ว')).toBeVisible();
  expect((await other.api('GET', '/api/drafts')).status).toBe(401);
  // This session goes on.
  await page.getByRole('link', { name: 'Case Studio' }).click();
  await expect(page.getByText('ยังไม่มีเคส')).toBeVisible();
  await studio.signIn(ADMIN.username, 'a-new-password-1');
});
