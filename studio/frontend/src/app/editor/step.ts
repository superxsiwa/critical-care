import { Component, computed, inject, input } from '@angular/core';
import { POOL_TASKS, TaskKey, blankTask } from '../case/blank';
import { Path, asText, isObject, pathText } from '../case/json';
import { Confirm } from '../ui/confirm';
import { CaseEditor } from './case-editor';
import { NumberField, ProblemsAt, TextField } from './fields';
import { ChoicesTask, DropTask, SequenceTask, TraysTask, hasTask } from './tasks';

/** The mechanic labels the shipped cases use; the field takes any text. */
const MECHANICS = [
  'เลือก 1|N + เรียงลำดับ',
  'จัด 2 ถาด (ไม่เรียงลำดับ)',
  'จัด 2 ถาด (เรียงลำดับ 1-3)',
  'ลาก-วาง ไม่เป็นลำดับ',
  'ลาก-วาง เรียงลำดับ',
  'สรุป ISBAR เรียงลำดับ',
];

/** The task kinds, in his step builder's words. */
export const TASK_NAMES: Record<TaskKey, string> = {
  choices1toN: 'เลือกตัวเลือก (Choices 1..N)',
  sequenceTask: 'ลาก-วาง เรียงลำดับ / ISBAR (Sequence)',
  traysTask: 'จัดอุปกรณ์ลงถาด (Multi-Tray)',
  unorderedDropTask: 'ลาก-วาง ไม่เป็นลำดับ (Unordered)',
};

/** One of a case's steps: what the player reads, the vitals, and the step's task(s). */
@Component({
  selector: 'cs-step',
  imports: [TextField, NumberField, ProblemsAt, ChoicesTask, SequenceTask, TraysTask, DropTask],
  host: { class: 'block', '[attr.data-path]': 'where()' },
  template: `
    @if (isStep()) {
      <cs-problems-at [at]="path()" />
      <div class="grid gap-3 md:grid-cols-[8rem_1fr_1fr]">
        <cs-number label="รหัสขั้น" [path]="at('id')" />
        <cs-text label="ชื่อขั้นตอน" [path]="at('name')" />
        <cs-text label="รูปแบบกลไก (Mechanic)" [path]="at('mechanic')" [suggestions]="mechanics" />
      </div>
      <cs-text
        class="mt-3"
        label="เอกสารความรู้ทางการแพทย์ (Reading Summary)"
        [path]="at('reading')"
        [multiline]="true"
      />
      <cs-text
        class="mt-3"
        label="คำพูดแพทย์ / โจทย์สถานการณ์"
        [path]="at('doctorSpeech')"
        [multiline]="true"
      />

      <fieldset class="mt-4 rounded-lg border border-line p-3" [attr.data-path]="vitalsWhere()">
        <legend class="px-1 text-sm font-semibold text-ink">
          สัญญาณชีพบนจอมอนิเตอร์ <span class="key" aria-hidden="true">vitals</span>
        </legend>
        <cs-problems-at [at]="at('vitals')" />
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <cs-number label="HR (ครั้ง/นาที)" [path]="vital('hr')" />
          <div>
            <cs-text label="BP (mmHg)" [path]="vital('bp')" placeholder="ตัวบน/ตัวล่าง" />
            @if (canCalcMap()) {
              <button
                type="button"
                class="btn btn-ghost mt-1 text-xs text-sky-800"
                (click)="calcMap()"
              >
                คำนวณ MAP จาก BP
              </button>
            }
          </div>
          <div>
            <cs-text label="SpO2" [path]="vital('spo2')" placeholder="ตัวเลขตามด้วย %" />
            @if (canFixSpo2()) {
              <button
                type="button"
                class="btn btn-ghost mt-1 text-xs text-sky-800"
                (click)="fixSpo2()"
              >
                เติม % ให้อัตโนมัติ
              </button>
            }
          </div>
          <cs-number label="MAP (mmHg)" [path]="vital('map')" />
        </div>
      </fieldset>

      @for (key of present(); track key) {
        <section
          class="mt-4 rounded-lg border border-line-2 bg-white"
          [attr.aria-label]="taskName(key)"
          [attr.data-path]="taskWhere(key)"
        >
          <header class="flex items-center gap-2 border-b border-line px-3 py-2">
            <h3 class="section-title">{{ taskName(key) }}</h3>
            <span class="key" aria-hidden="true">{{ key }}</span>
            <button type="button" class="btn btn-danger ml-auto" (click)="removeTask(key)">
              ลบงานนี้
            </button>
          </header>
          <div class="p-3">
            <cs-problems-at [at]="at(key)" />
            @switch (key) {
              @case ('choices1toN') {
                <cs-task-choices [path]="at(key)" />
              }
              @case ('sequenceTask') {
                <cs-task-sequence [path]="at(key)" />
              }
              @case ('traysTask') {
                <cs-task-trays [path]="at(key)" />
              }
              @case ('unorderedDropTask') {
                <cs-task-drop [path]="at(key)" />
              }
            }
          </div>
        </section>
      }

      @if (addable().length) {
        <div
          class="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-2 p-3"
        >
          <span class="text-sm text-ink-2">เพิ่มงานในขั้นนี้:</span>
          @for (key of addable(); track key) {
            <button type="button" class="btn" (click)="addTask(key)">+ {{ taskName(key) }}</button>
          }
        </div>
      }
    } @else {
      <cs-problems-at [at]="path()" />
      <p class="text-sm text-rose-700">ขั้นนี้อ่านไม่ได้: แก้ไขในแท็บ JSON</p>
    }
  `,
})
export class StepEditor {
  private readonly editor = inject(CaseEditor);
  private readonly confirm = inject(Confirm);
  readonly path = input.required<Path>();
  protected readonly mechanics = MECHANICS;

  protected readonly where = computed(() => pathText(this.path()));
  protected readonly vitalsWhere = computed(() => pathText(this.at('vitals')));
  private readonly step = computed(() => this.editor.value(this.path()));
  protected readonly isStep = computed(() => isObject(this.step()));
  protected readonly present = computed(() =>
    (['choices1toN', ...POOL_TASKS] as TaskKey[]).filter((k) => hasTask(this.step(), k)),
  );
  /** Choices may come with one pool task; a step shows one pool task at most. */
  protected readonly addable = computed(() => {
    const has = this.present();
    const out: TaskKey[] = [];
    if (!has.includes('choices1toN')) out.push('choices1toN');
    if (!has.some((k) => POOL_TASKS.includes(k))) out.push(...POOL_TASKS);
    return out;
  });

  protected calcMap(): void {
    const rawBp = asText(this.editor.value(this.vital('bp'))).trim();
    const m = /^(\d+)\/(\d+)$/.exec(rawBp);
    if (!m) return;
    const sbp = Number(m[1]);
    const dbp = Number(m[2]);
    const mapVal = Math.round((2 * dbp + sbp) / 3);
    this.editor.set(this.vital('map'), mapVal);
  }

  protected canCalcMap(): boolean {
    const rawBp = asText(this.editor.value(this.vital('bp'))).trim();
    return /^(\d+)\/(\d+)$/.test(rawBp);
  }

  protected fixSpo2(): void {
    const raw = asText(this.editor.value(this.vital('spo2'))).trim();
    if (/^\d{1,3}$/.test(raw)) {
      this.editor.set(this.vital('spo2'), `${raw}%`);
    }
  }

  protected canFixSpo2(): boolean {
    const raw = asText(this.editor.value(this.vital('spo2'))).trim();
    return /^\d{1,3}$/.test(raw);
  }

  protected at(key: string): Path {
    return [...this.path(), key];
  }

  protected vital(key: string): Path {
    return [...this.path(), 'vitals', key];
  }

  protected taskWhere(key: string): string {
    return pathText(this.at(key));
  }

  protected taskName(key: TaskKey): string {
    return TASK_NAMES[key];
  }

  protected addTask(key: TaskKey): void {
    this.editor.set(this.at(key), blankTask(key));
  }

  protected async removeTask(key: TaskKey): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบงาน "${TASK_NAMES[key]}"?`,
      body: 'โจทย์ การ์ด และคำตอบของงานนี้จะหายไปจากขั้นนี้ (ยังไม่บันทึกจนกว่าจะกดบันทึก)',
      yes: 'ลบงาน',
      danger: true,
    });
    if (yes) this.editor.remove(this.at(key));
  }
}
