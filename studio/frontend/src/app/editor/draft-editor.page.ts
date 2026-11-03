import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MetaStore } from '../api/meta';
import { ApiError, StudioApi } from '../api/studio-api';
import { Json, Problem } from '../api/types';
import { blankStep, nextStepId } from '../case/blank';
import { anchorOf, asText, isObject, isWithin, listAt } from '../case/json';
import { describePath, stepOf } from '../case/where';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { CaseEditor } from './case-editor';
import { CaseFields } from './case-fields';
import { ProblemsAt } from './fields';
import { JsonTab } from './json-tab';
import { StepEditor } from './step';

type Tab = 'case' | 'json' | number;

/** How long the editor waits after the last change before asking the server for the problems. */
const CHECK_AFTER_MS = 350;

/**
 * One draft: its fields and 6 steps, the server's problems on the fields they belong to, saved with
 * the version it was opened at (someone else's save since then refuses it: reload).
 */
@Component({
  selector: 'cs-draft-editor',
  imports: [RouterLink, CaseFields, StepEditor, JsonTab, ProblemsAt],
  providers: [CaseEditor],
  host: {
    class: 'block',
    'data-path': '$',
    '(window:keydown)': 'shortcut($event)',
    '(window:beforeunload)': 'beforeUnload($event)',
  },
  template: `
    @if (failed(); as f) {
      <div class="card p-6">
        <p class="text-rose-700">{{ f }}</p>
        <a routerLink="/" class="btn mt-4">กลับไปรายการเคส</a>
      </div>
    } @else if (!loaded()) {
      <p class="text-ink-2" role="status">กำลังโหลดเคส…</p>
    } @else {
      <div
        class="sticky top-0 z-20 -mx-4 border-b border-line bg-sky-50/95 px-4 py-3 backdrop-blur"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a routerLink="/" class="btn btn-ghost">← รายการเคส</a>
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-lg font-semibold">
              @if (bedNum() !== null) {
                <span class="text-sky-800">เตียง {{ bedNum() }}</span> ·
              }
              {{ title() || '(ยังไม่มีชื่อเคส)' }}
            </h1>
            <p class="text-xs text-ink-3">
              ฉบับที่ {{ version() }} · บันทึกล่าสุด {{ savedAt() }}
              @if (dirty()) {
                · <span class="font-medium text-amber-700">มีการแก้ไขที่ยังไม่บันทึก</span>
              }
            </p>
          </div>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!dirty() || saving() || stale() || gone()"
            (click)="save()"
            title="Ctrl+S"
          >
            {{ saving() ? 'กำลังบันทึก…' : 'บันทึก' }}
          </button>
        </div>

        @if (stale()) {
          <div class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" role="alert">
            <p class="font-medium text-amber-900">
              มีผู้อื่นบันทึกเคสนี้หลังจากที่คุณเปิด จึงบันทึกทับไม่ได้
            </p>
            <p class="mt-1 text-amber-900">
              โหลดฉบับล่าสุดเพื่อดูการแก้ไขของเขา (คัดลอกการแก้ไขของคุณจากแท็บ JSON ไว้ก่อนได้)
            </p>
            <button type="button" class="btn mt-2" (click)="reload()">โหลดฉบับล่าสุด</button>
          </div>
        }
        @if (gone()) {
          <div class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" role="alert">
            <p class="font-medium text-amber-900">เคสนี้ถูกลบไปแล้วระหว่างที่คุณแก้ไข</p>
            <button type="button" class="btn mt-2" (click)="saveAsNew()">บันทึกเป็นเคสใหม่</button>
          </div>
        }

        <div
          class="mt-3 flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="ส่วนของเคส"
          (keydown)="tabKeys($event)"
        >
          @for (t of tabs(); track t.key) {
            <button
              type="button"
              role="tab"
              class="flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm"
              [class]="
                t.key === tab()
                  ? 'border-line-2 bg-white font-semibold text-ink'
                  : 'border-transparent text-ink-2 hover:bg-sky-100'
              "
              [id]="'tab-' + t.key"
              [attr.aria-selected]="t.key === tab()"
              aria-controls="editor-panel"
              [tabindex]="t.key === tab() ? 0 : -1"
              (click)="tab.set(t.key)"
            >
              {{ t.label }}
              @if (t.problems) {
                <span class="badge badge-bad" [attr.aria-label]="t.problems + ' ปัญหา'">{{
                  t.problems
                }}</span>
              }
            </button>
          }
        </div>
      </div>

      <section class="card mt-4 p-4" aria-labelledby="problems-title">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="problems-title" class="section-title">
            @if (editor.problems().length) {
              ต้องแก้ก่อนส่งออก {{ editor.problems().length }} ข้อ
            } @else {
              <span class="text-emerald-800">✓ เคสนี้พร้อมส่งออก: แอปเล่นได้</span>
            }
          </h2>
          @if (checking()) {
            <span class="text-xs text-ink-3" role="status">กำลังตรวจ…</span>
          }
          @if (editor.problems().length) {
            <button
              type="button"
              class="btn btn-ghost ml-auto text-xs"
              (click)="showAll.set(!showAll())"
              [attr.aria-expanded]="showAll()"
            >
              {{ showAll() ? 'ซ่อนรายการ' : 'แสดงรายการ' }}
            </button>
          }
        </div>
        @if (showAll() && editor.problems().length) {
          <ul class="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            @for (p of editor.problems(); track $index) {
              <li>
                <button
                  type="button"
                  class="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-rose-50"
                  (click)="goTo(p)"
                >
                  <span class="font-medium text-ink">{{ where(p) }}</span>
                  <span class="text-rose-700" lang="en"> {{ p.message }}</span>
                  <span class="key ml-1" aria-hidden="true">{{ p.path }}</span>
                </button>
              </li>
            }
          </ul>
        }
        <p class="mt-2 text-xs text-ink-3">
          สตูดิโอตรวจเพียงว่าแอปเล่นเคสนี้ได้ ความถูกต้องทางคลินิกเป็นหน้าที่ของผู้ตรวจทานเนื้อหา
        </p>
      </section>

      <div
        id="editor-panel"
        role="tabpanel"
        class="card mt-4 p-4"
        [attr.aria-labelledby]="'tab-' + tab()"
      >
        @switch (tabKind()) {
          @case ('case') {
            <cs-case-fields />
          }
          @case ('json') {
            <cs-json-tab />
          }
          @default {
            @if (stepIndex(); as n) {
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <h2 class="section-title">ขั้นที่ {{ n }}</h2>
                <span class="key" aria-hidden="true">stageData[{{ n - 1 }}]</span>
                <div class="ml-auto flex gap-1">
                  <button
                    type="button"
                    class="btn"
                    [disabled]="n === 1"
                    (click)="moveStep(n - 1, -1)"
                  >
                    ← ย้ายไปก่อน
                  </button>
                  <button
                    type="button"
                    class="btn"
                    [disabled]="n === steps().length"
                    (click)="moveStep(n - 1, 1)"
                  >
                    ย้ายไปหลัง →
                  </button>
                  <button type="button" class="btn btn-danger" (click)="removeStep(n - 1)">
                    ลบขั้นนี้
                  </button>
                </div>
              </div>
              <cs-step [path]="['stageData', n - 1]" />
            }
          }
        }
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <span>เคสหนึ่งมี {{ meta.stepsPerCase() }} ขั้นตอน ตอนนี้มี {{ steps().length }} ขั้น</span>
        <button type="button" class="btn" (click)="addStep()">+ เพิ่มขั้นตอน</button>
        <cs-problems-at [at]="['stageData']" />
      </div>
    }
  `,
})
export class DraftEditorPage {
  protected readonly editor = inject(CaseEditor);
  protected readonly meta = inject(MetaStore);
  private readonly api = inject(StudioApi);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);
  private readonly injector = inject(Injector);

  /** The draft's id, from the route. */
  readonly id = input.required<string>();

  protected readonly loaded = signal(false);
  protected readonly failed = signal('');
  protected readonly version = signal(0);
  private readonly updatedAt = signal('');
  /** The case as last saved (or loaded): what "unsaved changes" compares with. */
  private readonly savedJson = signal('');
  protected readonly saving = signal(false);
  protected readonly stale = signal(false);
  protected readonly gone = signal(false);
  protected readonly checking = signal(false);
  protected readonly showAll = signal(true);
  protected readonly tab = signal<Tab>('case');

  protected readonly dirty = computed(
    () => this.loaded() && JSON.stringify(this.editor.doc()) !== this.savedJson(),
  );
  protected readonly bedNum = computed(() => {
    const b = this.editor.value(['bedNum']);
    return typeof b === 'number' ? b : null;
  });
  protected readonly title = computed(() => asText(this.editor.value(['caseTitle'])));
  protected readonly steps = computed(() => listAt(this.editor.doc(), ['stageData']));
  protected readonly savedAt = computed(() => formatTime(this.updatedAt()));
  protected readonly tabKind = computed(() =>
    typeof this.tab() === 'number' ? 'step' : this.tab(),
  );
  /** The open step, counted from 1 (0 when the open tab is not a step). */
  protected readonly stepIndex = computed(() => {
    const t = this.tab();
    return typeof t === 'number' ? t + 1 : 0;
  });

  protected readonly tabs = computed(() => {
    const problems = this.editor.problems();
    const count = (step: number | null) => problems.filter((p) => stepOf(p.path) === step).length;
    return [
      { key: 'case' as Tab, label: 'ข้อมูลเคส', problems: count(null) },
      ...this.steps().map((s, i) => ({
        key: i as Tab,
        label: `ขั้นที่ ${i + 1}` + stepName(s),
        problems: count(i),
      })),
      { key: 'json' as Tab, label: 'JSON', problems: 0 },
    ];
  });

  /** Which edit the problems on screen belong to; a later answer replaces an earlier one. */
  private checkSeq = 0;
  private checkedJson = '';

  constructor() {
    effect(() => {
      const id = Number(this.id());
      void this.load(id);
    });
    // Every change is checked by the server (the app's own rules) a moment after the last keystroke.
    effect((onCleanup) => {
      const doc = this.editor.doc();
      if (!this.loaded()) return;
      const json = JSON.stringify(doc);
      if (json === this.checkedJson) return;
      const timer = setTimeout(() => void this.check(json), CHECK_AFTER_MS);
      onCleanup(() => clearTimeout(timer));
    });
    // A tab that no longer exists (its step was removed) falls back to the last step.
    effect(() => {
      const t = this.tab();
      const n = this.steps().length;
      if (typeof t === 'number' && t >= n) this.tab.set(n ? n - 1 : 'case');
    });
  }

  private async load(id: number): Promise<void> {
    this.loaded.set(false);
    this.failed.set('');
    try {
      const d = await this.api.draft(id);
      const json = JSON.stringify(d.case);
      this.editor.doc.set(d.case);
      this.editor.problems.set(d.problems);
      this.checkedJson = json;
      this.savedJson.set(json);
      this.version.set(d.version);
      this.updatedAt.set(d.updatedAt);
      this.stale.set(false);
      this.gone.set(false);
      this.loaded.set(true);
    } catch (e) {
      this.failed.set(
        e instanceof ApiError && e.status === 404 ? 'ไม่พบเคสนี้ (อาจถูกลบไปแล้ว)' : failure(e),
      );
    }
  }

  private async check(json: string): Promise<void> {
    const seq = ++this.checkSeq;
    this.checking.set(true);
    try {
      const problems = await this.api.check(JSON.parse(json));
      if (seq !== this.checkSeq) return;
      this.editor.problems.set(problems);
      this.checkedJson = json;
    } catch (e) {
      if (seq === this.checkSeq) this.toasts.show('ตรวจเคสไม่สำเร็จ: ' + failure(e), true);
    } finally {
      if (seq === this.checkSeq) this.checking.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (!this.dirty() || this.saving() || this.stale() || this.gone()) return;
    const doc = this.editor.doc();
    this.saving.set(true);
    try {
      const d = await this.api.save(Number(this.id()), this.version(), doc);
      this.version.set(d.version);
      this.updatedAt.set(d.updatedAt);
      this.savedJson.set(JSON.stringify(doc));
      if (this.editor.doc() === doc) {
        this.checkSeq++;
        this.checking.set(false);
        this.editor.problems.set(d.problems);
        this.checkedJson = JSON.stringify(doc);
      }
      this.toasts.show(`บันทึกแล้ว (ฉบับที่ ${d.version})`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'stale') this.stale.set(true);
      else if (e instanceof ApiError && e.status === 404) this.gone.set(true);
      else this.toasts.show('บันทึกไม่สำเร็จ: ' + failure(e), true);
    } finally {
      this.saving.set(false);
    }
  }

  /** After a refused save: the latest version, in place of this one (asked first: edits are lost). */
  protected async reload(): Promise<void> {
    if (
      this.dirty() &&
      !(await this.confirm.ask({
        title: 'โหลดฉบับล่าสุด?',
        body: 'การแก้ไขของคุณที่ยังไม่บันทึกจะหายไป',
        yes: 'โหลดฉบับล่าสุด',
        danger: true,
      }))
    )
      return;
    await this.load(Number(this.id()));
  }

  protected async saveAsNew(): Promise<void> {
    try {
      const d = await this.api.create(this.editor.doc());
      this.savedJson.set(JSON.stringify(this.editor.doc()));
      this.toasts.show('บันทึกเป็นเคสใหม่แล้ว');
      await this.router.navigate(['/drafts', d.id], { replaceUrl: true });
    } catch (e) {
      this.toasts.show('บันทึกไม่สำเร็จ: ' + failure(e), true);
    }
  }

  protected addStep(): void {
    const steps = this.steps();
    this.editor.set(['stageData'], [...steps, blankStep(nextStepId(steps))]);
    this.tab.set(steps.length);
  }

  protected moveStep(i: number, by: number): void {
    const steps = [...this.steps()];
    [steps[i], steps[i + by]] = [steps[i + by], steps[i]];
    this.editor.set(['stageData'], steps);
    this.tab.set(i + by);
  }

  protected async removeStep(i: number): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบขั้นที่ ${i + 1}?`,
      body: 'ข้อมูลทั้งหมดของขั้นนี้จะหายไปจากเคส (ยังไม่บันทึกจนกว่าจะกดบันทึก)',
      yes: 'ลบขั้นนี้',
      danger: true,
    });
    if (!yes) return;
    this.editor.set(
      ['stageData'],
      this.steps().filter((_, k) => k !== i),
    );
  }

  protected where(p: Problem): string {
    return describePath(p.path);
  }

  /** Opens the tab a problem is on and puts the cursor in its field. */
  protected goTo(p: Problem): void {
    const step = stepOf(p.path);
    this.tab.set(step === null || step >= this.steps().length ? 'case' : step);
    afterNextRender(() => focusPlace(anchorOf(p.path)), { injector: this.injector });
  }

  /** Left and right move between tabs (the ARIA tabs pattern); Home and End go to the ends. */
  protected tabKeys(e: KeyboardEvent): void {
    const keys = this.tabs().map((t) => t.key);
    const i = keys.indexOf(this.tab());
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % keys.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + keys.length) % keys.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? keys.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    this.tab.set(keys[next]);
    afterNextRender(() => document.getElementById('tab-' + keys[next])?.focus(), {
      injector: this.injector,
    });
  }

  protected shortcut(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void this.save();
    }
  }

  protected beforeUnload(e: BeforeUnloadEvent): void {
    if (this.dirty()) e.preventDefault();
  }

  /** For the route's guard: leaving with unsaved changes asks first. */
  async canLeave(): Promise<boolean> {
    if (!this.dirty()) return true;
    return this.confirm.ask({
      title: 'ออกโดยไม่บันทึก?',
      body: 'การแก้ไขที่ยังไม่บันทึกจะหายไป',
      yes: 'ออกโดยไม่บันทึก',
      danger: true,
    });
  }
}

/** A step's name for its tab, without the number it often starts with ("2. เตรียมถาด"). */
function stepName(step: Json): string {
  const name = isObject(step)
    ? asText(step['name'])
        .trim()
        .replace(/^\d+\.\s*/, '')
    : '';
  return name ? ` · ${name.length > 18 ? name.slice(0, 18) + '…' : name}` : '';
}

/** The field closest to a problem's place: the element whose data-path is the longest that holds it. */
function focusPlace(anchor: string): void {
  let best: HTMLElement | null = null;
  let bestLen = -1;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-path]'))) {
    const at = el.dataset['path'] ?? '';
    if (at && isWithin(anchor, at) && at.length > bestLen) {
      best = el;
      bestLen = at.length;
    }
  }
  if (!best) return;
  best.scrollIntoView({ block: 'center' });
  const target = best.querySelector<HTMLElement>('input, textarea, select, button') ?? best;
  target.focus({ preventScroll: true });
  best.classList.add('flash');
  setTimeout(() => best?.classList.remove('flash'), 1600);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** A refusal in words: Thai for what the screen knows, the server's own text otherwise. */
export function failure(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    return e.body.detail;
  }
  return String(e);
}
