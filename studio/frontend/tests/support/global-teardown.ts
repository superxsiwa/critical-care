import { readFileSync, readdirSync, rmSync } from 'node:fs';

/**
 * Removes the binary the setup built. Each test stops its own server; any server still running
 * THIS run's binary (its path is a fresh temp folder, so nothing else runs it) is stopped here by
 * its PID, and the run fails: a leftover is a bug in the tests (Linux: read from /proc).
 */
export default async function globalTeardown(): Promise<void> {
  const dir = process.env['CASESTUDIO_BIN_DIR'];
  if (!dir) return;
  const bin = process.env['CASESTUDIO_BIN']!;
  const left: number[] = [];
  for (const pid of readdirSync('/proc').filter((p) => /^\d+$/.test(p))) {
    try {
      if (readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0')[0] === bin)
        left.push(Number(pid));
    } catch {
      // gone, or not ours to read
    }
  }
  for (const pid of left) process.kill(pid, 'SIGKILL');
  rmSync(dir, { recursive: true, force: true });
  if (left.length)
    throw new Error(`${left.length} studio servers outlived their tests (stopped now)`);
}
