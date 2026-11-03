import { Json, JsonObject } from '../api/types';
import { isObject } from './json';

/**
 * Empty shapes for new cases, steps, tasks and cards. Every field is there but blank, so the rules
 * name everything left to write at once (a missing field would stop the check at the first one).
 * Numbers start at 0 and texts empty: the studio never fills in clinical content.
 */
export function blankStep(id: number): JsonObject {
  return {
    id,
    name: '',
    mechanic: '',
    reading: '',
    doctorSpeech: '',
    vitals: { hr: 0, bp: '', spo2: '', map: 0 },
  };
}

export function blankCase(bedNum: number, steps: number): JsonObject {
  return {
    bedNum,
    bedCode: '',
    patientName: '',
    caseTitle: '',
    dxBadge: '',
    status: 'stable',
    statusText: '',
    doctorName: '',
    doctorAvatar: '',
    stageData: Array.from({ length: steps }, (_, i) => blankStep(i + 1)),
  };
}

/** The four kinds of task a step can have, under their keys in the case. */
export type TaskKey = 'choices1toN' | 'sequenceTask' | 'traysTask' | 'unorderedDropTask';
export const POOL_TASKS: readonly TaskKey[] = ['sequenceTask', 'traysTask', 'unorderedDropTask'];

export function blankTask(key: TaskKey): JsonObject {
  switch (key) {
    case 'choices1toN':
      return { prompt: '', options: [] };
    case 'sequenceTask':
      return { prompt: '', pool: [], correctOrder: [] };
    case 'traysTask':
      return { ordered: false, prompt: '', trays: [], pool: [] };
    case 'unorderedDropTask':
      return { prompt: '', expectedIds: [], pool: [] };
  }
}

/** Every id the case uses (options, trays, cards), so a new one never repeats any of them. */
export function idsInCase(c: Json): Set<string> {
  const ids = new Set<string>();
  const walk = (v: Json) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (isObject(v)) {
      if (typeof v['id'] === 'string') ids.add(v['id']);
      Object.values(v).forEach(walk);
    }
  };
  walk(c);
  return ids;
}

/**
 * A new id: the letters of the list's first id (fe3 gives fe) or the fallback, with the first number
 * no id of the case has yet.
 */
export function freshId(c: Json, list: readonly Json[], fallback: string): string {
  const first = list.find((v) => isObject(v) && typeof v['id'] === 'string') as
    JsonObject | undefined;
  const prefix = (first ? String(first['id']).replace(/\d+$/, '') : '') || fallback;
  const used = idsInCase(c);
  let n = list.length + 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** The next step id: one more than the highest whole-number id. */
export function nextStepId(steps: readonly Json[]): number {
  let max = 0;
  for (const s of steps) {
    const id = isObject(s) ? s['id'] : undefined;
    const n = typeof id === 'number' ? id : typeof id === 'string' ? Number(id) : NaN;
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}
