import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { FRONTEND, REPO, STUDIO, readJson } from './source';

/** Each of these settings fails SILENTLY when wrong: the build still succeeds. */
interface Angular {
  projects: Record<string, { architect: Record<string, any> }>;
}
const build = () => readJson<Angular>('angular.json').projects['casestudio'].architect['build'];

test('the shipped bundle has a budget of 500 kB warn, 1 MB error', () => {
  expect(build().configurations.production.budgets).toContainEqual({
    type: 'initial',
    maximumWarning: '500kB',
    maximumError: '1MB',
  });
});

// Angular's critical-CSS inlining loads the stylesheet with an onload handler, which the server's
// Content-Security-Policy (no inline scripts) blocks: the page would show unstyled.
test('critical CSS is not inlined (the server allows no inline script)', () => {
  expect(build().configurations.production.optimization.styles.inlineCritical).toBe(false);
  const httpx = readFileSync(resolve(STUDIO, 'backend/internal/httpx/httpx.go'), 'utf8');
  expect(httpx).toContain(`default-src 'self'`);
  expect(httpx).not.toMatch(/script-src[^;"]*unsafe-inline/);
});

test('the dev proxy points at the server default port', () => {
  const proxy = readJson<Record<string, { target: string }>>('proxy.conf.json');
  const main = readFileSync(resolve(STUDIO, 'backend/cmd/casestudio/main.go'), 'utf8');
  const port = /"127\.0\.0\.1:(\d+)"/.exec(main)![1];
  expect(proxy['/api'].target).toBe(`http://127.0.0.1:${port}`);
});

// One copy of the app's pictures, fonts and icons: the app's own, linked (Angular takes no asset
// folder outside its workspace; dev/build.sh copies with -L).
test('public/ links to the app folders, and the pictures are the ones the server knows', () => {
  const links: Record<string, string> = {
    equipment: 'mobile/assets/equipment',
    fonts: 'mobile/assets/fonts',
    icons: 'mobile/web/icons',
  };
  expect(readdirSync(resolve(FRONTEND, 'public')).sort()).toEqual(Object.keys(links).sort());
  for (const [name, target] of Object.entries(links)) {
    readlinkSync(resolve(FRONTEND, 'public', name)); // a link, not a copy
    expect(realpathSync(resolve(FRONTEND, 'public', name))).toBe(resolve(REPO, target));
  }
  const known = readFileSync(resolve(STUDIO, 'backend/internal/cases/equipment.txt'), 'utf8')
    .split(/\s+/)
    .filter(Boolean);
  expect(readdirSync(resolve(FRONTEND, 'public/equipment')).sort()).toEqual(known);
  const css = readFileSync(resolve(FRONTEND, 'src/styles.css'), 'utf8');
  for (const m of css.matchAll(/url\("\/fonts\/([^"]+)"\)/g))
    expect(readdirSync(resolve(FRONTEND, 'public/fonts'))).toContain(m[1]);
});
