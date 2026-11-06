import { expect, test } from '../support/studio';

/** The app's feed, read as a phone does: no cookies. */
async function feed(url: string, path = '/api/published') {
  const res = await fetch(url + path);
  return {
    status: res.status,
    cors: res.headers.get('access-control-allow-origin'),
    body: await res.json(),
  };
}

test('an instructor publishes the drafts and the public feed hands them to the app', async ({
  page,
  studio,
}) => {
  await page.goto('/case-mg');
  const status = page.getByRole('status').filter({ hasText: /ในแอปตอนนี้|ยังไม่เคยประกาศใช้/ });
  await expect(status).toContainText('ยังไม่เคยประกาศใช้ในแอป');
  await expect(page.getByRole('button', { name: 'ประกาศใช้ในแอป' })).toBeDisabled();
  expect((await feed(studio.url)).status).toBe(404);

  await studio.importExample('valid/package-two-beds.json');
  await page.reload();
  await page.getByRole('button', { name: 'ประกาศใช้ในแอป' }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('ประกาศใช้ทั้ง 2 เคสในแอป?');
  await confirm.getByRole('button', { name: 'ประกาศใช้' }).click();
  await expect(page.getByText('ประกาศใช้ฉบับที่ 1 ในแอปแล้ว (2 เคส)')).toBeVisible();
  await expect(status).toContainText('ในแอปตอนนี้: ฉบับที่ 1');
  await expect(status).toContainText('2 เคส');

  const latest = await feed(studio.url);
  expect(latest.status).toBe(200);
  expect(latest.cors).toBe('*');
  expect(latest.body).toMatchObject({ revision: 1, cases: 2, package: '/api/published/1' });
  const pkg = await feed(studio.url, latest.body.package);
  expect(pkg.body.revision).toBe(1);
  expect(pkg.body.cases.map((c: { bedNum: number }) => c.bedNum)).toEqual([1, 2]);

  await page.goto('/');
  await expect(page.getByText('ในแอปตอนนี้: ฉบับที่ 1')).toBeVisible();
});

test('a set the app would refuse is not published, and the problems open their case', async ({
  page,
  studio,
}) => {
  const [bad] = await studio.importExample('invalid/rule-hr-zero.json');
  await page.goto('/case-mg');
  await page.getByRole('button', { name: 'ประกาศใช้ในแอป' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ประกาศใช้' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('ยังประกาศใช้ไม่ได้: แอปจะไม่รับชุดเคสนี้');
  await expect(
    page.getByRole('status').filter({ hasText: /ในแอปตอนนี้|ยังไม่เคยประกาศใช้/ }),
  ).toContainText('ยังไม่เคยประกาศใช้ในแอป');
  expect((await feed(studio.url)).status).toBe(404);
  await alert.getByRole('link', { name: 'เปิดเคสนี้' }).click();
  await expect(page).toHaveURL(new RegExp(`/drafts/${bad}$`));
});
