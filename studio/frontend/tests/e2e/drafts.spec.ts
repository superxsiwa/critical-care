import { example, expect, openDraft, problemLines, test } from '../support/studio';

test('an empty studio says how to start', async ({ page }) => {
  await page.goto('/case-mg');
  await expect(page.getByText('ยังไม่มีเคสในระบบ')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ส่งออกแพ็กเกจ' })).toBeDisabled();
});

test('a new draft is blank, lists everything left to write, and is saved with its version', async ({
  page,
  studio,
}) => {
  await page.goto('/case-mg');
  await page.getByRole('button', { name: '+ เคสใหม่' }).click();
  await expect(page).toHaveURL(/\/drafts\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('เตียง 1');
  // The rules name every empty field of the case and of its 6 steps at once.
  const lines = await problemLines(page);
  expect(lines).toContain('$.caseTitle: is empty');
  expect(lines).toContain('$.stageData[5]: has no task');
  expect(lines).toContain('$.stageData[0].vitals.hr: must be above 0');
  await expect(page.getByRole('tab')).toHaveCount(8); // the case, 6 steps, JSON

  await page.getByLabel('ชื่อเคสหัตถการ').fill('เคสทดสอบ');
  await expect(page.getByText('มีการแก้ไขที่ยังไม่บันทึก')).toBeVisible();
  // Checked as typed, before any save.
  await expect.poll(() => problemLines(page)).not.toContain('$.caseTitle: is empty');
  await page.keyboard.press('Control+s');
  await expect(page.getByText('บันทึกแล้ว (ฉบับที่ 2)')).toBeVisible();
  await expect(page.getByText('มีการแก้ไขที่ยังไม่บันทึก')).toBeHidden();

  const list = await studio.api<{ caseTitle: string; version: number }[]>('GET', '/api/drafts');
  expect(list.body).toEqual([expect.objectContaining({ caseTitle: 'เคสทดสอบ', version: 2 })]);
  await page.getByRole('link', { name: '← รายการเคส' }).click();
  await expect(page).toHaveURL(/\/case-mg$/);
  const row = page.getByRole('row', { name: /เคสทดสอบ/ });
  await expect(row).toContainText('ฉบับที่ 2');
  await expect(row).toContainText(/ต้องแก้ \d+ ข้อ/);
});

test('import a file through the browser, copy a draft, delete one', async ({ page, studio }) => {
  await page.goto('/case-mg');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'นำเข้าไฟล์ JSON' }).click();
  await (await chooser).setFiles(example('valid/package-two-beds.json'));
  await expect(page.getByText('นำเข้าสำเร็จ 2 เคส')).toBeVisible();
  const rows = page.getByRole('row');
  await expect(rows).toHaveCount(3); // the header and 2 beds, in bed order
  await expect(rows.nth(1)).toContainText('ถอดสาย Femoral Sheath');
  await expect(rows.nth(1)).toContainText('พร้อมส่งออก');

  // A copy goes on the next bed and opens for editing.
  await page.getByRole('button', { name: /^ทำสำเนา เตียง 1/ }).click();
  await expect(page.getByText('คัดลอกเป็นเตียง 3 แล้ว')).toBeVisible();
  await expect(page).toHaveURL(/\/drafts\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('เตียง 3');
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue(/\(สำเนา\)$/);
  await page.getByRole('link', { name: '← รายการเคส' }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3)).toContainText('3');

  await page.getByRole('button', { name: /^ลบ เตียง 3/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('ไม่สามารถกู้คืนได้');
  await dialog.getByRole('button', { name: 'ลบเคส' }).click();
  await expect(rows).toHaveCount(3);
  const list = await studio.api<unknown[]>('GET', '/api/drafts');
  expect(list.body).toHaveLength(2);
});

test('a file the app would refuse is not imported, and says why', async ({ page, studio }) => {
  await page.goto('/case-mg');
  for (const [file, line] of [
    ['invalid/backup-file.json', 'backup'],
    ['invalid/newer-version.json', 'update the app first'],
  ]) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'นำเข้าไฟล์ JSON' }).click();
    await (await chooser).setFiles(example(file));
    const alert = page.getByRole('alert');
    await expect(alert).toContainText(`นำเข้า ${file.split('/')[1]} ไม่ได้`);
    await expect(alert).toContainText(line);
  }
  expect((await studio.api<unknown[]>('GET', '/api/drafts')).body).toEqual([]);
});

test('someone else saved since: the save is refused and the latest version can be loaded', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  // Another instructor saves the same draft first.
  const theirs = await studio.api<{ case: Record<string, unknown> }>('GET', `/api/drafts/${id}`);
  const saved = await studio.api('PUT', `/api/drafts/${id}`, {
    version: 1,
    case: { ...theirs.body.case, caseTitle: 'ของอีกคน' },
  });
  expect(saved.status).toBe(200);

  await page.getByLabel('ชื่อเคสหัตถการ').fill('ของฉัน');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  const banner = page.getByRole('alert');
  await expect(banner).toContainText('มีผู้อื่นบันทึกเคสนี้หลังจากที่คุณเปิด');
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeDisabled();

  await banner.getByRole('button', { name: 'โหลดฉบับล่าสุด' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'โหลดฉบับล่าสุด' }).click();
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue('ของอีกคน');
  await expect(page.getByText('ฉบับที่ 2 ·')).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();
});

test('a draft deleted while open can be saved as a new one', async ({ page, studio }) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  expect((await studio.api('DELETE', `/api/drafts/${id}?version=1`)).status).toBe(204);
  await page.getByLabel('ชื่อเคสหัตถการ').fill('ยังอยู่');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await page.getByRole('alert').getByRole('button', { name: 'บันทึกเป็นเคสใหม่' }).click();
  await expect(page).not.toHaveURL(new RegExp(`/drafts/${id}$`));
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue('ยังอยู่');
  const list = await studio.api<{ caseTitle: string }[]>('GET', '/api/drafts');
  expect(list.body.map((d) => d.caseTitle)).toEqual(['ยังอยู่']);
});

test('leaving with unsaved changes asks first', async ({ page, studio }) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await page.getByLabel('ชื่อเคสหัตถการ').fill('ยังไม่บันทึก');
  await page.getByRole('link', { name: '← รายการเคส' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('ออกโดยไม่บันทึก?');
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(page).toHaveURL(new RegExp(`/drafts/${id}$`));
  await expect(page.getByLabel('ชื่อเคสหัตถการ')).toHaveValue('ยังไม่บันทึก');

  await page.getByRole('link', { name: '← รายการเคส' }).click();
  await dialog.getByRole('button', { name: 'ออกโดยไม่บันทึก' }).click();
  await expect(page).toHaveURL(/\/case-mg$/);
  const list = await studio.api<{ caseTitle: string }[]>('GET', '/api/drafts');
  expect(list.body[0].caseTitle).not.toBe('ยังไม่บันทึก');
});
