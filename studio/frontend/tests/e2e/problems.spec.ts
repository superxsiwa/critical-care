import { readFileSync } from 'node:fs';
import { example, expect, openDraft, problemLines, test } from '../support/studio';

interface Verdict {
  file: string;
  ok: boolean;
  problems?: string[];
}

/**
 * The contract's examples with their exact problem lines ("case 1 (bed 9): $.bedCode: is empty").
 * Each one the studio imports as a draft (its problems are in the case, not the file) must show
 * every problem in the editor's list AND on the screen where it belongs.
 */
const verdicts: Verdict[] = JSON.parse(readFileSync(example('verdicts.json'), 'utf8'));
const exact = verdicts.filter((v) => v.problems?.length);
const LINE = /^case \d+(?: \(bed \d+\))?: (\$[^:]*): (.*)$/;

test('the contract holds examples with exact problem lines', () => {
  expect(exact.length).toBeGreaterThanOrEqual(40);
});

for (const v of exact) {
  test(`problems on their fields: ${v.file}`, async ({ page, studio }) => {
    const imported = await studio.api<{ created?: number[]; problems?: string[] }>(
      'POST',
      '/api/import',
      readFileSync(example(v.file), 'utf8'),
    );
    if (imported.status !== 201) {
      // Refused as a file (not a case): nothing to edit; the import says why.
      expect(imported.status).toBe(422);
      expect(v.problems!.some((l) => !LINE.test(l))).toBe(true);
      return;
    }
    const expected = v.problems!.map((l) => {
      const m = LINE.exec(l);
      expect(m, `a line with a path: ${l}`).not.toBeNull();
      return { path: m![1], message: m![2] };
    });
    await openDraft(page, imported.body.created![0]);
    expect(await problemLines(page)).toEqual(expected.map((p) => `${p.path}: ${p.message}`));

    const list = page.getByRole('region', { name: /ต้องแก้ก่อนส่งออก/ });
    for (const [i, p] of expected.entries()) {
      // From the list to the field: its tab opens and the problem is shown at its place.
      await list.locator('li').nth(i).getByRole('button').click();
      const anchor = p.path.split(' ')[0];
      const place = page.locator(`[data-path="${anchor}"]`).filter({ hasText: p.message });
      await expect(place.first(), `${p.path} shown at its place`).toBeVisible();
      await expect(
        place.first().locator('.field-error', { hasText: p.message }).first(),
      ).toBeVisible();
    }
  });
}

test('a problem fixed in the form leaves the list without saving', async ({ page, studio }) => {
  const [id] = await studio.importExample('invalid/rule-hr-zero.json');
  await openDraft(page, id);
  expect(await problemLines(page)).toEqual(['$.stageData[0].vitals.hr: must be above 0']);
  await page.getByRole('button', { name: /สัญญาณชีพ › HR/ }).click();
  const hr = page.getByLabel('HR (ครั้ง/นาที)');
  await expect(hr).toBeFocused();
  await expect(hr).toHaveAttribute('aria-invalid', 'true');
  await hr.fill('88');
  await expect(page.getByRole('heading', { name: /เคสนี้พร้อมส่งออก/ })).toBeVisible();
  await expect(hr).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('tab', { name: /ขั้นที่ 1/ }).locator('.badge')).toHaveCount(0);
});
