import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

/** The studio folder (studio/). */
export const STUDIO = resolve(__dirname, '../../..');

/**
 * Builds the binary the e2e tests run: dev/build.sh, the web app embedded, into a temp folder. Its
 * path reaches the tests as CASESTUDIO_BIN. Nothing is built when only the unit guards run, or when
 * E2E_BIN names a binary already built.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const e2e = config.projects.some((p) => p.name === 'e2e');
  if (!e2e || process.argv.includes('--project=unit')) return;
  if (process.env['E2E_BIN']) {
    process.env['CASESTUDIO_BIN'] = resolve(process.env['E2E_BIN']);
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'casestudio-e2e-'));
  const bin = join(dir, 'casestudio');
  execFileSync(join(STUDIO, 'dev/build.sh'), [bin], { stdio: 'inherit' });
  process.env['CASESTUDIO_BIN'] = bin;
  process.env['CASESTUDIO_BIN_DIR'] = dir;
}
