import { Component, computed, inject, input } from '@angular/core';
import { Path, asText, idsAt, isObject, listAt, pathText } from '../case/json';
import { CaseEditor } from './case-editor';
import { ProblemsAt } from './fields';

/**
 * A list of card ids that a task expects: an order (correctOrder, a tray's expectedOrder) or a set
 * (expectedIds). Cards are added from the task's pool; `taken` are cards already in another tray.
 */
@Component({
  selector: 'cs-id-list',
  imports: [ProblemsAt],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    <div class="label">
      {{ label() }} <span class="key" aria-hidden="true">{{ key() }}</span>
    </div>
    @if (ids().length) {
      <ol class="space-y-1">
        @for (id of ids(); track $index; let i = $index, first = $first, last = $last) {
          <li
            class="flex items-center gap-2 rounded-md border border-line bg-white px-2 py-1 text-sm"
          >
            @if (ordered()) {
              <span class="w-5 shrink-0 text-center font-semibold text-sky-800">{{ i + 1 }}</span>
            }
            <span class="min-w-0 flex-1">
              @if (textOf(id); as t) {
                <span class="line-clamp-2">{{ t }}</span>
              } @else {
                <span class="text-rose-700">ไม่มีการ์ดรหัสนี้</span>
              }
              <span class="key ml-1" aria-hidden="true">{{ id }}</span>
            </span>
            @if (ordered()) {
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                [disabled]="first"
                [attr.aria-label]="'เลื่อนข้อ ' + (i + 1) + ' ขึ้น'"
                (click)="move(i, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                [disabled]="last"
                [attr.aria-label]="'เลื่อนข้อ ' + (i + 1) + ' ลง'"
                (click)="move(i, 1)"
              >
                ↓
              </button>
            }
            <button
              type="button"
              class="btn btn-ghost btn-icon text-rose-700"
              [attr.aria-label]="'เอาข้อ ' + (i + 1) + ' ออก'"
              (click)="drop(i)"
            >
              ✕
            </button>
          </li>
        }
      </ol>
    } @else {
      <p class="text-sm text-ink-3">{{ emptyHint() }}</p>
    }
    <cs-problems-at [at]="path()" />
    @if (available().length) {
      <select
        class="input mt-1.5 w-auto max-w-full"
        [attr.aria-label]="'เพิ่มการ์ดใน ' + label()"
        (change)="add($event)"
      >
        <option value="" selected>+ เพิ่มการ์ด…</option>
        @for (c of available(); track c.id) {
          <option [value]="c.id">{{ c.id }} · {{ c.text }}</option>
        }
      </select>
    }
  `,
})
export class IdList {
  private readonly editor = inject(CaseEditor);
  readonly path = input.required<Path>();
  readonly pool = input.required<Path>();
  readonly label = input.required<string>();
  readonly ordered = input(false);
  readonly taken = input<readonly string[]>([]);
  readonly emptyHint = input('ยังไม่มีการ์ด');

  protected readonly where = computed(() => pathText(this.path()));
  protected readonly key = computed(() => String(this.path()[this.path().length - 1]));
  protected readonly ids = computed(() => idsAt(this.editor.doc(), this.path()));
  private readonly cards = computed(() => {
    const map = new Map<string, string>();
    for (const c of listAt(this.editor.doc(), this.pool()))
      if (isObject(c) && typeof c['id'] === 'string' && !map.has(c['id']))
        map.set(c['id'], asText(c['text']));
    return map;
  });
  protected readonly available = computed(() => {
    const used = new Set([...this.ids(), ...this.taken()]);
    return [...this.cards()]
      .filter(([id]) => !used.has(id))
      .map(([id, text]) => ({ id, text: text.length > 60 ? text.slice(0, 60) + '…' : text }));
  });

  protected textOf(id: string): string | null {
    const t = this.cards().get(id);
    return t === undefined ? null : t || '(ยังไม่มีข้อความ)';
  }

  protected add(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const id = select.value;
    select.value = '';
    if (id) this.editor.set(this.path(), [...this.ids(), id]);
  }

  protected move(i: number, by: number): void {
    const ids = [...this.ids()];
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    this.editor.set(this.path(), ids);
  }

  protected drop(i: number): void {
    this.editor.set(
      this.path(),
      this.ids().filter((_, k) => k !== i),
    );
  }
}
