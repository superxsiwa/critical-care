import { Component, computed, inject } from '@angular/core';
import { asText, isObject, listAt } from '../case/json';
import { CaseEditor } from './case-editor';

@Component({
  selector: 'cs-bedside-preview',
  template: `
    <div class="rounded-xl border border-sky-200 bg-slate-900 p-4 text-white shadow-lg">
      <div class="flex flex-wrap items-center justify-between border-b border-slate-700 pb-3">
        <div class="flex items-center gap-2">
          <span class="rounded bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
            เตียง {{ bedNum() || '-' }}
          </span>
          <span class="text-sm font-medium text-slate-200">{{
            patientName() || '(ยังไม่ระบุชื่อคนไข้)'
          }}</span>
          @if (patientAge(); as age) {
            <span class="text-xs text-slate-400">({{ age }} ปี)</span>
          }
          @if (dxBadge(); as dx) {
            <span class="rounded bg-rose-900/80 px-2 py-0.5 text-xs text-rose-200">{{ dx }}</span>
          }
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-400">แพทย์: {{ doctorName() || '-' }}</span>
          <span class="text-base">{{ doctorAvatar() }}</span>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-black/60 p-3 sm:grid-cols-4 font-mono">
        <div class="flex flex-col border-l-2 border-emerald-500 pl-2">
          <span class="text-[10px] text-emerald-400 font-sans">HR (bpm)</span>
          <span class="text-2xl font-bold text-emerald-400">{{ hr() || '--' }}</span>
        </div>
        <div class="flex flex-col border-l-2 border-rose-500 pl-2">
          <span class="text-[10px] text-rose-400 font-sans">NIBP (mmHg)</span>
          <span class="text-2xl font-bold text-rose-400">{{ bp() || '--/--' }}</span>
        </div>
        <div class="flex flex-col border-l-2 border-cyan-400 pl-2">
          <span class="text-[10px] text-cyan-300 font-sans">SpO2</span>
          <span class="text-2xl font-bold text-cyan-300">{{ spo2() || '--%' }}</span>
        </div>
        <div class="flex flex-col border-l-2 border-amber-400 pl-2">
          <span class="text-[10px] text-amber-300 font-sans">MAP (mmHg)</span>
          <span class="text-2xl font-bold text-amber-300">{{ mapVal() || '--' }}</span>
        </div>
      </div>

      <div class="mt-4 rounded-lg bg-slate-800/80 p-3 border border-slate-700">
        <div class="flex items-start gap-2.5">
          <span class="text-2xl select-none">{{ doctorAvatar() }}</span>
          <div class="min-w-0 flex-1">
            <span class="text-xs font-semibold text-sky-300">คำสั่งแพทย์ / โจทย์สถานการณ์</span>
            <p class="mt-1 text-sm text-slate-100 whitespace-pre-line">
              {{ doctorSpeech() || '(ยังไม่ได้ระบุคำสั่งแพทย์สำหรับขั้นตอนนี้)' }}
            </p>
          </div>
        </div>
      </div>

      @if (reading(); as r) {
        <div
          class="mt-3 rounded-lg bg-slate-800/40 p-2.5 text-xs text-slate-300 border border-slate-700/60"
        >
          <span class="font-semibold text-slate-200">เอกสารความรู้ (Reading Summary):</span>
          <p class="mt-0.5 whitespace-pre-line text-slate-400">{{ r }}</p>
        </div>
      }
    </div>
  `,
})
export class BedsidePreview {
  private readonly editor = inject(CaseEditor);

  protected readonly bedNum = computed(() => this.editor.value(['bedNum']));
  protected readonly patientName = computed(() => asText(this.editor.value(['patientName'])));
  protected readonly patientAge = computed(() => this.editor.value(['patientAge']));
  protected readonly dxBadge = computed(() => asText(this.editor.value(['dxBadge'])));
  protected readonly doctorName = computed(() => asText(this.editor.value(['doctorName'])));
  protected readonly doctorAvatar = computed(() => asText(this.editor.value(['doctorAvatar'])));

  // Current step values (from current tab)
  protected readonly currentStep = computed(() => {
    const doc = this.editor.doc();
    const steps = listAt(doc, ['stageData']);
    return (steps[0] as Record<string, unknown>) ?? null;
  });

  protected readonly hr = computed(() => {
    return this.vitalsValue('hr');
  });

  protected readonly bp = computed(() => {
    return this.vitalsValue('bp');
  });

  protected readonly spo2 = computed(() => {
    return this.vitalsValue('spo2');
  });

  protected readonly mapVal = computed(() => {
    return this.vitalsValue('map');
  });

  protected readonly doctorSpeech = computed(() => {
    const s = this.currentStep();
    return s && isObject(s) ? asText(s['doctorSpeech']) : '';
  });

  protected readonly reading = computed(() => {
    const s = this.currentStep();
    return s && isObject(s) ? asText(s['reading']) : '';
  });

  private vitalsValue(key: string): string {
    const s = this.currentStep();
    if (!s || !isObject(s)) return '';
    const v = s['vitals'];
    if (!v || !isObject(v)) return '';
    const val = v[key];
    return val !== undefined && val !== null ? String(val) : '';
  }
}
