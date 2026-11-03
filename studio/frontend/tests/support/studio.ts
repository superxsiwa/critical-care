import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/** The repository's contract folder: the example files both sides test. */
export const CONTRACT = resolve(__dirname, '../../../../contract');
export const example = (name: string) => join(CONTRACT, 'examples', name);
export const exampleJson = (name: string) => JSON.parse(readFileSync(example(name), 'utf8'));

/** One server of the studio with its own empty database. */
export interface Studio {
  url: string;
  /** Calls the API directly (another instructor, or setting up a test). */
  api<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: T }>;
  /** Imports a contract example as drafts; the new drafts' ids. */
  importExample(name: string): Promise<number[]>;
}

async function start(): Promise<Studio & { stop(): Promise<void> }> {
  const bin = process.env['CASESTUDIO_BIN'];
  if (!bin) throw new Error('no CASESTUDIO_BIN: the global setup builds it (run the e2e project)');
  const dir = mkdtempSync(join(tmpdir(), 'casestudio-test-'));
  const proc: ChildProcess = spawn(bin, ['serve'], {
    env: { ...process.env, CASESTUDIO_ADDR: '127.0.0.1:0', CASESTUDIO_DATA: join(dir, 'data') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stop = async () => {
    if (proc.exitCode === null && proc.signalCode === null) {
      const exited = new Promise((ok) => proc.once('exit', ok));
      proc.kill('SIGTERM');
      const hard = setTimeout(() => proc.kill('SIGKILL'), 5_000);
      await exited;
      clearTimeout(hard);
    }
    rmSync(dir, { recursive: true, force: true });
  };
  // The server says where it listens: msg="casestudio listening" addr=127.0.0.1:41234. A server
  // that does not say so in time is stopped here: nothing a test started outlives it.
  const url = await new Promise<string>((ok, fail) => {
    let log = '';
    const timer = setTimeout(() => fail(new Error('the studio did not start:\n' + log)), 10_000);
    proc.stdout!.on('data', (chunk: Buffer) => {
      log += chunk.toString();
      const m = /casestudio listening"? addr=(\S+)/.exec(log);
      if (m) {
        clearTimeout(timer);
        ok(`http://${m[1]}`);
      }
    });
    proc.stderr!.on('data', (chunk: Buffer) => (log += chunk.toString()));
    proc.on('exit', (code) => fail(new Error(`the studio stopped (${code}):\n${log}`)));
  }).catch(async (err: unknown) => {
    await stop();
    throw err;
  });
  const api = async <T>(method: string, path: string, body?: unknown) => {
    const res = await fetch(url + path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  };
  return {
    url,
    api,
    async importExample(name) {
      const r = await api<{ created: number[] }>(
        'POST',
        '/api/import',
        readFileSync(example(name), 'utf8'),
      );
      expect(r.status, `import ${name}`).toBe(201);
      return r.body.created;
    },
    stop,
  };
}

/** Every test gets its own studio (and the page's base URL is it). */
export const test = base.extend<{ studio: Studio }>({
  studio: async ({}, use) => {
    const s = await start();
    try {
      await use(s);
    } finally {
      await s.stop();
    }
  },
  baseURL: async ({ studio }, use) => {
    await use(studio.url);
  },
  // Every page must run without an error in the console (an Angular error is printed there).
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      // A refusal the screen answers (409 stale, 422 not ready) is logged by the browser; it is no error.
      const refusal = /^Failed to load resource: the server responded with a status of 4\d\d /;
      if (m.type() === 'error' && !refusal.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

export { expect };

/** The editor's problem list, as "path: message" lines. */
export async function problemLines(page: Page): Promise<string[]> {
  const items = page.getByRole('region', { name: /ต้องแก้ก่อนส่งออก|พร้อมส่งออก/ }).locator('li');
  return items.evaluateAll((lis) =>
    lis.map((li) => {
      const path = li.querySelector('.key')?.textContent?.trim() ?? '';
      const message = li.querySelector('[lang="en"]')?.textContent?.trim() ?? '';
      return `${path}: ${message}`;
    }),
  );
}

/** Opens a draft in the editor and waits until it is shown. */
export async function openDraft(page: Page, id: number): Promise<void> {
  await page.goto(`/drafts/${id}`);
  await expect(page.getByRole('tab', { name: /ข้อมูลเคส/ })).toBeVisible();
}
