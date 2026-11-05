import { Component, inject, signal } from '@angular/core';
import { knowledgeList } from '../api/lists';
import { ApiError, StudioApi } from '../api/studio-api';
import { KnowledgeArticle } from '../api/types';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { failure, formatDate } from '../ui/words';

/** The add / edit form. */
interface ArticleForm {
  isNew: boolean;
  id: number;
  version: number;
  title: string;
  category: string;
  summary: string;
  content: string;
}

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
            @if (list.resource.isLoading() && !list.resource.hasValue()) {
              <tr>
                <td colspan="5" class="p-8 text-center text-ink-2" role="status">กำลังโหลด…</td>
              </tr>
            } @else if (list.resource.error()) {
              <tr>
                <td colspan="5" class="p-8 text-center text-rose-700">โหลดคลังความรู้ไม่สำเร็จ</td>
              </tr>
            }
            @for (art of articles(); track art.id) {
              <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                <td class="px-4 py-2.5 font-medium text-ink">{{ art.title }}</td>
                <td class="px-4 py-2.5">
                  <span class="badge badge-plain text-xs">{{ art.category }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs text-ink-2 max-w-xs truncate">{{ art.summary }}</td>
                <td class="px-4 py-2.5 text-xs text-ink-3">
                  {{ day(art.updatedAt) }}
                  @if (art.updatedBy) {
                    <span class="block">{{ art.updatedBy }}</span>
                  }
                </td>
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
              @if (list.resource.hasValue()) {
                <tr>
                  <td colspan="5" class="p-8 text-center text-ink-2">
                    ยังไม่มีเอกสารในคลังความรู้
                  </td>
                </tr>
              }
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
              <button
                type="button"
                class="btn btn-primary text-xs"
                [disabled]="busy()"
                (click)="saveEdit(f)"
              >
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
  private readonly api = inject(StudioApi);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  /** The articles on the server. */
  protected readonly list = knowledgeList();
  protected readonly articles = this.list.items;
  protected readonly viewing = signal<KnowledgeArticle | null>(null);
  protected readonly editing = signal<ArticleForm | null>(null);
  protected readonly busy = signal(false);

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected day(iso: string): string {
    return formatDate(iso);
  }

  protected viewDetails(art: KnowledgeArticle): void {
    this.viewing.set(art);
  }

  protected openAddModal(): void {
    this.editing.set({
      isNew: true,
      id: 0,
      version: 0,
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
      version: art.version,
      title: art.title,
      category: art.category,
      summary: art.summary,
      content: art.content,
    });
  }

  /** Saves on the server. A refusal keeps the form open (nothing typed is lost) and says why. */
  protected async saveEdit(form: ArticleForm): Promise<void> {
    if (!form.title.trim()) {
      this.toasts.show('กรุณาระบุหัวข้อความรู้', true);
      return;
    }
    const text = {
      title: form.title,
      category: form.category.trim() || 'ทั่วไป',
      summary: form.summary,
      content: form.content,
    };
    this.busy.set(true);
    try {
      if (form.isNew) {
        await this.api.addArticle(text);
        this.toasts.show('เพิ่มเอกสารความรู้เรียบร้อยแล้ว');
      } else {
        await this.api.changeArticle(form.id, form.version, text);
        this.toasts.show('แก้ไขเอกสารเรียบร้อยแล้ว');
      }
      this.editing.set(null);
    } catch (e) {
      this.toasts.show('บันทึกไม่สำเร็จ: ' + failure(e), true);
    } finally {
      this.busy.set(false);
      this.list.resource.reload();
    }
  }

  protected async deleteArticle(art: KnowledgeArticle): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบเอกสาร "${art.title}"?`,
      body: 'เอกสารนี้จะถูกลบออกจากคลังความรู้',
      yes: 'ลบเอกสาร',
      danger: true,
    });
    if (!yes) return;
    try {
      await this.api.removeArticle(art.id, art.version);
      this.toasts.show('ลบเอกสารเรียบร้อยแล้ว');
    } catch (e) {
      const gone = e instanceof ApiError && e.code === 'not-found';
      this.toasts.show(gone ? 'เอกสารนี้ถูกลบไปแล้ว' : 'ลบไม่สำเร็จ: ' + failure(e), !gone);
    }
    this.list.resource.reload();
  }
}
