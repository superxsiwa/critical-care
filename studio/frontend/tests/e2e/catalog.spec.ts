import { type Page } from '@playwright/test';
import { ADMIN, expect, test } from '../support/studio';

/** The rows of the management table, the header row left out. */
const bodyRows = (page: Page) => page.locator('tbody tr');
const rowOf = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text });

test('equipment names are kept on the server: a change, a delete and an add outlive a reload', async ({
  page,
}) => {
  await page.goto('/equipment-mg');
  await expect(bodyRows(page)).toHaveCount(16);
  await expect(rowOf(page, 'bp_monitor.png')).toContainText('เครื่องวัดความดันโลหิต');

  // Change a name: the reader's catalog shows it too.
  await rowOf(page, 'bp_monitor.png').getByRole('button', { name: 'แก้ไข' }).click();
  const edit = page.getByRole('dialog', { name: 'แก้ไขข้อมูลอุปกรณ์' });
  await expect(edit.getByRole('textbox', { name: 'ชื่อไฟล์รูปภาพ (.png)' })).toBeDisabled();
  await edit
    .getByRole('textbox', { name: 'ชื่ออุปกรณ์ (ภาษาไทย)' })
    .fill('เครื่องวัดความดัน (ทดสอบ)');
  await edit.getByRole('button', { name: 'บันทึกอุปกรณ์' }).click();
  await expect(page.getByText('แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว')).toBeVisible();
  await expect(edit).toBeHidden();
  await page.reload();
  await expect(rowOf(page, 'bp_monitor.png').getByRole('cell').nth(1)).toHaveText(
    'เครื่องวัดความดัน (ทดสอบ)',
  );
  await page.goto('/equipment');
  await expect(page.getByRole('heading', { name: 'เครื่องวัดความดัน (ทดสอบ)' })).toBeVisible();
  await expect(page.getByText(/ทั้งหมด 16 ชนิด/)).toBeVisible();

  // Delete one: its picture is the only one a new entry can then name.
  await page.goto('/equipment-mg');
  await rowOf(page, 'syringe.png').getByRole('button', { name: 'ลบ' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ลบอุปกรณ์' }).click();
  await expect(page.getByText('ลบอุปกรณ์เรียบร้อยแล้ว')).toBeVisible();
  await page.reload();
  await expect(bodyRows(page)).toHaveCount(15);
  await expect(rowOf(page, 'syringe.png')).toHaveCount(0);

  await page.getByRole('button', { name: '+ เพิ่มอุปกรณ์ใหม่' }).click();
  const add = page.getByRole('dialog', { name: 'เพิ่มอุปกรณ์ใหม่' });
  const picture = add.getByRole('combobox', { name: 'ชื่อไฟล์รูปภาพ (.png)' });
  await expect(picture.getByRole('option')).toHaveText(['เลือกรูปภาพ…', 'syringe.png']);
  await add.getByRole('textbox', { name: 'ชื่ออุปกรณ์ (ภาษาไทย)' }).fill('กระบอกฉีดยาขนาด 10 มล.');
  await add.getByRole('button', { name: 'บันทึกอุปกรณ์' }).click();
  await expect(page.getByText('กรุณาเลือกรูปภาพ')).toBeVisible();
  await picture.selectOption('syringe.png');
  await add.getByRole('button', { name: 'บันทึกอุปกรณ์' }).click();
  await expect(page.getByText('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว')).toBeVisible();
  await page.reload();
  await expect(bodyRows(page)).toHaveCount(16);
  await expect(rowOf(page, 'syringe.png').getByRole('cell').nth(1)).toHaveText(
    'กระบอกฉีดยาขนาด 10 มล.',
  );
  // The English name is the picture's file when left empty, as his page did.
  await expect(rowOf(page, 'syringe.png').getByRole('cell').nth(2)).toHaveText('syringe.png');

  // Every picture has a name again: there is nothing left to add.
  await page.getByRole('button', { name: '+ เพิ่มอุปกรณ์ใหม่' }).click();
  await expect(picture).toBeDisabled();
  await expect(add).toContainText('รูปอุปกรณ์ทุกรูปในแอปมีชื่อแล้ว');
});

test('knowledge articles are kept on the server and the reader sees them', async ({ page }) => {
  await page.goto('/knowledge-mg');
  await expect(bodyRows(page)).toHaveCount(6);

  await page.getByRole('button', { name: '+ เพิ่มเอกสารความรู้ใหม่' }).click();
  const add = page.getByRole('dialog', { name: 'เพิ่มเอกสารความรู้ใหม่' });
  await add.getByRole('textbox', { name: 'หัวข้อความรู้' }).fill('บทความทดสอบของสตูดิโอ');
  await add.getByRole('textbox', { name: 'หมวดหมู่' }).fill('หมวดทดสอบ');
  await add.getByRole('textbox', { name: 'สรุปย่อ' }).fill('สรุปสั้น');
  await add.getByRole('textbox', { name: 'เนื้อหาบทเรียน' }).fill('บรรทัดแรก\nบรรทัดที่สอง');
  await add.getByRole('button', { name: 'บันทึกเอกสาร' }).click();
  await expect(page.getByText('เพิ่มเอกสารความรู้เรียบร้อยแล้ว')).toBeVisible();
  await page.reload();
  await expect(bodyRows(page)).toHaveCount(7);
  const row = rowOf(page, 'บทความทดสอบของสตูดิโอ');
  await expect(row.getByRole('cell').nth(3)).toContainText(ADMIN.name);

  // The reader: a new category is a folder of its own, open from the start.
  await page.goto('/knowledge');
  await expect(page.getByRole('button', { name: /หมวดทดสอบ/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByRole('button', { name: /บทความทดสอบของสตูดิโอ/ }).click();
  const reader = page.getByRole('dialog', { name: 'บทความทดสอบของสตูดิโอ' });
  await expect(reader).toContainText('บรรทัดแรก');
  await expect(reader).toContainText('บรรทัดที่สอง');
  await reader.getByRole('button', { name: 'ปิด' }).last().click();

  // Change it, then delete it.
  await page.goto('/knowledge-mg');
  await rowOf(page, 'บทความทดสอบของสตูดิโอ').getByRole('button', { name: 'แก้ไข' }).click();
  const edit = page.getByRole('dialog', { name: 'แก้ไขเอกสารความรู้' });
  await edit.getByRole('textbox', { name: 'หัวข้อความรู้' }).fill('บทความทดสอบ (แก้แล้ว)');
  await edit.getByRole('button', { name: 'บันทึกเอกสาร' }).click();
  await expect(page.getByText('แก้ไขเอกสารเรียบร้อยแล้ว')).toBeVisible();
  await page.reload();
  await expect(rowOf(page, 'บทความทดสอบ (แก้แล้ว)')).toHaveCount(1);
  await rowOf(page, 'บทความทดสอบ (แก้แล้ว)').getByRole('button', { name: 'ลบ' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ลบเอกสาร' }).click();
  await expect(page.getByText('ลบเอกสารเรียบร้อยแล้ว')).toBeVisible();
  await page.reload();
  await expect(bodyRows(page)).toHaveCount(6);
});

test("a save over someone else's change is refused and the form keeps what was typed", async ({
  page,
  studio,
}) => {
  await page.goto('/knowledge-mg');
  const first = 'โครงสร้างเคสมาตรฐาน 6 ขั้นตอนใน CCU';
  await rowOf(page, first).getByRole('button', { name: 'แก้ไข' }).click();
  const edit = page.getByRole('dialog', { name: 'แก้ไขเอกสารความรู้' });
  await edit.getByRole('textbox', { name: 'สรุปย่อ' }).fill('สรุปของฉัน');

  // Another instructor saves the same article meanwhile.
  await studio.addUser('nurse', 'พยาบาลอีกคน', 'nurse-password-1');
  const other = await studio.signIn('nurse', 'nurse-password-1');
  const [article] = (await other.api<{ id: number; version: number }[]>('GET', '/api/knowledge'))
    .body;
  const r = await other.api('PUT', `/api/knowledge/${article.id}`, {
    version: article.version,
    title: 'หัวข้อของคนอื่น',
    category: 'โครงสร้างเคส',
    summary: '',
    content: '',
  });
  expect(r.status).toBe(200);

  await edit.getByRole('button', { name: 'บันทึกเอกสาร' }).click();
  await expect(page.getByText(/มีผู้อื่นแก้ไขรายการนี้/)).toBeVisible();
  await expect(edit.getByRole('textbox', { name: 'สรุปย่อ' })).toHaveValue('สรุปของฉัน');
  await edit.getByRole('button', { name: 'ยกเลิก' }).click();
  const theirs = rowOf(page, 'หัวข้อของคนอื่น');
  await expect(theirs.getByRole('cell').nth(3)).toContainText('พยาบาลอีกคน');
  await expect(rowOf(page, first)).toHaveCount(0);
});
