import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { expect, openDraft, test } from '../support/studio';

/** WCAG 2.1 A and AA, as axe checks them. */
async function violations(page: Page): Promise<string[]> {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('the list passes axe (empty, then with drafts)', async ({ page, studio }) => {
  await page.goto('/');
  await expect(page.getByText('ยังไม่มีเคส')).toBeVisible();
  expect(await violations(page)).toEqual([]);
  await studio.importExample('valid/package-two-beds.json');
  await studio.importExample('invalid/rule-hr-zero.json');
  await page.reload();
  await expect(page.getByRole('row')).toHaveCount(4);
  expect(await violations(page)).toEqual([]);
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
