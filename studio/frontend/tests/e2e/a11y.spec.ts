import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { ADMIN, expect, openDraft, test } from '../support/studio';

/** WCAG 2.1 A and AA, as axe checks them. */
async function violations(page: Page): Promise<string[]> {
  // Colours are measured once a transition (a toggle turning dark) has ended or was cancelled.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** Every page of the menu, by its path and its heading. */
const PAGES: [string, RegExp][] = [
  ['/', /^Board/],
  ['/case', /^คลังเคสจำลอง/],
  ['/equipment', /^คลังอุปกรณ์และยา/],
  ['/knowledge', /^คลังความรู้/],
  ['/case-mg', /^จัดการเคส/],
  ['/knowledge-mg', /^จัดการคลังความรู้/],
  ['/equipment-mg', /^จัดการอุปกรณ์และยา/],
];

test('every page of the menu passes axe, empty and with drafts', async ({ page, studio }) => {
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    expect(await violations(page), `${path} (empty)`).toEqual([]);
  }
  await studio.importExample('valid/package-two-beds.json');
  await studio.importExample('invalid/rule-hr-zero.json');
  for (const [path, heading] of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    if (['/', '/case', '/case-mg'].includes(path))
      await expect(page.getByText('ถอดสาย Femoral Sheath').first()).toBeVisible();
    expect(await violations(page), path).toEqual([]);
  }
  // The other views of the pages that have them.
  for (const [path, view] of [
    ['/case', 'มุมมองการ์ด'],
    ['/equipment', 'มุมมองรายการ'],
    ['/knowledge', 'มุมมองรายการ'],
    ['/knowledge', 'มุมมองการ์ด'],
  ]) {
    await page.goto(path);
    const button = page.getByRole('button', { name: view });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await violations(page), `${path} ${view}`).toEqual([]);
  }
});

test('the account menu and the profile pass axe; Escape closes them', async ({ page }) => {
  await page.goto('/');
  const account = page
    .getByRole('navigation', { name: 'บัญชี' })
    .getByRole('button', { name: ADMIN.name });
  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  expect(await violations(page), 'menu').toEqual([]);
  await page.keyboard.press('Escape');
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await expect(account).toBeFocused();

  await account.click();
  await page.getByRole('button', { name: 'โปรไฟล์' }).click();
  const dialog = page.getByRole('dialog', { name: 'ข้อมูลโปรไฟล์' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ปิด' }).first()).toBeFocused();
  expect(await violations(page), 'profile').toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('every tab of the editor passes axe, with problems shown', async ({ page, studio }) => {
  await studio.importExample('valid/package-two-beds.json');
  const [id] = await studio.importExample('invalid/rule-card-in-no-tray.json');
  await openDraft(page, id);
  const tabs = page.getByRole('tab');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
    expect(await violations(page), `tab ${i + 1}`).toEqual([]);
  }
  // The confirm dialog too.
  await page.getByRole('tab', { name: /^ขั้นที่ 1/ }).click();
  await page.getByRole('button', { name: 'ลบขั้นนี้' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('sign-in, accounts and password pass axe', async ({ page, browser, studio }) => {
  await studio.addUser('anna', 'อาจารย์แอนนา', 'anna-password-1');
  await page.goto('/users');
  await expect(page.getByRole('row')).toHaveCount(3);
  await page.getByRole('button', { name: 'เพิ่มบัญชี' }).click(); // the fields' errors shown
  await expect(page.getByText('ใส่ชื่อผู้ใช้')).toBeVisible();
  expect(await violations(page), 'accounts').toEqual([]);
  await page.goto('/password');
  await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  expect(await violations(page), 'password').toEqual([]);
  const out = await browser.newContext({ baseURL: studio.url });
  const signedOut = await out.newPage();
  await signedOut.goto('/');
  await signedOut.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
  await expect(signedOut.getByText('ใส่ชื่อผู้ใช้')).toBeVisible();
  expect(await violations(signedOut), 'sign-in').toEqual([]);
  await out.close();
});

test('the public pages open signed out, link each other and pass axe', async ({
  browser,
  studio,
}) => {
  const out = await browser.newContext({ baseURL: studio.url });
  const page = await out.newPage();
  await page.goto('/signin');
  await page.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' }).click();
  await expect(page).toHaveURL(/\/privacy\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'นโยบายความเป็นส่วนตัว' }),
  ).toBeVisible();
  expect(await violations(page), 'privacy').toEqual([]);
  await page.getByRole('link', { name: 'Case Studio' }).first().click();
  await expect(page).toHaveURL(/\/about\.html$/);
  expect(await violations(page), 'about').toEqual([]);
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await out.close();
});
