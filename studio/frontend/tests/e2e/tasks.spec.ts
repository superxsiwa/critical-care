import { type Page } from '@playwright/test';
import { blankCase } from '../../src/app/case/blank';
import { expect, openDraft, problemLines, test } from '../support/studio';

/** The saved case, read back from the server. */
async function saved(
  studio: { api: <T>(m: string, p: string) => Promise<{ body: T }> },
  id: number,
) {
  const r = await studio.api<{ case: Record<string, any> }>('GET', `/api/drafts/${id}`);
  return r.body.case;
}

async function save(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByText(/บันทึกแล้ว \(ฉบับที่ \d+\)/).last()).toBeVisible();
}

test('a step built from nothing: choices, then a sequence with its order', async ({
  page,
  studio,
}) => {
  const created = await studio.api<{ id: number }>('POST', '/api/drafts', {
    case: blankCase(4, 6),
  });
  const id = created.body.id;
  await openDraft(page, id);
  await page.getByRole('tab', { name: /ขั้นที่ 1/ }).click();
  const panel = page.getByRole('tabpanel');

  await panel.getByRole('button', { name: '+ เลือกตัวเลือก (Choices 1..N)' }).click();
  const choices = panel.getByRole('region', { name: 'เลือกตัวเลือก (Choices 1..N)' });
  await expect
    .poll(() => problemLines(page))
    .toContain('$.stageData[0].choices1toN.options: is empty');
  await choices.getByRole('button', { name: '+ เพิ่มตัวเลือก' }).click();
  await choices.getByRole('button', { name: '+ เพิ่มตัวเลือก' }).click();
  await choices.getByLabel('ข้อความตัวเลือก').nth(0).fill('ตัวเลือกแรก');
  await choices.getByLabel('ข้อความตัวเลือก').nth(1).fill('ตัวเลือกที่สอง');
  await expect
    .poll(() => problemLines(page))
    .toContain('$.stageData[0].choices1toN.options: has no correct option');
  await choices.getByLabel('ถูก').nth(1).check();
  await expect
    .poll(() => problemLines(page))
    .not.toContain('$.stageData[0].choices1toN.options: has no correct option');

  // With choices, one pool task more: the sequence. The other pool tasks are then not offered.
  await panel.getByRole('button', { name: '+ ลาก-วาง เรียงลำดับ / ISBAR (Sequence)' }).click();
  await expect(panel.getByRole('button', { name: /Multi-Tray/ })).toBeHidden();
  const seq = panel.getByRole('region', { name: 'ลาก-วาง เรียงลำดับ / ISBAR (Sequence)' });
  for (let i = 0; i < 3; i++) await seq.getByRole('button', { name: '+ เพิ่มการ์ด' }).click();
  const texts = seq.getByRole('textbox', { name: 'ข้อความ', exact: true });
  await texts.nth(0).fill('ขั้น ก');
  await texts.nth(1).fill('ขั้น ข');
  await texts.nth(2).fill('ขั้น ค');
  const add = seq.getByLabel('เพิ่มการ์ดใน ลำดับที่ถูกต้อง');
  await add.selectOption({ label: 's3 · ขั้น ค' });
  await add.selectOption({ label: 's1 · ขั้น ก' });
  await add.selectOption({ label: 's2 · ขั้น ข' });
  await seq.getByRole('button', { name: 'เลื่อนข้อ 2 ขึ้น' }).click(); // s1 first
  await expect(seq.getByText('ลำดับที่ 1')).toBeVisible();

  // Renaming a card's id renames it in the order too.
  await seq.getByLabel('รหัส').nth(0).fill('first');
  await save(page);
  const c = await saved(studio, id);
  const step = c['stageData'][0];
  expect(step.choices1toN.options).toEqual([
    { id: 'c1', text: 'ตัวเลือกแรก', correct: false },
    { id: 'c2', text: 'ตัวเลือกที่สอง', correct: true },
  ]);
  expect(step.sequenceTask.pool.map((p: { id: string }) => p.id)).toEqual(['first', 's2', 's3']);
  expect(step.sequenceTask.correctOrder).toEqual(['first', 's3', 's2']);
});

test('trays: cards go in one tray each, ordered moves each list to expectedOrder, pictures', async ({
  page,
  studio,
}) => {
  const created = await studio.api<{ id: number }>('POST', '/api/drafts', {
    case: blankCase(5, 6),
  });
  const id = created.body.id;
  await openDraft(page, id);
  await page.getByRole('tab', { name: /ขั้นที่ 1/ }).click();
  const panel = page.getByRole('tabpanel');
  await panel.getByRole('button', { name: '+ จัดอุปกรณ์ลงถาด (Multi-Tray)' }).click();
  const trays = panel.getByRole('region', { name: 'จัดอุปกรณ์ลงถาด (Multi-Tray)' });
  await trays.getByRole('button', { name: '+ เพิ่มถาด' }).click();
  await trays.getByRole('button', { name: '+ เพิ่มถาด' }).click();
  for (let i = 0; i < 3; i++) await trays.getByRole('button', { name: '+ เพิ่มการ์ด' }).click();
  const texts = trays.getByRole('textbox', { name: 'ข้อความ', exact: true });
  await texts.nth(0).fill('กรรไกร');
  await texts.nth(1).fill('เข็มฉีดยา');
  await texts.nth(2).fill('ก๊อซ');
  await trays.getByLabel('รูปอุปกรณ์').nth(1).selectOption('syringe.png');
  await expect(trays.locator('img[src="equipment/syringe.png"]')).toBeVisible();
  await expect
    .poll(() => problemLines(page))
    .toContain(
      '$.stageData[0].traysTask.pool: "e1" belongs in no tray, so the step cannot be passed',
    );

  const tray1 = trays.getByRole('region', { name: 'ถาด 1' });
  const tray2 = trays.getByRole('region', { name: 'ถาด 2' });
  await tray1.getByLabel('เพิ่มการ์ดใน การ์ดในถาดนี้').selectOption('e1');
  await tray1.getByLabel('เพิ่มการ์ดใน การ์ดในถาดนี้').selectOption('e3');
  // A card already in tray 1 is not offered for tray 2.
  const offer2 = tray2.getByLabel('เพิ่มการ์ดใน การ์ดในถาดนี้');
  await expect(offer2.locator('option')).toHaveText(['+ เพิ่มการ์ด…', 'e2 · เข็มฉีดยา']);
  await offer2.selectOption('e2');
  await expect
    .poll(() => problemLines(page))
    .not.toContainEqual(expect.stringContaining('belongs in no tray'));

  await trays.getByLabel('ต้องเรียงลำดับในถาด').check();
  await expect(tray1.getByRole('button', { name: 'เลื่อนข้อ 2 ขึ้น' })).toBeVisible();
  await tray1.getByRole('button', { name: 'เลื่อนข้อ 2 ขึ้น' }).click();
  await save(page);
  const t = (await saved(studio, id))['stageData'][0].traysTask;
  expect(t.ordered).toBe(true);
  expect(
    t.trays.map((x: Record<string, unknown>) => [x['id'], x['expectedOrder'], x['expectedIds']]),
  ).toEqual([
    ['t1', ['e3', 'e1'], undefined],
    ['t2', ['e2'], undefined],
  ]);
  expect(t.pool[1]).toEqual({ id: 'e2', text: 'เข็มฉีดยา', img: './assets/equipment/syringe.png' });
});

test('steps: add, move and remove; the JSON tab applies a whole case', async ({ page, studio }) => {
  const [id] = await studio.importExample('valid/minimal.json');
  await openDraft(page, id);
  await expect(page.getByRole('tab', { name: /^ขั้นที่/ })).toHaveCount(6);
  await page.getByRole('button', { name: '+ เพิ่มขั้นตอน' }).click();
  await expect(page.getByRole('tab', { name: /^ขั้นที่/ })).toHaveCount(7);
  await expect(page.getByRole('tab', { name: /^ขั้นที่ 7/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect.poll(() => problemLines(page)).toContain('$.stageData: has 7 steps, expected 6');
  await page.getByRole('button', { name: '← ย้ายไปก่อน' }).click();
  await expect(page.getByRole('tab', { name: /^ขั้นที่ 6/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('button', { name: 'ลบขั้นนี้' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ลบขั้นนี้' }).click();
  await expect(page.getByRole('tab', { name: /^ขั้นที่/ })).toHaveCount(6);
  await expect.poll(() => problemLines(page)).toEqual([]);

  await page.getByRole('tab', { name: 'JSON' }).click();
  const json = page.getByLabel('JSON ของเคส');
  const c = JSON.parse(await json.inputValue());
  await json.fill(JSON.stringify({ ...c, caseTitle: 42 }, null, 2));
  await page.getByRole('button', { name: 'ใช้ JSON นี้' }).click();
  await expect.poll(() => problemLines(page)).toEqual(['$.caseTitle: expected text']);
  await json.fill('{ not json');
  await page.getByRole('button', { name: 'ใช้ JSON นี้' }).click();
  await expect(page.getByText(/^อ่าน JSON ไม่ได้/)).toBeVisible();
  // The tabs keep to the arrow keys (the ARIA tabs pattern).
  await page.getByRole('tab', { name: 'JSON' }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'ข้อมูลเคส' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /^ขั้นที่ 1/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
