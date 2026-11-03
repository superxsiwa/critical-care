import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/** The repository's contract folder: the example files both sides test. */
export const CONTRACT = resolve(__dirname, '../../../../contract');
export const example = (name: string) => join(CONTRACT, 'examples', name);
export const exampleJson = (name: string) => JSON.parse(readFileSync(example(name), 'utf8'));

/** The admin every test studio starts with (made by `casestudio user add`, as on a real box). */
export const ADMIN = { username: 'admin', name: 'ผู้ดูแลทดสอบ', password: 'admin-password-1' };

export type Api = <T = unknown>(
  method: string,
  path: string,
  body?: unknown,
) => Promise<{ status: number; body: T }>;

/** A signed-in caller of the API: its cookies, as a browser would hold them. */
export interface Caller {
  api: Api;
  cookies: { name: string; value: string; url: string }[];
}

/** One server of the studio with its own empty database and one admin account. */
export interface Studio {
  url: string;
  /** Calls the API as the admin (setting up a test, or another instructor's save). */
  api: Api;
  /** The admin's cookies, which the browser starts with unless a test is signed out. */
  cookies: Caller['cookies'];
  /** Signs another account in through the API. */
  signIn(username: string, password: string): Promise<Caller>;
  /** Adds an account (as the admin). */
  addUser(username: string, name: string, password: string, admin?: boolean): Promise<void>;
  /** Imports a contract example as drafts; the new drafts' ids. */
  importExample(name: string): Promise<number[]>;
}

/** Signs in as the page does: the session probe gives the CSRF cookie, then the sign-in. */
async function signIn(url: string, username: string, password: string): Promise<Caller> {
  const jar = new Map<string, string>();
  const keep = (res: Response) => {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const eq = pair.indexOf('=');
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };
  const api: Api = async <T>(method: string, path: string, body?: unknown) => {
    const headers: Record<string, string> = {
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = jar.get('XSRF-TOKEN') ?? '';
    const res = await fetch(url + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    keep(res);
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
  };
  await api('GET', '/api/auth/session');
  const r = await api('POST', '/api/auth/signin', { username, password });
  if (r.status !== 200)
    throw new Error(`sign in ${username}: ${r.status} ${JSON.stringify(r.body)}`);
  const cookies = () => [...jar].map(([name, value]) => ({ name, value, url }));
  return {
    api,
    get cookies() {
      return cookies();
    },
  };
}

async function start(): Promise<Studio & { stop(): Promise<void> }> {
  const bin = process.env['CASESTUDIO_BIN'];
  if (!bin) throw new Error('no CASESTUDIO_BIN: the global setup builds it (run the e2e project)');
  const dir = mkdtempSync(join(tmpdir(), 'casestudio-test-'));
  const env = {
    ...process.env,
    CASESTUDIO_ADDR: '127.0.0.1:0',
    CASESTUDIO_DATA: join(dir, 'data'),
  };
  try {
    execFileSync(bin, ['user', 'add', ADMIN.username, '--name', ADMIN.name, '--admin'], {
      env,
      input: ADMIN.password + '\n',
      stdio: ['pipe', 'ignore', 'pipe'],
    });
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
  const proc: ChildProcess = spawn(bin, ['serve'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const admin = await signIn(url, ADMIN.username, ADMIN.password).catch(async (err: unknown) => {
    await stop();
    throw err;
  });
  const api = admin.api;
  return {
    url,
    api,
    cookies: admin.cookies,
    signIn: (username, password) => signIn(url, username, password),
    async addUser(username, name, password, isAdmin = false) {
      const r = await api('POST', '/api/users', { username, name, password, admin: isAdmin });
      expect(r.status, `add ${username}`).toBe(201);
    },
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

/**
 * Every test gets its own studio (and the page's base URL is it). The browser starts signed in as
 * the admin; `test.use({ signedIn: false })` starts it signed out.
 */
export const test = base.extend<{ studio: Studio; signedIn: boolean }>({
  signedIn: [true, { option: true }],
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
  page: async ({ page, studio, signedIn }, use) => {
    if (signedIn) await page.context().addCookies(studio.cookies);
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
