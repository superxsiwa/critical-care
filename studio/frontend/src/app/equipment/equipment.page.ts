import { Component, computed, inject, signal } from '@angular/core';
import { equipmentList } from '../api/lists';
import { EquipmentItem } from '../api/types';
import { Toasts } from '../ui/toast';

type ViewMode = 'card' | 'list';

@Component({
  selector: 'cs-equipment-page',
  template: `
    <div class="space-y-5">
      <!-- Header with view toggle -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 class="text-xl font-bold text-ink">คลังอุปกรณ์และยา (Equipment Catalog)</h1>
          <p class="text-sm text-ink-2">
            รายการรูปภาพอุปกรณ์ทางการแพทย์ทั้งหมด {{ allItems().length }} ชนิดในระบบ
            สำหรับพยาบาลเลือกนำไปใช้
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div
            class="inline-flex rounded-lg border border-line bg-white p-0.5"
            role="toolbar"
            aria-label="รูปแบบมุมมอง"
          >
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
          </div>
        </div>
      </div>

      <!-- Search & Category Filters -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="w-full sm:w-72">
          <label class="sr-only" for="equipment-search">ค้นหาอุปกรณ์</label>
          <input
            id="equipment-search"
            type="search"
            class="input text-sm"
            placeholder="ค้นหาชื่ออุปกรณ์หรือยา…"
            [value]="query()"
            (input)="updateQuery($event)"
          />
        </div>

        <div class="flex flex-wrap gap-1.5" role="toolbar" aria-label="หมวดหมู่อุปกรณ์">
          @for (c of categories(); track c) {
            <button
              type="button"
              class="rounded-full px-3 py-1 text-xs font-medium transition"
              [class]="
                selectedCategory() === c
                  ? 'bg-sky-800 text-white'
                  : 'bg-white text-ink-2 hover:bg-sky-100 border border-line'
              "
              [attr.aria-pressed]="selectedCategory() === c"
              (click)="selectedCategory.set(c)"
            >
              {{ c }}
            </button>
          }
        </div>
      </div>

      <!-- Main Content: Card View vs List View -->
      @if (list.resource.isLoading() && !list.resource.hasValue()) {
        <p class="card p-6 text-ink-2" role="status">กำลังโหลด…</p>
      } @else if (list.resource.error()) {
        <p class="card p-6 text-rose-700">โหลดรายการอุปกรณ์ไม่สำเร็จ</p>
      } @else if (viewMode() === 'card') {
        <!-- มุมมองการ์ด (Card View / Grid) -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          @for (item of filtered(); track item.file) {
            <div class="card flex flex-col items-center p-4 text-center hover:shadow-md transition">
              <div
                class="flex h-24 w-24 items-center justify-center rounded-lg border border-line bg-white p-2 shadow-sm"
              >
                <img
                  [src]="'equipment/' + item.file"
                  [alt]="item.nameTh"
                  class="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <span class="badge badge-plain mt-3 text-[11px]">{{ item.category }}</span>
              <h2 class="mt-1 text-base font-semibold text-ink">{{ item.nameTh }}</h2>
              <p class="text-xs text-ink-3">{{ item.nameEn }}</p>
              <div
                class="mt-3 flex w-full items-center justify-between gap-1 rounded bg-sky-50 px-2 py-1 text-xs"
              >
                <span class="key truncate">{{ item.file }}</span>
                <button
                  type="button"
                  class="btn btn-ghost py-0.5 text-xs text-sky-800"
                  (click)="copy(item.file)"
                >
                  คัดลอกชื่อ
                </button>
              </div>
            </div>
          } @empty {
            <div class="col-span-full card p-8 text-center text-ink-2">
              ไม่พบอุปกรณ์ที่ตรงกับคำค้นหา "{{ query() }}"
            </div>
          }
        </div>
      } @else {
        <!-- มุมมองรายการ (List View / Table) -->
        <section class="card overflow-x-auto" aria-label="รายการอุปกรณ์และยา">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
                <th scope="col" class="px-4 py-2.5 font-semibold w-16">รูป</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ชื่ออุปกรณ์</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อภาษาอังกฤษ</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">หมวดหมู่</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">รหัสไฟล์</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.file) {
                <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                  <td class="px-4 py-2">
                    <img
                      [src]="'equipment/' + item.file"
                      [alt]="item.nameTh"
                      class="h-9 w-9 object-contain"
                      loading="lazy"
                    />
                  </td>
                  <td class="px-4 py-2 font-medium text-ink">{{ item.nameTh }}</td>
                  <td class="px-4 py-2 text-xs text-ink-3">{{ item.nameEn }}</td>
                  <td class="px-4 py-2">
                    <span class="badge badge-plain text-xs">{{ item.category }}</span>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-sky-800"
                      (click)="copy(item.file)"
                    >
                      คัดลอก ({{ item.file }})
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-8 text-center text-ink-2">
                    ไม่พบอุปกรณ์ที่ตรงกับคำค้นหา "{{ query() }}"
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
})
export class EquipmentPage {
  private readonly toasts = inject(Toasts);
  protected readonly list = equipmentList();

  protected readonly viewMode = signal<ViewMode>('card');
  protected readonly query = signal('');
  protected readonly selectedCategory = signal('ทั้งหมด');

  /** The names on the server (จัดการอุปกรณ์ changes them), one per picture of the app. */
  protected readonly allItems = computed<EquipmentItem[]>(() => this.list.items());

  protected readonly categories = computed(() => {
    const set = new Set<string>(['ทั้งหมด']);
    for (const item of this.allItems()) {
      set.add(item.category);
    }
    return Array.from(set);
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.selectedCategory();
    return this.allItems().filter((item) => {
      const matchesCat = cat === 'ทั้งหมด' || item.category === cat;
      const matchesQuery =
        !q ||
        item.nameTh.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.file.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  });

  protected updateQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  protected copy(fileName: string): void {
    void navigator.clipboard.writeText(`./assets/equipment/${fileName}`);
    this.toasts.show(`คัดลอกรหัส ${fileName} แล้ว`);
  }
}
