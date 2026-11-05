import AxeBuilder from '@axe-core/playwright';
import { ADMIN, expect, openDraft, test } from '../support/studio';

// Every test studio has Google sign-in on, pointed at a fake Google (tests/support/fake-google.ts)
// that answers at once as the person the test chose.

test.describe('signed out', () => {
  test.use({ signedIn: false });

  test('Google is the first way in: the account with that email goes on to the page asked for', async ({
    page,
    studio,
  }) => {
    const [id] = await studio.importExample('valid/minimal.json');
    await page.goto(`/drafts/${id}`);
    await expect(page).toHaveURL(/\/signin\?next=/);
    studio.google.as({ sub: 'g-admin', email: ADMIN.email.toUpperCase() });
    await page.getByRole('link', { name: 'ลงชื่อเข้าใช้ด้วย Google' }).click();
    await expect(page).toHaveURL(new RegExp(`/drafts/${id}$`));
    await expect(page.getByRole('navigation', { name: 'บัญชี' })).toContainText(ADMIN.name);
    await page.goto('/users');
    await expect(page.getByRole('row', { name: /^admin/ })).toContainText('Google ผูกแล้ว');
  });

  test('a Google sign-in that is refused says why in Thai; the password still works', async ({
    page,
    studio,
  }) => {
    await page.goto('/signin');
    const google = page.getByRole('link', { name: 'ลงชื่อเข้าใช้ด้วย Google' });
    const alert = page.getByRole('alert');

    studio.google.as({ sub: 'g-x', email: 'stranger@example.com' });
    await google.click();
    await expect(page).toHaveURL(/\/signin\?google=no-account$/);
    await expect(alert).toHaveText(/ยังไม่มีบัญชีสำหรับอีเมล Google นี้/);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);

    studio.google.as({ sub: 'g-admin', email: ADMIN.email, deny: true });
    await google.click();
    await expect(alert).toHaveText(/ยกเลิกการเข้าสู่ระบบด้วย Google แล้ว/);

    studio.google.as({ sub: 'g-admin', email: ADMIN.email, verified: false });
    await google.click();
    await expect(alert).toHaveText(/Google ยังไม่ได้ยืนยันอีเมล/);

    await page.getByLabel('ชื่อผู้ใช้').fill(ADMIN.username);
    await page.getByLabel('รหัสผ่าน').fill(ADMIN.password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Board/);
  });
});

test('an admin adds a Google-only account; signed in with Google, the person sets a fallback password', async ({
  page,
  browser,
  studio,
}) => {
  await page.goto('/users');
  const form = page.getByRole('region', { name: 'เพิ่มบัญชี' });
  await form.getByLabel('ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)').fill('nok');
  await form.getByLabel('ชื่อ-นามสกุล').fill('พยาบาลนก');
  await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
  // Neither an email nor a password: no way in.
  await expect(form.getByText('ใส่อีเมล Google หรือรหัสผ่าน')).toBeVisible();
  await form.getByLabel('อีเมล Google').fill('Nok@Example.com');
  await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
  const row = page.getByRole('row', { name: /^nok/ });
  const signsIn = row.getByRole('cell').nth(2); // "เข้าสู่ระบบด้วย"
  await expect(signsIn).toContainText('nok@example.com');
  await expect(signsIn).toContainText('Google รอเข้าครั้งแรก');
  await expect(signsIn).not.toContainText('รหัสผ่าน');
  await expect(page.getByTestId('handed-password')).toHaveCount(0); // no password to hand over

  // Nok, in a browser of her own: Google, then a fallback password without a current one.
  const theirs = await browser.newContext({ baseURL: studio.url });
  const nok = await theirs.newPage();
  studio.google.as({ sub: 'g-nok', email: 'nok@example.com' });
  await nok.goto('/password');
  await nok.getByRole('link', { name: 'ลงชื่อเข้าใช้ด้วย Google' }).click();
  await expect(nok).toHaveURL(/\/password$/);
  await expect(nok.getByRole('heading', { name: 'ตั้งรหัสผ่านสำรอง' })).toBeVisible();
  await expect(nok.getByLabel('รหัสผ่านปัจจุบัน')).toHaveCount(0);
  await nok.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('nok-fallback-1');
  await nok.getByLabel('รหัสผ่านใหม่อีกครั้ง').fill('nok-fallback-1');
  await nok.getByRole('button', { name: 'ตั้งรหัสผ่าน' }).click();
  await expect(nok.getByText('ตั้งรหัสผ่านสำรองแล้ว')).toBeVisible();
  await expect(nok.getByRole('heading', { name: 'เปลี่ยนรหัสผ่าน' })).toBeVisible();
  await theirs.close();
  await studio.signIn('nok', 'nok-fallback-1');

  await page.reload();
  await expect(signsIn).toContainText('Google ผูกแล้ว');
  await expect(signsIn).toContainText('รหัสผ่าน');
  // Her Google account was replaced: untie it; the next Google sign-in ties again by the email.
  await page.getByRole('button', { name: 'ยกเลิกการผูก Google nok' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ยกเลิกการผูก' }).click();
  await expect(signsIn).toContainText('Google รอเข้าครั้งแรก');
  // A new email, typed in the row.
  await page.getByRole('button', { name: 'แก้อีเมล Google nok' }).click();
  await page.getByRole('textbox', { name: 'อีเมล Google ของ nok' }).fill('nok@hospital.example');
  await row.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(signsIn).toContainText('nok@hospital.example');
});

test('a session that ends mid-edit: Google in a popup signs in again and the edit is kept', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await page.getByLabel('ชื่อเคสหัตถการ').fill('แก้ไว้ก่อน');
  await page.context().clearCookies({ name: 'casestudio_session' });
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('กรุณาเข้าสู่ระบบอีกครั้ง');

  studio.google.as({ sub: 'g-admin', email: ADMIN.email });
  const opened = page.waitForEvent('popup');
  await dialog.getByRole('button', { name: 'ลงชื่อเข้าใช้ด้วย Google' }).click();
  const popup = await opened;
  await popup.waitForEvent('close'); // its last page tells this page, then closes itself
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue('แก้ไว้ก่อน');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByText('บันทึกแล้ว (ฉบับที่ 2)')).toBeVisible();
});
