import { Component, inject, signal } from '@angular/core';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { INITIAL_ARTICLES, KnowledgeArticle } from './knowledge-data';

@Component({
  selector: 'cs-knowledge-mg-page',
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 class="text-xl font-bold text-ink">จัดการคลังความรู้ (Knowledge Management)</h1>
          <p class="text-sm text-ink-2">
            เพิ่ม ลบ แก้ไข และตรวจสอบเอกสารองค์ความรู้และแนวทางการสอนสำหรับพยาบาล
          </p>
        </div>
        <button type="button" class="btn btn-primary text-xs" (click)="openAddModal()">
          + เพิ่มเอกสารความรู้ใหม่
        </button>
      </div>

      <!-- Articles Table -->
      <section class="card overflow-x-auto" aria-label="รายการเอกสารความรู้ทั้งหมด">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
              <th scope="col" class="px-4 py-2.5 font-semibold">หัวข้อความรู้</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">หมวดหมู่</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">สรุปใจความ</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">แก้ไขล่าสุด</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            @for (art of articles(); track art.id) {
              <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                <td class="px-4 py-2.5 font-medium text-ink">{{ art.title }}</td>
                <td class="px-4 py-2.5">
                  <span class="badge badge-plain text-xs">{{ art.category }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs text-ink-2 max-w-xs truncate">{{ art.summary }}</td>
                <td class="px-4 py-2.5 text-xs text-ink-3">{{ art.updatedAt }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right">
                  <div class="inline-flex gap-1">
                    <button type="button" class="btn btn-ghost text-xs" (click)="viewDetails(art)">
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-sky-800"
                      (click)="editArticle(art)"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-rose-700"
                      (click)="deleteArticle(art)"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="p-8 text-center text-ink-2">ยังไม่มีเอกสารในคลังความรู้</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <!-- View Details Modal -->
      @if (viewing(); as art) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-labelledby="view-dialog-title"
          aria-modal="true"
        >
          <div class="card w-full max-w-lg p-6 shadow-xl space-y-4">
            <div class="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span class="badge badge-plain text-xs">{{ art.category }}</span>
                <h2 id="view-dialog-title" class="text-lg font-bold text-ink mt-1">
                  {{ art.title }}
                </h2>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-icon text-xs"
                aria-label="ปิด"
                (click)="viewing.set(null)"
              >
                ✕
              </button>
            </div>
            <div class="space-y-3 text-sm text-ink-2 max-h-96 overflow-y-auto pr-1">
              <p class="font-medium text-sky-900 bg-sky-50 p-2.5 rounded-lg text-xs">
                {{ art.summary }}
              </p>
              <p class="whitespace-pre-line text-ink">{{ art.content }}</p>
            </div>
            <div class="flex justify-end pt-3 border-t border-line">
              <button type="button" class="btn btn-primary text-xs" (click)="viewing.set(null)">
                ปิด
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add / Edit Modal -->
      @if (editing(); as f) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-labelledby="edit-dialog-title"
          aria-modal="true"
        >
          <div class="card w-full max-w-lg p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-line pb-3">
              <h2 id="edit-dialog-title" class="text-base font-bold text-ink">
                {{ f.isNew ? 'เพิ่มเอกสารความรู้ใหม่' : 'แก้ไขเอกสารความรู้' }}
              </h2>
              <button
                type="button"
                class="btn btn-ghost btn-icon text-xs"
                aria-label="ปิด"
                (click)="editing.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-sm">
              <div>
                <label for="doc-title" class="label">หัวข้อความรู้</label>
                <input
                  id="doc-title"
                  type="text"
                  class="input"
                  [value]="f.title"
                  (input)="f.title = val($event)"
                  placeholder="เช่น ขั้นตอนการใส่ท่อช่วยหายใจ…"
                />
              </div>

              <div>
                <label for="doc-cat" class="label">หมวดหมู่</label>
                <input
                  id="doc-cat"
                  type="text"
                  class="input"
                  [value]="f.category"
                  (input)="f.category = val($event)"
                  placeholder="เช่น โครงสร้างเคส, กลไกภารกิจ, การสื่อสาร…"
                />
              </div>

              <div>
                <label for="doc-summary" class="label">สรุปย่อ</label>
                <input
                  id="doc-summary"
                  type="text"
                  class="input"
                  [value]="f.summary"
                  (input)="f.summary = val($event)"
                  placeholder="คำอธิบายสรุปสั้นๆ…"
                />
              </div>

              <div>
                <label for="doc-content" class="label">เนื้อหาบทเรียน</label>
                <textarea
                  id="doc-content"
                  rows="4"
                  class="input field-sizing-content"
                  [value]="f.content"
                  (input)="f.content = val($event)"
                  placeholder="รายละเอียดเนื้อหาความรู้…"
                ></textarea>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-line">
              <button type="button" class="btn text-xs" (click)="editing.set(null)">ยกเลิก</button>
              <button type="button" class="btn btn-primary text-xs" (click)="saveEdit(f)">
                บันทึกเอกสาร
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class KnowledgeMgPage {
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  protected readonly articles = signal<KnowledgeArticle[]>(INITIAL_ARTICLES);
  protected readonly viewing = signal<KnowledgeArticle | null>(null);
  protected readonly editing = signal<{
    isNew: boolean;
    id: string;
    title: string;
    category: string;
    summary: string;
    content: string;
  } | null>(null);

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected viewDetails(art: KnowledgeArticle): void {
    this.viewing.set(art);
  }

  protected openAddModal(): void {
    this.editing.set({
      isNew: true,
      id: 'k' + (this.articles().length + 1),
      title: '',
      category: 'ทั่วไป',
      summary: '',
      content: '',
    });
  }

  protected editArticle(art: KnowledgeArticle): void {
    this.editing.set({
      isNew: false,
      id: art.id,
      title: art.title,
      category: art.category,
      summary: art.summary,
      content: art.content,
    });
  }

  protected saveEdit(form: {
    isNew: boolean;
    id: string;
    title: string;
    category: string;
    summary: string;
    content: string;
  }): void {
    if (!form.title.trim()) {
      this.toasts.show('กรุณาระบุหัวข้อความรู้', true);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (form.isNew) {
      this.articles.update((list) => [
        ...list,
        {
          id: form.id,
          title: form.title,
          category: form.category || 'ทั่วไป',
          summary: form.summary,
          content: form.content,
          updatedAt: today,
        },
      ]);
      this.toasts.show('เพิ่มเอกสารความรู้เรียบร้อยแล้ว');
    } else {
      this.articles.update((list) =>
        list.map((a) =>
          a.id === form.id
            ? {
                ...a,
                title: form.title,
                category: form.category || a.category,
                summary: form.summary,
                content: form.content,
                updatedAt: today,
              }
            : a,
        ),
      );
      this.toasts.show('แก้ไขเอกสารเรียบร้อยแล้ว');
    }
    this.editing.set(null);
  }

  protected async deleteArticle(art: KnowledgeArticle): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบเอกสาร "${art.title}"?`,
      body: 'เอกสารนี้จะถูกลบออกจากคลังความรู้',
      yes: 'ลบเอกสาร',
      danger: true,
    });
    if (!yes) return;
    this.articles.update((list) => list.filter((a) => a.id !== art.id));
    this.toasts.show('ลบเอกสารเรียบร้อยแล้ว');
  }
}
