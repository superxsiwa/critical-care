import { Component, computed, inject, input } from '@angular/core';
import { JsonObject } from '../api/types';
import { freshId } from '../case/blank';
import { Path, asText, idsAt, isObject, listAt, pathText, setAt } from '../case/json';
import { Confirm } from '../ui/confirm';
import { CaseEditor } from './case-editor';
import { CheckField, ProblemsAt, TextField } from './fields';
import { IdList } from './id-list';
import { IdField, PoolEditor } from './pool';

type Role = (id: string) => { text: string; ok: boolean } | null;

/** choices1toN: a prompt and options, each right or wrong (at least one right). */
@Component({
  selector: 'cs-task-choices',
  imports: [TextField, IdField, CheckField, ProblemsAt],
  template: `
    <cs-text label="โจทย์คำสั่ง (Prompt)" [path]="at('prompt')" [multiline]="true" />
    <h4 class="mt-4 text-sm font-semibold text-ink">
      ตัวเลือก <span class="key" aria-hidden="true">options</span>
    </h4>
    <cs-problems-at [at]="at('options')" />
    <ol class="mt-2 space-y-2">
      @for (o of options(); track $index; let i = $index) {
        <li
          class="grid items-start gap-2 rounded-lg border border-line bg-sky-50/60 p-2.5 md:grid-cols-[8rem_1fr_auto_auto]"
        >
          <cs-id label="รหัส" [path]="option(i, 'id')" [siblings]="at('options')" />
          <cs-text label="ข้อความตัวเลือก" [path]="option(i, 'text')" [multiline]="true" />
          <cs-check class="md:pt-7" label="ถูก" [path]="option(i, 'correct')" />
          <button
            type="button"
            class="btn btn-ghost btn-icon text-rose-700 md:mt-6"
            [attr.aria-label]="'ลบตัวเลือก ' + (i + 1)"
            (click)="removeOption(i)"
          >
            ✕
          </button>
        </li>
      }
    </ol>
    <button type="button" class="btn mt-2" (click)="addOption()">+ เพิ่มตัวเลือก</button>
  `,
})
export class ChoicesTask {
  private readonly editor = inject(CaseEditor);
  private readonly confirm = inject(Confirm);
  readonly path = input.required<Path>();
  protected readonly options = computed(() => listAt(this.editor.doc(), this.at('options')));

  protected at(key: string): Path {
    return [...this.path(), key];
  }

  protected option(i: number, key: string): Path {
    return [...this.path(), 'options', i, key];
  }

  protected addOption(): void {
    const id = freshId(this.editor.doc(), this.options(), 'c');
    this.editor.set(this.at('options'), [...this.options(), { id, text: '', correct: false }]);
  }

  protected async removeOption(i: number): Promise<void> {
    const o = this.options()[i];
    const text = isObject(o) ? asText(o['text']) : '';
    if (
      text &&
      !(await this.confirm.ask({
        title: `ลบตัวเลือก ${i + 1}?`,
        body: text,
        yes: 'ลบ',
        danger: true,
      }))
    )
      return;
    this.editor.set(
      this.at('options'),
      this.options().filter((_, k) => k !== i),
    );
  }
}

/** sequenceTask: cards put in the right order (correctOrder); cards not in it are distractors. */
@Component({
  selector: 'cs-task-sequence',
  imports: [TextField, PoolEditor, IdList],
  template: `
    <cs-text label="โจทย์คำสั่ง (Prompt)" [path]="at('prompt')" [multiline]="true" />
    <div class="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <cs-pool [path]="at('pool')" [refs]="[at('correctOrder')]" fallbackId="s" [role]="role" />
      <cs-id-list
        label="ลำดับที่ถูกต้อง"
        [path]="at('correctOrder')"
        [pool]="at('pool')"
        [ordered]="true"
        emptyHint="ยังไม่ได้เรียงลำดับ: เพิ่มการ์ดตามลำดับที่ถูกต้อง"
      />
    </div>
  `,
})
export class SequenceTask {
  private readonly editor = inject(CaseEditor);
  readonly path = input.required<Path>();
  private readonly order = computed(() => idsAt(this.editor.doc(), this.at('correctOrder')));

  protected readonly role: Role = (id) => {
    const i = this.order().indexOf(id);
    return i < 0 ? { text: 'ไม่อยู่ในลำดับ', ok: false } : { text: `ลำดับที่ ${i + 1}`, ok: true };
  };

  protected at(key: string): Path {
    return [...this.path(), key];
  }
}

/** unorderedDropTask: the right cards go in the box, in any order; the others are unsafe. */
@Component({
  selector: 'cs-task-drop',
  imports: [TextField, PoolEditor, IdList],
  template: `
    <cs-text label="โจทย์คำสั่ง (Prompt)" [path]="at('prompt')" [multiline]="true" />
    <div class="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <cs-pool [path]="at('pool')" [refs]="[at('expectedIds')]" fallbackId="a" [role]="role" />
      <cs-id-list
        label="การ์ดที่ควรทำ (ลงกล่อง ไม่ต้องเรียงลำดับ)"
        [path]="at('expectedIds')"
        [pool]="at('pool')"
        emptyHint="ยังไม่ได้เลือกการ์ดที่ถูกต้อง"
      />
    </div>
  `,
})
export class DropTask {
  private readonly editor = inject(CaseEditor);
  readonly path = input.required<Path>();
  private readonly expected = computed(() => idsAt(this.editor.doc(), this.at('expectedIds')));

  protected readonly role: Role = (id) =>
    this.expected().includes(id) ? { text: 'ควรทำ', ok: true } : { text: 'ไม่ควรทำ', ok: false };

  protected at(key: string): Path {
    return [...this.path(), key];
  }
}

/**
 * traysTask: every card goes in one tray. `ordered`: each tray has its cards in order
 * (expectedOrder); otherwise in any order (expectedIds).
 */
@Component({
  selector: 'cs-task-trays',
  imports: [TextField, IdField, CheckField, PoolEditor, IdList, ProblemsAt],
  template: `
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2" [attr.data-path]="orderedWhere()">
      <label class="inline-flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          class="h-4 w-4 accent-sky-700"
          [checked]="ordered()"
          (change)="setOrdered($event)"
        />
        ต้องเรียงลำดับในถาด <span class="key" aria-hidden="true">ordered</span>
      </label>
    </div>
    <cs-problems-at [at]="at('ordered')" />
    <cs-text class="mt-3" label="โจทย์คำสั่ง (Prompt)" [path]="at('prompt')" [multiline]="true" />

    <h4 class="mt-4 text-sm font-semibold text-ink">
      ถาด <span class="key" aria-hidden="true">trays</span>
    </h4>
    <cs-problems-at [at]="at('trays')" />
    <div class="mt-2 grid gap-3 md:grid-cols-2">
      @for (t of trays(); track $index; let i = $index) {
        <section
          class="rounded-lg border border-line bg-white p-3"
          [attr.aria-label]="'ถาด ' + (i + 1)"
        >
          <div class="flex items-center gap-2">
            <span class="badge badge-plain">ถาด {{ i + 1 }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-icon ml-auto text-rose-700"
              [attr.aria-label]="'ลบถาด ' + (i + 1)"
              (click)="removeTray(i)"
            >
              ✕
            </button>
          </div>
          <cs-problems-at [at]="tray(i)" />
          <div class="mt-1 grid gap-2 sm:grid-cols-[8rem_1fr]">
            <cs-id label="รหัส" [path]="tray(i, 'id')" [siblings]="at('trays')" />
            <cs-text
              label="ชื่อถาด"
              [path]="tray(i, 'name')"
              placeholder="เช่น ถาดปลอดเชื้อ (Sterile Tray)"
            />
          </div>
          <cs-check class="mt-2" label="ถาดปลอดเชื้อ" [path]="tray(i, 'sterile')" />
          <cs-id-list
            class="mt-2"
            [label]="ordered() ? 'การ์ดในถาดนี้ (เรียงลำดับ)' : 'การ์ดในถาดนี้'"
            [path]="tray(i, expectedKey())"
            [pool]="at('pool')"
            [ordered]="ordered()"
            [taken]="placedOutside(i)"
            emptyHint="ยังไม่มีการ์ดในถาดนี้"
          />
        </section>
      }
    </div>
    <button type="button" class="btn mt-2" (click)="addTray()">+ เพิ่มถาด</button>

    <cs-pool
      class="mt-4"
      [path]="at('pool')"
      [refs]="expectedLists()"
      fallbackId="e"
      [role]="role"
    />
  `,
})
export class TraysTask {
  private readonly editor = inject(CaseEditor);
  private readonly confirm = inject(Confirm);
  readonly path = input.required<Path>();

  protected readonly ordered = computed(() => this.editor.value(this.at('ordered')) === true);
  protected readonly orderedWhere = computed(() => pathText(this.at('ordered')));
  protected readonly expectedKey = computed(() =>
    this.ordered() ? 'expectedOrder' : 'expectedIds',
  );
  protected readonly trays = computed(() => listAt(this.editor.doc(), this.at('trays')));
  protected readonly expectedLists = computed(() =>
    this.trays().map((_, i) => this.tray(i, this.expectedKey())),
  );
  /** For each tray, the ids it holds. */
  private readonly placed = computed(() =>
    this.expectedLists().map((p) => idsAt(this.editor.doc(), p)),
  );

  protected readonly role: Role = (id) => {
    const i = this.placed().findIndex((ids) => ids.includes(id));
    if (i < 0) return { text: 'ยังไม่อยู่ในถาดใด', ok: false };
    const t = this.trays()[i];
    const name = isObject(t) ? asText(t['name']) : '';
    return { text: name || `ถาด ${i + 1}`, ok: true };
  };

  protected at(key: string): Path {
    return [...this.path(), key];
  }

  protected tray(i: number, key?: string): Path {
    return key === undefined ? [...this.path(), 'trays', i] : [...this.path(), 'trays', i, key];
  }

  protected placedOutside(i: number): string[] {
    return this.placed().flatMap((ids, k) => (k === i ? [] : ids));
  }

  /** Ordered or not: each tray's list moves to the other key, so nothing placed is lost. */
  protected setOrdered(e: Event): void {
    const ordered = (e.target as HTMLInputElement).checked;
    const [from, to] = ordered
      ? ['expectedIds', 'expectedOrder']
      : ['expectedOrder', 'expectedIds'];
    this.editor.doc.update((d) => {
      let out = setAt(d, this.at('ordered'), ordered);
      listAt(out, this.at('trays')).forEach((t, i) => {
        if (!isObject(t) || t[from] === undefined || t[to] !== undefined) return;
        const moved: JsonObject = {};
        for (const [k, v] of Object.entries(t)) moved[k === from ? to : k] = v;
        out = setAt(out, this.tray(i), moved);
      });
      return out;
    });
  }

  protected addTray(): void {
    const id = freshId(this.editor.doc(), this.trays(), 't');
    const tray: JsonObject = { id, name: '', sterile: false, [this.expectedKey()]: [] };
    this.editor.set(this.at('trays'), [...this.trays(), tray]);
  }

  protected async removeTray(i: number): Promise<void> {
    const t = this.trays()[i];
    const name = isObject(t) ? asText(t['name']) : '';
    const yes = await this.confirm.ask({
      title: `ลบถาด ${i + 1}?`,
      body: name || undefined,
      yes: 'ลบ',
      danger: true,
    });
    if (yes)
      this.editor.set(
        this.at('trays'),
        this.trays().filter((_, k) => k !== i),
      );
  }
}

/** Whether a step has a task under key. */
export function hasTask(step: unknown, key: string): boolean {
  return isObject(step) && step[key] !== undefined && step[key] !== null;
}
