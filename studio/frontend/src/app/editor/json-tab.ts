import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { isObject } from '../case/json';
import { Toasts } from '../ui/toast';
import { CaseEditor } from './case-editor';

/**
 * The whole case as JSON: for what the form cannot show (a wrong type from an imported file, keys
 * the app ignores) and for copying. Edits here take effect only with "ใช้ JSON นี้".
 */
@Component({
  selector: 'cs-json-tab',
  template: `
    <p class="text-sm text-ink-2">
      แก้ไขเคสทั้งหมดในรูปแบบ JSON ได้ที่นี่ (เช่น ค่าที่ผิดชนิดจากไฟล์ที่นำเข้า) กด "ใช้ JSON นี้"
      เพื่อนำไปใช้ในฟอร์ม แล้วจึงบันทึก
    </p>
    <label class="label mt-3" for="case-json">JSON ของเคส</label>
    <textarea
      id="case-json"
      class="input min-h-[28rem] font-mono text-xs leading-5"
      spellcheck="false"
      [value]="text()"
      [attr.aria-invalid]="error() ? 'true' : null"
      [attr.aria-describedby]="error() ? 'case-json-err' : null"
      (input)="typed($event)"
    ></textarea>
    @if (error(); as e) {
      <p id="case-json-err" class="field-error">{{ e }}</p>
    }
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn btn-primary" [disabled]="!changed()" (click)="apply()">
        ใช้ JSON นี้
      </button>
      <button type="button" class="btn" [disabled]="!changed()" (click)="revert()">
        ย้อนกลับเป็นของฟอร์ม
      </button>
      <button type="button" class="btn" (click)="copy()">คัดลอก</button>
    </div>
  `,
})
export class JsonTab {
  private readonly editor = inject(CaseEditor);
  private readonly toasts = inject(Toasts);
  private readonly fromDoc = computed(() => JSON.stringify(this.editor.doc(), null, 2));
  protected readonly text = linkedSignal(() => this.fromDoc());
  protected readonly error = signal('');
  protected readonly changed = computed(() => this.text() !== this.fromDoc());

  protected typed(e: Event): void {
    this.text.set((e.target as HTMLTextAreaElement).value);
  }

  protected apply(): void {
    let v: unknown;
    try {
      v = JSON.parse(this.text());
    } catch (e) {
      this.error.set('อ่าน JSON ไม่ได้: ' + (e instanceof Error ? e.message : String(e)));
      return;
    }
    if (!isObject(v)) {
      this.error.set('เคสต้องเป็นออบเจ็กต์ JSON ({ ... })');
      return;
    }
    this.error.set('');
    this.editor.doc.set(v);
    this.toasts.show('นำ JSON ไปใช้ในฟอร์มแล้ว (ยังไม่ได้บันทึก)');
  }

  protected revert(): void {
    this.error.set('');
    this.text.set(this.fromDoc());
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.toasts.show('คัดลอก JSON แล้ว');
    } catch {
      this.toasts.show('คัดลอกไม่ได้: เลือกข้อความแล้วกด Ctrl+C แทน', true);
    }
  }
}
