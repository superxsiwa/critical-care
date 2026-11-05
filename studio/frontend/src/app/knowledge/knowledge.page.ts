import { Component, computed, signal } from '@angular/core';
import { knowledgeList } from '../api/lists';
import { KnowledgeArticle } from '../api/types';
import { formatDate } from '../ui/words';

type KnowledgeViewMode = 'folder' | 'list' | 'card';

@Component({
  selector: 'cs-knowledge-page',
  template: `
    <div class="space-y-5">
      <!-- Header with view toggle buttons -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 class="text-xl font-bold text-ink">คลังความรู้ (Knowledge Base)</h1>
          <p class="text-sm text-ink-2">
            องค์ความรู้ทางการพยาบาลผู้ป่วยวิกฤต แนวทางการออกแบบโจทย์ และเทมเพลตสถานการณ์
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div
            class="inline-flex rounded-lg border border-line bg-white p-0.5"
            role="toolbar"
            aria-label="รูปแบบมุมมองคลังความรู้"
          >
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              [class]="
                viewMode() === 'folder'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'text-ink-2 hover:bg-sky-50'
              "
              [attr.aria-pressed]="viewMode() === 'folder'"
              (click)="viewMode.set('folder')"
            >
              📁 จัดกลุ่มโฟลเดอร์
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              [class]="
                viewMode() === 'list'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'text-ink-2 hover:bg-sky-50'
              "
              [attr.aria-pressed]="viewMode() === 'list'"
              (click)="viewMode.set('list')"
            >
              📋 มุมมองรายการ
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              [class]="
                viewMode() === 'card'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'text-ink-2 hover:bg-sky-50'
              "
              [attr.aria-pressed]="viewMode() === 'card'"
              (click)="viewMode.set('card')"
            >
              🎴 มุมมองการ์ด
            </button>
          </div>
        </div>
      </div>

      <!-- Search bar -->
      <div class="flex items-center justify-between gap-3">
        <div class="w-full sm:w-80">
          <label class="sr-only" for="knowledge-search">ค้นหาองค์ความรู้</label>
          <input
            id="knowledge-search"
            type="search"
            class="input text-sm"
            placeholder="ค้นหาหัวข้อความรู้หรือเนื้อหา…"
            [value]="query()"
            (input)="updateQuery($event)"
          />
        </div>
        <span class="text-xs text-ink-3">ทั้งหมด {{ filtered().length }} บทเรียน</span>
      </div>

      @if (list.resource.isLoading() && !list.resource.hasValue()) {
        <p class="card p-6 text-ink-2" role="status">กำลังโหลด…</p>
      } @else if (list.resource.error()) {
        <p class="card p-6 text-rose-700">โหลดคลังความรู้ไม่สำเร็จ</p>
      }

      <!-- VIEW 1: Folder View (จัดกลุ่มตามหมวดหมู่ คล้าย Folder) -->
      @if (viewMode() === 'folder') {
        <div class="space-y-3">
          @for (cat of categories(); track cat) {
            <div class="card overflow-hidden">
              <button
                type="button"
                class="flex w-full items-center justify-between p-3.5 text-left font-semibold text-sm hover:bg-sky-50/60 transition"
                [attr.aria-expanded]="isExpanded(cat)"
                (click)="toggleFolder(cat)"
              >
                <span class="flex items-center gap-2">
                  <span class="text-base" aria-hidden="true">{{
                    isExpanded(cat) ? '📂' : '📁'
                  }}</span>
                  <span class="text-sky-950 font-medium">{{ cat }}</span>
                  <span class="badge badge-plain text-[11px]">
                    {{ articlesInCat(cat).length }} รายการ
                  </span>
                </span>
                <span class="text-xs text-ink-3" aria-hidden="true">
                  {{ isExpanded(cat) ? 'ย่อ ▲' : 'ขยาย ▼' }}
                </span>
              </button>

              @if (isExpanded(cat)) {
                <div class="border-t border-line bg-sky-50/20 p-2 divide-y divide-sky-100">
                  @for (art of articlesInCat(cat); track art.id) {
                    <button
                      type="button"
                      class="flex w-full items-center justify-between p-2.5 text-left hover:bg-white rounded-md transition cursor-pointer"
                      (click)="activeArticle.set(art)"
                    >
                      <span class="flex items-center gap-2.5 min-w-0">
                        <span class="text-sky-700 text-sm" aria-hidden="true">📄</span>
                        <span class="block min-w-0">
                          <span class="block text-sm font-medium text-ink truncate">{{
                            art.title
                          }}</span>
                          <span class="block text-xs text-ink-3 truncate">{{ art.summary }}</span>
                        </span>
                      </span>
                      <span
                        class="text-xs text-sky-800 font-medium ml-2 shrink-0"
                        aria-hidden="true"
                        >เปิดอ่าน →</span
                      >
                    </button>
                  }
                </div>
              }
            </div>
          } @empty {
            @if (list.resource.hasValue()) {
              <div class="card p-8 text-center text-ink-2">ยังไม่มีเอกสารในคลังความรู้</div>
            }
          }
        </div>
      }

      <!-- VIEW 2: List View (มุมมองรายการ) -->
      @if (viewMode() === 'list' && list.resource.hasValue()) {
        <section class="card overflow-x-auto" aria-label="รายการเอกสารความรู้">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
                <th scope="col" class="px-4 py-2.5 font-semibold">หัวข้อความรู้</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">หมวดหมู่</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">สรุปใจความ</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ปรับปรุงเมื่อ</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              @for (art of filtered(); track art.id) {
                <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                  <td class="px-4 py-2.5 font-medium text-ink">{{ art.title }}</td>
                  <td class="px-4 py-2.5">
                    <span class="badge badge-plain text-xs">{{ art.category }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-xs text-ink-2 max-w-xs truncate">
                    {{ art.summary }}
                  </td>
                  <td class="px-4 py-2.5 text-xs text-ink-3">{{ day(art.updatedAt) }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-sky-800"
                      (click)="activeArticle.set(art)"
                    >
                      เปิดอ่าน
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-8 text-center text-ink-2">
                    ไม่พบบทเรียนที่ตรงกับคำค้นหา
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }

      <!-- VIEW 3: Card View (มุมมองการ์ด) -->
      @if (viewMode() === 'card' && list.resource.hasValue()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          @for (art of filtered(); track art.id) {
            <div class="card p-4 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <span class="badge badge-plain text-[11px]">{{ art.category }}</span>
                <h2 class="mt-2 text-base font-semibold text-ink line-clamp-2">{{ art.title }}</h2>
                <p class="mt-1.5 text-xs text-ink-2 leading-relaxed line-clamp-3">
                  {{ art.summary }}
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
                <span class="text-ink-3">{{ day(art.updatedAt) }}</span>
                <button
                  type="button"
                  class="btn btn-primary text-xs"
                  (click)="activeArticle.set(art)"
                >
                  อ่านบทเรียน
                </button>
              </div>
            </div>
          } @empty {
            <div class="col-span-full card p-8 text-center text-ink-2">
              ไม่พบบทเรียนที่ตรงกับคำค้นหา
            </div>
          }
        </div>
      }

      <!-- Reading Article Modal -->
      @if (activeArticle(); as art) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-labelledby="article-dialog-title"
          aria-modal="true"
        >
          <div class="card w-full max-w-lg p-6 shadow-xl space-y-4">
            <div class="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span class="badge badge-plain text-xs">{{ art.category }}</span>
                <h2 id="article-dialog-title" class="text-lg font-bold text-ink mt-1">
                  {{ art.title }}
                </h2>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-icon text-xs"
                aria-label="ปิด"
                (click)="activeArticle.set(null)"
              >
                ✕
              </button>
            </div>
            <div class="space-y-2 text-sm text-ink-2 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <p class="font-medium text-sky-900 bg-sky-50 p-2.5 rounded-lg text-xs">
                {{ art.summary }}
              </p>
              <p class="pt-2 whitespace-pre-line text-ink">{{ art.content }}</p>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-line">
              <span class="text-xs text-ink-3">ปรับปรุงล่าสุด: {{ day(art.updatedAt) }}</span>
              <button
                type="button"
                class="btn btn-primary text-xs"
                (click)="activeArticle.set(null)"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class KnowledgePage {
  protected readonly viewMode = signal<KnowledgeViewMode>('folder');
  protected readonly query = signal('');
  /** The articles on the server (จัดการคลังความรู้ changes them). */
  protected readonly list = knowledgeList();
  protected readonly articles = this.list.items;
  protected readonly activeArticle = signal<KnowledgeArticle | null>(null);

  // Folders (categories) the reader closed; every folder starts open, a new category too.
  private readonly collapsedCats = signal<Set<string>>(new Set());

  protected readonly categories = computed(() => {
    const set = new Set<string>();
    for (const a of this.articles()) {
      set.add(a.category);
    }
    return Array.from(set);
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.articles().filter((a) => {
      return (
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
      );
    });
  });

  protected articlesInCat(cat: string): KnowledgeArticle[] {
    return this.filtered().filter((a) => a.category === cat);
  }

  protected isExpanded(cat: string): boolean {
    return !this.collapsedCats().has(cat);
  }

  protected toggleFolder(cat: string): void {
    const next = new Set(this.collapsedCats());
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    this.collapsedCats.set(next);
  }

  protected day(iso: string): string {
    return formatDate(iso);
  }

  protected updateQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }
}
