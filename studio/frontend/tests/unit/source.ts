import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const FRONTEND = resolve(__dirname, '../..');
export const STUDIO = resolve(FRONTEND, '..');
export const REPO = resolve(STUDIO, '..');

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(FRONTEND, path), 'utf8')) as T;
}

/** Every file under dir (relative to the studio folder) with one of the extensions, as [path, text]. */
export function sources(dir: string, exts: string[]): [string, string][] {
  const out: [string, string][] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (exts.some((e) => name.endsWith(e)))
        out.push([relative(STUDIO, p), readFileSync(p, 'utf8')]);
    }
  };
  walk(resolve(STUDIO, dir));
  return out;
}
