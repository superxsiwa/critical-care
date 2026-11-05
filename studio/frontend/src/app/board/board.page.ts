import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { draftList } from '../api/drafts';
import { MetaStore } from '../api/meta';
import { formatTime } from '../ui/words';

@Component({
  selector: 'cs-board-page',
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <!-- หัวข้อหน้า Board -->
      <div class="border-b border-line pb-4">
        <h1 class="text-xl font-bold text-ink">Board · ภาพรวมหอผู้ป่วยวิกฤต (CCU Board)</h1>
        <p class="text-sm text-ink-2">
          ข้อมูลเชิงสรุปสถานะเคสจำลองและเตียงผู้ป่วยวิกฤตทั้งหมดในระบบ
        </p>
      </div>

      <!-- การ์ดสถิติสรุป (Summary KPI Cards) -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="card border-l-4 border-sky-600 p-4">
          <span class="text-xs font-medium text-ink-3">เคสทั้งหมดในวอร์ด</span>
          <p class="mt-1 text-2xl font-bold text-ink">
            {{ items().length }} <span class="text-xs font-normal text-ink-3">เคส</span>
          </p>
        </div>
        <div class="card border-l-4 border-emerald-600 p-4">
          <span class="text-xs font-medium text-ink-3">พร้อมส่งออก (Valid)</span>
          <p class="mt-1 text-2xl font-bold text-emerald-700">
            {{ readyCount() }} <span class="text-xs font-normal text-ink-3">เคส</span>
          </p>
        </div>
        <div class="card border-l-4 border-rose-500 p-4">
          <span class="text-xs font-medium text-ink-3">ต้องตรวจสอบแก้ไข</span>
          <p class="mt-1 text-2xl font-bold text-rose-700">
            {{ problemCount() }} <span class="text-xs font-normal text-ink-3">เคส</span>
          </p>
        </div>
        <div class="card border-l-4 border-indigo-600 p-4">
          <span class="text-xs font-medium text-ink-3">อุปกรณ์และยาในคลัง</span>
          <p class="mt-1 text-2xl font-bold text-indigo-700">
            {{ meta.equipment().length }} <span class="text-xs font-normal text-ink-3">ชนิด</span>
          </p>
        </div>
      </div>

      <!-- ผังเตียงผู้ป่วยวิกฤตในวอร์ด (Bed Status Overview) -->
      <section class="card p-5" aria-labelledby="beds-board-title">
        <div class="flex items-center justify-between border-b border-line pb-3">
          <h2 id="beds-board-title" class="section-title">
            ผังสถานะเตียงผู้ป่วยวิกฤต (Bed Status)
          </h2>
          <span class="text-xs text-ink-3">อัปเดตตามเคสในระบบ</span>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          @for (d of items(); track d.id) {
            <div class="rounded-lg border border-line bg-sky-50/40 p-3 hover:bg-sky-50 transition">
              <div class="flex items-center justify-between">
                <span class="rounded bg-sky-800 px-2 py-0.5 text-xs font-bold text-white">
                  เตียง {{ d.bedNum ?? '-' }}
                </span>
                @if (d.problems) {
                  <span class="badge badge-bad text-[10px]">แก้ {{ d.problems }} จุด</span>
                } @else {
                  <span class="badge badge-ok text-[10px]">พร้อม</span>
                }
              </div>
              <p class="mt-2 text-sm font-semibold text-ink truncate" [title]="d.caseTitle">
                {{ d.caseTitle || '(ยังไม่มีชื่อเคส)' }}
              </p>
              <div
                class="mt-2 flex items-center justify-between text-xs text-ink-3 pt-2 border-t border-sky-100"
              >
                <span>ฉบับที่ {{ d.version }}</span>
                <a
                  [routerLink]="['/drafts', d.id]"
                  class="text-sky-800 font-medium hover:underline"
                >
                  เปิดดู
                </a>
              </div>
            </div>
          } @empty {
            @if (drafts.error()) {
              <p class="col-span-full py-4 text-center text-sm text-rose-700">
                โหลดรายการเคสไม่สำเร็จ
              </p>
            } @else if (drafts.hasValue()) {
              <p class="col-span-full py-4 text-center text-xs text-ink-3">
                ยังไม่มีข้อมูลเคสในระบบ
              </p>
            }
          }
        </div>
      </section>

      <!-- ตารางสรุปสถานะเคสล่าสุด (Recent Cases Status Table) -->
      <section class="card overflow-x-auto" aria-label="สถานะเคสล่าสุด">
        <div class="border-b border-line p-4">
          <h2 class="section-title">สรุปรายการเคสล่าสุด</h2>
        </div>
        @if (drafts.isLoading() && !drafts.hasValue()) {
          <p class="p-6 text-ink-2" role="status">กำลังโหลด…</p>
        } @else if (drafts.error()) {
          <p class="p-6 text-rose-700">โหลดรายการเคสไม่สำเร็จ</p>
        } @else {
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
                <th scope="col" class="px-4 py-2.5 font-semibold">เตียง</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อเคสหัตถการ</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">สถานะความพร้อม</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">แก้ไขล่าสุด</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              @for (d of items(); track d.id) {
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
                    {{ time(d.updatedAt) }}
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
                  <td colspan="5" class="p-6 text-center text-ink-2">ยังไม่มีเคสในระบบ</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `,
})
export class BoardPage {
  protected readonly meta = inject(MetaStore);
  private readonly list = draftList();
  protected readonly drafts = this.list.resource;
  protected readonly items = this.list.items;
  protected readonly readyCount = this.list.ready;
  protected readonly problemCount = this.list.withProblems;

  protected time(iso: string): string {
    return formatTime(iso);
  }
}
