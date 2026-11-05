import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describePath } from '../../src/app/case/where';
import { REPO, sources } from './source';

const FORBIDDEN = [0xfeff, 0x200d, 0xfe0f, 0x2013, 0x2014].map((n) => String.fromCharCode(n));

const ours = () => [
  ...sources('frontend/src', ['.ts', '.css', '.html']),
  ...sources('frontend/public', ['.html', '.css']),
  ...sources('frontend/tests', ['.ts']),
  ...sources('dev', ['.sh']),
  ...sources('.', ['README.md']).filter(([p]) => !p.includes('/')),
  ...sources('backend/internal/web', ['.go']),
];

// The Write tool and heredocs have turned escapes of the byte order mark, the zero-width joiner and
// the emoji variation selector into the invisible characters themselves (it has happened); a literal
// one breaks Go and hides in TypeScript. No em or en dashes anywhere (house rule). The characters
// are built from their numbers here, so this file holds none of them.
test('no invisible characters or long dashes in the sources', () => {
  const bad: string[] = [];
  for (const [path, text] of ours())
    for (const [i, line] of text.split('\n').entries())
      for (const ch of FORBIDDEN)
        if (line.includes(ch))
          bad.push(`${path}:${i + 1}: U+${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  expect(bad).toEqual([]);
});

// Angular 22's conventions (the CLI MCP's best practices): standalone by default, signals,
// control flow, host bindings in the decorator, @Service for singletons.
test('the app keeps to Angular 22 conventions', () => {
  const rules: [RegExp, string][] = [
    [/standalone:\s*true/, 'standalone: true (the default)'],
    [/@Injectable\(/, '@Injectable (use @Service)'],
    [/@Host(Listener|Binding)\(/, '@HostListener/@HostBinding (use host: {})'],
    [/@(Input|Output)\(/, '@Input/@Output (use input()/output())'],
    [/\bngClass\b|\bngStyle\b|CommonModule/, 'ngClass/ngStyle/CommonModule'],
    [/\*ng(If|For|Switch)\b/, 'structural directives (use @if/@for/@switch)'],
    [/\$any\(/, '$any() in a template'],
    [/ChangeDetectionStrategy\.OnPush/, 'OnPush (the default in v22)'],
  ];
  const bad: string[] = [];
  for (const [path, text] of sources('frontend/src', ['.ts']))
    for (const [re, what] of rules) if (re.test(text)) bad.push(`${path}: ${what}`);
  expect(bad).toEqual([]);
});

test('every field of the case package has words for the problem list', () => {
  const schema = JSON.parse(
    readFileSync(resolve(REPO, 'contract/case-package.v1.schema.json'), 'utf8'),
  );
  const keys = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        if (k === 'properties' && x && typeof x === 'object')
          Object.keys(x).forEach((p) => keys.add(p));
        walk(x);
      }
  };
  walk(schema);
  const fileLevel = new Set(['cases', 'format', 'version', 'exportedAt']);
  const untranslated = [...keys].filter((k) => !fileLevel.has(k) && describePath('$.' + k) === k);
  expect(untranslated).toEqual([]);
  expect(describePath('$.stageData[1].traysTask.pool[2].img')).toBe(
    'ขั้นที่ 2 › จัดถาด › การ์ด 3 › รูป',
  );
  expect(describePath('$')).toBe('ทั้งเคส');
});
