import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { draftList } from '../api/drafts';
import { MetaStore } from '../api/meta';
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
                      <a
                        [routerLink]="['/drafts', d.id]"
                        class="btn btn-ghost text-xs"
                        [attr.aria-label]="'แก้ไข ' + label(d)"
                      >
                        แก้ไข
                      </a>
                      <button
                        type="button"
                        class="btn btn-ghost text-xs"
                        [disabled]="busy()"
                        [attr.aria-label]="'ทำสำเนา ' + label(d)"
                        (click)="duplicate(d)"
                      >
                        ทำสำเนา
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost text-xs text-rose-700"
                        [disabled]="busy()"
                        [attr.aria-label]="'ลบ ' + label(d)"
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
      <p class="text-xs text-ink-3">
        สตูดิโอตรวจเพียงว่าแอปเล่นเคสได้ ความถูกต้องทางคลินิกเป็นหน้าที่ของผู้ตรวจทานเนื้อหา
      </p>
    </div>
  `,
})
export class CaseMgPage {
  private readonly api = inject(StudioApi);
  private readonly router = inject(Router);
  protected readonly meta = inject(MetaStore);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  protected readonly drafts = draftList().resource;
  protected readonly items = computed(() => (this.drafts.hasValue() ? this.drafts.value() : []));
  protected readonly busy = signal(false);
  protected readonly refused = signal<Refused | null>(null);

  /** The bed after the highest one, for a new draft or a copy. */
  private readonly nextBed = computed(
    () => this.items().reduce((max, d) => Math.max(max, d.bedNum ?? 0), 0) + 1,
  );

  protected time(iso: string): string {
    return formatTime(iso);
  }

  protected label(d: DraftItem): string {
    return `เตียง ${d.bedNum ?? '-'} ${d.caseTitle}`.trim();
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
        this.toasts.show('สร้างเคสไม่สำเร็จ: ' + failure(e), true);
      }
    });
  }

  /** A copy on the next bed, opened for editing. */
  protected duplicate(d: DraftItem): Promise<void> {
    return this.run(async () => {
      try {
        const bed = this.nextBed();
        const full = await this.api.draft(d.id);
        const title = full.case['caseTitle'];
        const created = await this.api.create({
          ...full.case,
          bedNum: bed,
          caseTitle: `${typeof title === 'string' ? title : ''} (สำเนา)`.trim(),
        });
        this.toasts.show(`คัดลอกเป็นเตียง ${bed} แล้ว`);
        await this.router.navigate(['/drafts', created.id]);
      } catch (e) {
        this.toasts.show('ทำสำเนาไม่สำเร็จ: ' + failure(e), true);
        this.drafts.reload();
      }
    });
  }

  protected async remove(d: DraftItem): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบเคส "${d.caseTitle || 'เตียง ' + (d.bedNum ?? '-')}"?`,
      body: 'เคสนี้จะถูกลบออกจากคลังและไม่สามารถกู้คืนได้',
      yes: 'ลบเคส',
      danger: true,
    });
    if (!yes) return;
    await this.run(async () => {
      try {
        await this.api.remove(d.id, d.version);
        this.toasts.show('ลบเคสเรียบร้อยแล้ว');
      } catch (e) {
        const stale = e instanceof ApiError && e.code === 'stale';
        this.toasts.show(
          stale
            ? 'มีผู้อื่นแก้ไขเคสนี้หลังจากที่รายการโหลด: ดูรายการใหม่แล้วลองอีกครั้ง'
            : 'ลบไม่สำเร็จ: ' + failure(e),
          true,
        );
      }
      this.drafts.reload();
    });
  }

  protected importPicked(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return Promise.resolve();
    return this.run(async () => {
      this.refused.set(null);
      try {
        const added = await this.api.importFile(file);
        this.toasts.show(`นำเข้าสำเร็จ ${added.length} เคส`);
      } catch (err) {
        // The app's own reasons, line by line (a backup file, a newer version, a broken case).
        if (err instanceof ApiError && err.body.problems?.length) {
          this.refused.set({
            title: `นำเข้า ${file.name} ไม่ได้`,
            lines: err.body.problems.map((text) => ({ text, draft: null })),
          });
        } else this.toasts.show('นำเข้าไม่สำเร็จ: ' + failure(err), true);
      }
      this.drafts.reload();
    });
  }

  protected exportPackage(): Promise<void> {
    return this.run(async () => {
      this.refused.set(null);
      try {
        const pkg = await this.api.exportPackage();
        download(pkg.name, pkg.text);
        this.toasts.show('ส่งออกไฟล์แพ็กเกจเรียบร้อยแล้ว');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'not-ready') {
          // "case 2 (bed 3): ..." is the 2nd draft of the list (the package keeps the list's order).
          const list = this.items();
          this.refused.set({
            title: 'ยังส่งออกไม่ได้: แอปจะไม่รับไฟล์นี้',
            lines: (e.body.problems ?? []).map((text) => {
              const n = /^case (\d+)/.exec(text);
              return { text, draft: n ? (list[Number(n[1]) - 1] ?? null) : null };
            }),
          });
        } else this.toasts.show('ส่งออกไม่สำเร็จ: ' + failure(e), true);
      }
    });
  }
}

/** Hands the browser a file to save (in the page while it is clicked; the link lives a moment longer). */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
