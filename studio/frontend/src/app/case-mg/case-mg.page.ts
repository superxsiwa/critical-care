import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MetaStore } from '../api/meta';
import { Session } from '../api/session';
import { ApiError, StudioApi } from '../api/studio-api';
import { DraftItem } from '../api/types';
import { blankCase } from '../case/blank';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { failure, formatTime } from '../ui/words';

interface Refused {
  title: string;
  lines: { text: string; draft: DraftItem | null }[];
}

@Component({
  selector: 'cs-case-mg-page',
  imports: [RouterLink],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold text-ink">จัดการเคส (Case Management)</h1>
          <p class="text-sm text-ink-2">
            เพิ่ม ลบ แก้ไข ทำสำเนา และส่งออกแพ็กเกจเคสสถานการณ์จำลองสำหรับแอปมือถือ
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-primary text-xs"
            [disabled]="busy()"
            (click)="newDraft()"
          >
            + เคสใหม่
          </button>
          <button type="button" class="btn text-xs" [disabled]="busy()" (click)="picker.click()">
            นำเข้าไฟล์ JSON
          </button>
          <input
            #picker
            type="file"
            accept=".json,application/json"
            class="hidden"
            aria-label="เลือกไฟล์เคสที่จะนำเข้า"
            (change)="importPicked($event)"
          />
          <button
            type="button"
            class="btn text-xs"
            [disabled]="busy() || !items().length"
            (click)="exportPackage()"
          >
            ส่งออกแพ็กเกจ
          </button>
        </div>
      </div>

      <!-- Refused alert banner -->
      @if (refused(); as r) {
        <section class="card border-rose-200 p-4" role="alert" aria-labelledby="refused-title">
          <div class="flex items-start gap-2">
            <h2 id="refused-title" class="section-title text-rose-800">{{ r.title }}</h2>
            <button
              type="button"
              class="btn btn-ghost btn-icon ml-auto"
              aria-label="ปิด"
              (click)="refused.set(null)"
            >
              ✕
            </button>
          </div>
          <ul class="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
            @for (l of r.lines; track $index) {
              <li class="flex flex-wrap items-baseline gap-2">
                <span class="text-rose-800" lang="en">{{ l.text }}</span>
                @if (l.draft; as d) {
                  <a class="text-sky-800 underline" [routerLink]="['/drafts', d.id]">เปิดเคสนี้</a>
                }
              </li>
            }
          </ul>
        </section>
      }

      <!-- Case List Table -->
      <section class="card overflow-x-auto" aria-label="รายการเคสทั้งหมดสำหรับจัดการ">
        @if (drafts.isLoading() && !drafts.hasValue()) {
          <p class="p-6 text-ink-2" role="status">กำลังโหลด…</p>
        } @else if (drafts.error()) {
          <p class="p-6 text-rose-700">โหลดรายการเคสไม่สำเร็จ</p>
        } @else if (!items().length) {
          <div class="p-8 text-center">
            <p class="font-medium text-ink">ยังไม่มีเคสในระบบ</p>
            <p class="mt-1 text-sm text-ink-2">เริ่มเคสใหม่ หรือนำเข้าไฟล์ JSON สำหรับเตียง CCU</p>
          </div>
        } @else {
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
                <th scope="col" class="px-4 py-2.5 font-semibold">เตียง</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อเคสหัตถการ</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">ความพร้อม</th>
                <th scope="col" class="px-4 py-2.5 font-semibold">แก้ไขล่าสุด</th>
                <th scope="col" class="px-4 py-2.5 text-right font-semibold">จัดการ</th>
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
                    {{ time(d.updatedAt) }} · ฉบับที่ {{ d.version }}
                    @if (d.updatedBy) {
                      <span class="block text-ink-3">โดย {{ d.updatedBy }}</span>
                    }
                  </td>
                  <td class="whitespace-nowrap px-4 py-2.5 text-right">
                    <div class="inline-flex gap-1">
                      <a [routerLink]="['/drafts', d.id]" class="btn btn-ghost text-xs"> แก้ไข </a>
                      <button
                        type="button"
                        class="btn btn-ghost text-xs"
                        [disabled]="busy()"
                        (click)="duplicate(d)"
                      >
                        ทำสำเนา
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost text-xs text-rose-700"
                        [disabled]="busy()"
                        (click)="remove(d)"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `,
})
export class CaseMgPage {
  private readonly api = inject(StudioApi);
  private readonly router = inject(Router);
  protected readonly meta = inject(MetaStore);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  protected readonly drafts = httpResource<DraftItem[]>(() => '/api/drafts');
  protected readonly items = computed(() => (this.drafts.hasValue() ? this.drafts.value() : []));
  protected readonly busy = signal(false);
  protected readonly refused = signal<Refused | null>(null);

  constructor() {
    const session = inject(Session);
    let seen = untracked(session.signIns);
    effect(() => {
      const n = session.signIns();
      if (n !== seen) {
        seen = n;
        untracked(() => this.drafts.reload());
      }
    });
  }

  protected time(iso: string): string {
    return formatTime(iso);
  }

  private nextBed(): number {
    let max = 0;
    for (const d of this.items()) {
      if (d.bedNum && d.bedNum > max) max = d.bedNum;
    }
    return max + 1;
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }

  protected newDraft(): Promise<void> {
    return this.run(async () => {
      try {
        const d = await this.api.create(blankCase(this.nextBed(), this.meta.stepsPerCase()));
        await this.router.navigate(['/drafts', d.id]);
      } catch (e) {
        this.toasts.show(failure(e), true);
      }
    });
  }

  protected async duplicate(d: DraftItem): Promise<void> {
    return this.run(async () => {
      try {
        const full = await this.api.draft(d.id);
        const cloned = JSON.parse(JSON.stringify(full.case));
        cloned['bedNum'] = this.nextBed();
        cloned['caseTitle'] = `${d.caseTitle} (สำเนา)`.trim();
        const created = await this.api.create(cloned);
        this.drafts.reload();
        this.toasts.show(`คัดลอกเป็นเตียง ${cloned['bedNum']} แล้ว`);
        await this.router.navigate(['/drafts', created.id]);
      } catch (e) {
        this.toasts.show(failure(e), true);
      }
    });
  }

  protected async remove(d: DraftItem): Promise<void> {
    const title = `ลบเคส "${d.caseTitle || 'เตียง ' + (d.bedNum ?? '-')}"?`;
    const yes = await this.confirm.ask({
      title,
      body: 'เคสนี้จะถูกลบออกจากคลังและไม่สามารถกู้คืนได้',
      yes: 'ลบเคส',
      danger: true,
    });
    if (!yes) return;
    return this.run(async () => {
      try {
        await this.api.remove(d.id, d.version);
        this.drafts.reload();
        this.toasts.show('ลบเคสเรียบร้อยแล้ว');
      } catch (e) {
        this.toasts.show(failure(e), true);
      }
    });
  }

  protected async importPicked(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    return this.run(async () => {
      try {
        const added = await this.api.importFile(file);
        this.drafts.reload();
        this.toasts.show(`นำเข้าสำเร็จ ${added.length} เคส`);
      } catch (err) {
        this.toasts.show(failure(err), true);
      }
    });
  }

  protected async exportPackage(): Promise<void> {
    this.refused.set(null);
    return this.run(async () => {
      try {
        const pkg = await this.api.exportPackage();
        const blob = new Blob([pkg.text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          pkg.name || `critical-care-cases-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toasts.show('ส่งออกไฟล์แพ็กเกจเรียบร้อยแล้ว');
      } catch (err) {
        if (err instanceof ApiError && err.status === 422) {
          const detail = (err.body['detail'] as string) || 'ส่งออกไม่สำเร็จ';
          const problems = (err.body['problems'] as string[]) || [];
          this.refused.set({
            title: detail,
            lines: problems.map((text) => ({ text, draft: null })),
          });
        } else {
          this.toasts.show(failure(err), true);
        }
      }
    });
  }
}
