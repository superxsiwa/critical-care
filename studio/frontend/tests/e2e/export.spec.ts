import { readFileSync } from 'node:fs';
import { expect, exampleJson, openDraft, test } from '../support/studio';

test('export refuses what the app would refuse, links to the case, then downloads the package', async ({
  page,
  studio,
}) => {
  await studio.importExample('valid/minimal.json'); // bed 9, ready
  const [bad] = await studio.importExample('invalid/rule-hr-zero.json'); // bed 9 again, hr 0
  await page.goto('/case-mg');
  await page.getByRole('button', { name: 'ส่งออกแพ็กเกจ' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('ยังส่งออกไม่ได้: แอปจะไม่รับไฟล์นี้');
  await expect(alert).toContainText('case 2 (bed 9): $.stageData[0].vitals.hr: must be above 0');
  await expect(alert).toContainText('bed 9 is in the file twice');

  // The line's link opens that draft; fix it there (another bed, a heart rate).
  await alert.getByRole('link', { name: 'เปิดเคสนี้' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/drafts/${bad}$`));
  await page.getByLabel('หมายเลขเตียง').fill('10');
  await page.getByRole('tab', { name: /^ขั้นที่ 1/ }).click();
  await page.getByLabel('HR (ครั้ง/นาที)').fill('90');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByText('บันทึกแล้ว (ฉบับที่ 2)')).toBeVisible();
  await page.getByRole('link', { name: '← รายการเคส' }).click();
  await expect(page.getByRole('row')).toHaveCount(3);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ส่งออกแพ็กเกจ' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^critical_care_cases_\d{4}-\d{2}-\d{2}\.json$/);
  const pkg = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(pkg.format).toBe('critical-care-cases');
  expect(pkg.version).toBe(1);
  expect(pkg.cases.map((c: { bedNum: number }) => c.bedNum)).toEqual([9, 10]);
  // The case the studio did not touch is exported as it came in.
  expect(pkg.cases[0]).toEqual(exampleJson('valid/minimal.json').cases[0]);

  // Round trip: the package is accepted again (the app's own check runs on export).
  const again = await studio.api('POST', '/api/import', JSON.stringify(pkg));
  expect(again.status).toBe(201);
});

test('the editor edits only what it is asked: an opened and saved case keeps its JSON', async ({
  page,
  studio,
}) => {
  const [id] = await studio.importExample('valid/package-two-beds.json');
  const before = await studio.api<{ case: unknown }>('GET', `/api/drafts/${id}`);
  await openDraft(page, id);
  // Type a letter and take it back: the case is unchanged, so there is nothing to save.
  const title = page.getByLabel('ชื่อเคสหัตถการ');
  const was = await title.inputValue();
  await title.fill(was + 'x');
  await title.fill(was);
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeDisabled();
  for (const n of [1, 2, 3, 4, 5, 6])
    await page.getByRole('tab', { name: new RegExp(`^ขั้นที่ ${n}`) }).click();
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeDisabled();
  const after = await studio.api<{ case: unknown; version: number }>('GET', `/api/drafts/${id}`);
  expect(after.body.case).toEqual(before.body.case);
});
