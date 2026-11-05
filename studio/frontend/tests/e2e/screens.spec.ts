import { expect, openDraft, problemLines, test } from '../support/studio';

test('the Board counts the drafts and has a tile per bed that opens it', async ({
  page,
  studio,
}) => {
  await studio.importExample('valid/package-two-beds.json');
  const [bad] = await studio.importExample('invalid/rule-hr-zero.json'); // bed 9, hr 0
  await page.goto('/');
  const kpi = (label: string) => page.locator('.card', { hasText: label }).locator('p');
  await expect(kpi('เคสทั้งหมดในวอร์ด')).toHaveText(/^\s*3\s+เคส\s*$/);
  await expect(kpi('พร้อมส่งออก (Valid)')).toHaveText(/^\s*2\s+เคส\s*$/);
  await expect(kpi('ต้องตรวจสอบแก้ไข')).toHaveText(/^\s*1\s+เคส\s*$/);

  const beds = page.getByRole('region', { name: /ผังสถานะเตียง/ });
  await expect(beds.getByRole('link', { name: 'เปิดดู' })).toHaveCount(3);
  const tile = beds.locator('div.rounded-lg', { hasText: 'เตียง 9' });
  await expect(tile).toContainText('แก้ 1 จุด');
  await tile.getByRole('link', { name: 'เปิดดู' }).click();
  await expect(page).toHaveURL(new RegExp(`/drafts/${bad}$`));
});

test('the Case Library finds by title or bed and filters by readiness', async ({
  page,
  studio,
}) => {
  await studio.importExample('valid/package-two-beds.json');
  await studio.importExample('invalid/rule-hr-zero.json');
  await page.goto('/case');
  const rows = page.getByRole('row');
  await expect(rows).toHaveCount(4);
  await page.getByRole('searchbox', { name: 'ค้นหาเคส' }).fill('CVC');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText('CVC');
  await page.getByRole('searchbox', { name: 'ค้นหาเคส' }).fill('');
  await page.getByRole('button', { name: /^ต้องตรวจสอบ/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText('9');
  await page.getByRole('button', { name: 'มุมมองการ์ด' }).click();
  await expect(page.getByRole('link', { name: 'ดูรายละเอียดเคส' })).toHaveCount(1);
});

test('the bedside preview shows the open step', async ({ page, studio }) => {
  const [id] = await studio.importExample('valid/minimal.json'); // the same vitals in every step
  await openDraft(page, id);
  await page.getByRole('tab', { name: /^ขั้นที่ 2/ }).click();
  await page.getByLabel('HR (ครั้ง/นาที)').fill('111');
  await page.getByRole('button', { name: 'จำลองจอมอนิเตอร์' }).click();
  const monitor = page.locator('cs-bedside-preview');
  await expect(monitor).toContainText('111');
  await page.getByRole('tab', { name: /^ขั้นที่ 1/ }).click();
  await expect(monitor).toContainText('80');
  await expect(monitor).not.toContainText('111');
  await page.getByRole('tab', { name: 'ข้อมูลเคส' }).click(); // not a step: the first one
  await expect(monitor).toContainText('80');
  await page.getByRole('button', { name: 'ซ่อนจอมอนิเตอร์' }).click();
  await expect(monitor).toBeHidden();
});

test('the vitals helpers fill MAP from BP and add the % to SpO2, only when asked', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await page.getByRole('tab', { name: /^ขั้นที่ 1/ }).click();
  const map = page.getByLabel('MAP (mmHg)');
  await page.getByLabel('BP (mmHg)').fill('150/90');
  await expect(map).toHaveValue('93'); // nothing changes until the button is pressed
  await page.getByRole('button', { name: 'คำนวณ MAP จาก BP' }).click();
  await expect(map).toHaveValue('110'); // round((2 x 90 + 150) / 3)
  await page.getByLabel('BP (mmHg)').fill('150');
  await expect(page.getByRole('button', { name: 'คำนวณ MAP จาก BP' })).toBeHidden();

  const spo2 = page.getByLabel('SpO2');
  const addPercent = page.getByRole('button', { name: 'เติม % ให้อัตโนมัติ' });
  await expect(addPercent).toBeHidden();
  await spo2.fill('95');
  await addPercent.click();
  await expect(spo2).toHaveValue('95%');
  await expect(addPercent).toBeHidden();
});

test('a step is copied after itself, as a 7th step the rules then refuse', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await page.getByRole('tab', { name: /^ขั้นที่ 2/ }).click();
  await page.getByRole('button', { name: 'คัดลอกขั้นนี้' }).click();
  await expect(page.getByRole('tab')).toHaveCount(9); // the case, 7 steps, JSON
  await expect(page.getByRole('tab', { name: /^ขั้นที่ 3/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByLabel('ชื่อขั้นตอน')).toHaveValue('Step 2 (คัดลอก)');
  await expect.poll(() => problemLines(page)).toEqual(['$.stageData: has 7 steps, expected 6']);
});

test("a problem reads in Thai where there is a Thai wording, with the app's English after it", async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('invalid/rule-hr-zero.json');
  await openDraft(page, id);
  const list = page.getByRole('region', { name: /ต้องแก้ก่อนส่งออก/ });
  await expect(list.locator('li')).toHaveText(/ต้องมากกว่า 0 \(must be above 0\)/);
  await list.locator('li').getByRole('button').click();
  await expect(page.locator('.field-error')).toHaveText('ต้องมากกว่า 0 (must be above 0)');
});

test('an admin chooses the new account type: พยาบาล by default, or Admin', async ({ page }) => {
  await page.goto('/users');
  const form = page.getByRole('region', { name: 'เพิ่มบัญชี' });
  const type = form.getByRole('group', { name: 'ประเภทผู้ใช้' });
  await expect(type.getByRole('radio', { name: 'พยาบาล' })).toBeChecked();
  await type.getByRole('radio', { name: 'Admin' }).check();
  await form.getByLabel('ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)').fill('bee');
  await form.getByLabel('ชื่อ-นามสกุล').fill('ผู้ดูแลบี');
  await form.getByRole('button', { name: 'สุ่มรหัสผ่าน' }).click();
  await form.getByRole('button', { name: 'เพิ่มบัญชี' }).click();
  await expect(page.getByRole('row', { name: /bee/ })).toContainText('Admin');
});
