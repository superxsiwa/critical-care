import { Json, JsonObject } from '../api/types';

/** A place in a case: keys and list positions from the case's root. */
export type Path = readonly (string | number)[];

export function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The server's form of a path: $.stageData[0].vitals.hr. */
export function pathText(path: Path): string {
  let s = '$';
  for (const seg of path) s += typeof seg === 'number' ? `[${seg}]` : `.${seg}`;
  return s;
}

/**
 * Where a problem belongs on the screen. Most paths name a field; a few carry words after the path
 * ("$.stageData[1].traysTask.trays (all expected ids)"), which belong to the place before them.
 */
export function anchorOf(path: string): string {
  const space = path.indexOf(' ');
  return space < 0 ? path : path.slice(0, space);
}

/** Whether `path` is `base` or a place inside it. */
export function isWithin(path: string, base: string): boolean {
  if (base === '$') return path.startsWith('$');
  return path === base || path.startsWith(base + '.') || path.startsWith(base + '[');
}

export function getAt(root: Json | undefined, path: Path): Json | undefined {
  let v: Json | undefined = root;
  for (const seg of path) {
    if (typeof seg === 'number') {
      if (!Array.isArray(v)) return undefined;
      v = v[seg];
    } else {
      if (!isObject(v)) return undefined;
      v = v[seg];
    }
  }
  return v;
}

/** A copy of root with value at path; containers on the way are copied, never changed in place. */
export function setAt(root: JsonObject, path: Path, value: Json): JsonObject {
  return put(root, path, 0, value) as JsonObject;
}

function put(node: Json | undefined, path: Path, i: number, value: Json): Json {
  if (i === path.length) return value;
  const seg = path[i];
  if (typeof seg === 'number') {
    const list = Array.isArray(node) ? [...node] : [];
    list[seg] = put(list[seg], path, i + 1, value);
    return list;
  }
  const obj: JsonObject = isObject(node) ? { ...node } : {};
  obj[seg] = put(obj[seg], path, i + 1, value);
  return obj;
}

/** A copy of root without the key or list entry at path. */
export function removeAt(root: JsonObject, path: Path): JsonObject {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const last = path[path.length - 1];
  const parent = getAt(root, parentPath);
  if (typeof last === 'number' && Array.isArray(parent)) {
    return setAt(
      root,
      parentPath,
      parent.filter((_, i) => i !== last),
    );
  }
  if (typeof last === 'string' && isObject(parent) && last in parent) {
    const copy = { ...parent };
    delete copy[last];
    return parentPath.length === 0 ? copy : setAt(root, parentPath, copy);
  }
  return root;
}

/** Text to show for a value in a text field: text as it is, other values as JSON. */
export function asText(v: Json | undefined): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/** The list at a place, or an empty one when there is none (the problem then says why). */
export function listAt(root: Json | undefined, path: Path): Json[] {
  const v = getAt(root, path);
  return Array.isArray(v) ? v : [];
}

/** The text ids of a list, such as correctOrder; entries that are not text show as JSON. */
export function idsAt(root: Json | undefined, path: Path): string[] {
  return listAt(root, path).map((v) => (typeof v === 'string' ? v : asText(v)));
}
