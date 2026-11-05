import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { draftList } from '../api/drafts';
import { formatTime } from '../ui/words';

type ViewMode = 'list' | 'card';

@Component({
  selector: 'cs-case-library-page',
  imports: [RouterLink],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 class="text-xl font-bold text-ink">คลังเคสจำลอง (Case Library)</h1>
          <p class="text-sm text-ink-2">
            เรียกดูและตรวจสอบเคสสถานการณ์จำลองสำหรับผู้ป่วยวิกฤต (โหมดดูอย่างเดียว)
          </p>
        </div>

        <!-- View mode toggle buttons -->
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

      <!-- Search & Filter Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="w-full sm:w-72">
          <label class="sr-only" for="case-search">ค้นหาเคส</label>
          <input
            id="case-search"
            type="search"
            class="input text-sm"
            placeholder="ค้นหาชื่อเคส หรือหมายเลขเตียง…"
            [value]="query()"
            (input)="updateQuery($event)"
          />
        </div>

        <div class="flex gap-1.5">
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            [class]="
              filter() === 'all'
                ? 'bg-sky-800 text-white'
                : 'border border-line bg-white text-ink-2 hover:bg-sky-50'
            "
            [attr.aria-pressed]="filter() === 'all'"
            (click)="filter.set('all')"
          >
            ทั้งหมด ({{ items().length }})
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            [class]="
              filter() === 'ready'
                ? 'bg-emerald-700 text-white'
                : 'border border-line bg-white text-ink-2 hover:bg-emerald-50'
            "
            [attr.aria-pressed]="filter() === 'ready'"
            (click)="filter.set('ready')"
          >
            พร้อมส่งออก ({{ readyCount() }})
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-medium transition"
            [class]="
              filter() === 'problem'
                ? 'bg-rose-700 text-white'
                : 'border border-line bg-white text-ink-2 hover:bg-rose-50'
            "
            [attr.aria-pressed]="filter() === 'problem'"
            (click)="filter.set('problem')"
          >
            ต้องตรวจสอบ ({{ problemCount() }})
          </button>
        </div>
      </div>

      <!-- Main Content: List View or Card View -->
      @if (drafts.isLoading() && !drafts.hasValue()) {
        <p class="card p-6 text-ink-2" role="status">กำลังโหลดเคส…</p>
      } @else if (drafts.error()) {
        <p class="card p-6 text-rose-700">โหลดรายการเคสไม่สำเร็จ</p>
      } @else if (viewMode() === 'list') {
        <!-- มุมมองรายการ (List View / Table) -->
        <section class="card overflow-x-auto" aria-label="รายการเคส">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
                <th scope="col" class="px-4 py-2.5 font-semibold">เตียง</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อเคสหัตถการ</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ความพร้อม</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">แก้ไขล่าสุด</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              @for (d of filtered(); track d.id) {
                <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                  <td class="px-4 py-2.5 font-bold text-sky-800">{{ d.bedNum ?? '-' }}</td>
                  <td class="px-4 py-2.5">
                    <a
                      class="font-medium text-ink hover:underline"
                      [routerLink]="['/drafts', d.id]"
                    >
                      {{ d.caseTitle || '(ยังไม่มีชื่อเคส)' }}
                    </a>
                  </td>
                  <td class="px-4 py-2.5">
                    @if (d.problems) {
                      <span class="badge badge-bad">ต้องแก้ {{ d.problems }} ข้อ</span>
                    } @else {
                      <span class="badge badge-ok">พร้อมส่งออก</span>
                    }
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-ink-2 text-xs">
                    {{ time(d.updatedAt) }} · ฉบับที่ {{ d.version }}
                    @if (d.updatedBy) {
                      <span class="block text-ink-3">โดย {{ d.updatedBy }}</span>
                    }
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-right">
                    <a [routerLink]="['/drafts', d.id]" class="btn btn-ghost text-xs">
                      ดูรายละเอียด
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-8 text-center text-ink-2">
                    ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <!-- มุมมองการ์ด (Card View / Grid) -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          @for (d of filtered(); track d.id) {
            <div class="card p-4 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between">
                  <span class="rounded bg-sky-800 px-2 py-0.5 text-xs font-bold text-white">
                    เตียง {{ d.bedNum ?? '-' }}
                  </span>
                  @if (d.problems) {
                    <span class="badge badge-bad text-[10px]">ต้องแก้ {{ d.problems }} ข้อ</span>
                  } @else {
                    <span class="badge badge-ok text-[10px]">พร้อมส่งออก</span>
                  }
                </div>
                <h2 class="mt-3 font-semibold text-base text-ink line-clamp-2">
                  {{ d.caseTitle || '(ยังไม่มีชื่อเคส)' }}
                </h2>
                <p class="mt-2 text-xs text-ink-3">
                  บันทึกล่าสุด: {{ time(d.updatedAt) }}
                  @if (d.updatedBy) {
                    <span class="block text-sky-800">โดย {{ d.updatedBy }}</span>
                  }
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-line flex justify-end">
                <a
                  [routerLink]="['/drafts', d.id]"
                  class="btn btn-primary text-xs w-full text-center"
                >
                  ดูรายละเอียดเคส
                </a>
              </div>
            </div>
          } @empty {
            <div class="col-span-full card p-8 text-center text-ink-2">
              ไม่พบเคสที่ตรงกับเงื่อนไขการค้นหา
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CaseLibraryPage {
  private readonly list = draftList();
  protected readonly drafts = this.list.resource;
  protected readonly viewMode = signal<ViewMode>('list');
  protected readonly query = signal('');
  protected readonly filter = signal<'all' | 'ready' | 'problem'>('all');

  protected readonly items = this.list.items;
  protected readonly readyCount = this.list.ready;
  protected readonly problemCount = this.list.withProblems;

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.items().filter((d) => {
      const matchesFilter =
        f === 'all' ? true : f === 'ready' ? !d.problems : (d.problems ?? 0) > 0;
      const title = (d.caseTitle || '').toLowerCase();
      const bed = String(d.bedNum ?? '');
      const by = (d.updatedBy || '').toLowerCase();
      const matchesQuery = !q || title.includes(q) || bed.includes(q) || by.includes(q);
      return matchesFilter && matchesQuery;
    });
  });

  protected updateQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  protected time(iso: string): string {
    return formatTime(iso);
  }
}
