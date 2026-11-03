import { Service, computed, signal } from '@angular/core';
import { Json, JsonObject, Problem } from '../api/types';
import { Path, anchorOf, getAt, isWithin, pathText, removeAt, setAt } from '../case/json';

/**
 * The case being edited on one page, and the server's problems with it. Every field reads and
 * writes through here by path; problems are matched to fields by the same paths, as the server
 * writes them (the app's own rules and texts: studio/backend/internal/cases).
 */
@Service({ autoProvided: false })
export class CaseEditor {
  readonly doc = signal<JsonObject>({});
  readonly problems = signal<Problem[]>([]);

  /** Problems by the place they belong on the screen. */
  private readonly byAnchor = computed(() => {
    const map = new Map<string, Problem[]>();
    for (const p of this.problems()) {
      const at = anchorOf(p.path);
      const list = map.get(at);
      if (list) list.push(p);
      else map.set(at, [p]);
    }
    return map;
  });

  value(path: Path): Json | undefined {
    return getAt(this.doc(), path);
  }

  set(path: Path, value: Json): void {
    this.doc.update((d) => setAt(d, path, value));
  }

  remove(path: Path): void {
    this.doc.update((d) => removeAt(d, path));
  }

  /** The problems that belong exactly at path. */
  problemsAt(path: Path): Problem[] {
    return this.byAnchor().get(pathText(path)) ?? [];
  }

  /** How many problems are at path or inside it. */
  countWithin(path: Path): number {
    const base = pathText(path);
    return this.problems().filter((p) => isWithin(p.path, base)).length;
  }
}

/** A field's element id, from its path: f-stageData-0-vitals-hr. */
export function fieldId(path: Path): string {
  return 'f-' + path.join('-').replace(/[^A-Za-z0-9_-]/g, '_');
}
