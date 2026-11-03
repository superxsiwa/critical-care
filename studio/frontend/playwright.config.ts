import { defineConfig, devices } from '@playwright/test';

/**
 * Two projects:
 *
 *   unit  guards that read source files, no browser: build settings, the links to the app's pictures,
 *         words for every case field, no invisible characters. Seconds.
 *   e2e   the real thing: tests/support/global-setup.ts builds the one binary with this app embedded
 *         (dev/build.sh); every test gets its own server and empty SQLite file (tests/support/studio.ts)
 *         and drives Chromium against it, so tests run in parallel and never see each other's drafts.
 *
 *   pnpm test           both
 *   pnpm test:unit      the guards only
 *   E2E_BIN=<binary> pnpm test:e2e   with a binary you built (skips the build)
 */
export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  globalSetup: './tests/support/global-setup.ts',
  globalTeardown: './tests/support/global-teardown.ts',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'unit', testDir: './tests/unit' },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 850 } },
    },
  ],
});
