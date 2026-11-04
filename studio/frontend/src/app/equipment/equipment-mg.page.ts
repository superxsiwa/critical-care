import { Component, computed, inject, signal } from '@angular/core';
import { MetaStore } from '../api/meta';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { EQUIPMENT_CATALOG, EquipmentItem } from './equipment-data';

@Component({
  selector: 'cs-equipment-mg-page',
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 class="text-xl font-bold text-ink">จัดการอุปกรณ์และยา (Equipment Management)</h1>
          <p class="text-sm text-ink-2">เพิ่ม ลบ แก้ไข และตรวจสอบรายการอุปกรณ์ทางการแพทย์ในระบบ</p>
        </div>
        <button type="button" class="btn btn-primary text-xs" (click)="openAddModal()">
          + เพิ่มอุปกรณ์ใหม่
        </button>
      </div>

      <!-- Equipment Table -->
      <section class="card overflow-x-auto" aria-label="รายการอุปกรณ์ทั้งหมดสำหรับจัดการ">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-line text-xs text-ink-2 bg-slate-50">
              <th scope="col" class="px-4 py-2.5 font-semibold w-16">รูป</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">ชื่ออุปกรณ์ (ไทย)</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อภาษาอังกฤษ</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">หมวดหมู่</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">รหัสไฟล์</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.file) {
              <tr class="border-b border-sky-100 last:border-0 hover:bg-sky-50/60">
                <td class="px-4 py-2">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded border border-line bg-white p-1"
                  >
                    <img
                      [src]="'equipment/' + item.file"
                      [alt]="item.nameTh"
                      class="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </td>
                <td class="px-4 py-2 font-medium text-ink">{{ item.nameTh }}</td>
                <td class="px-4 py-2 text-xs text-ink-3">{{ item.nameEn }}</td>
                <td class="px-4 py-2">
                  <span class="badge badge-plain text-xs">{{ item.category }}</span>
                </td>
                <td class="px-4 py-2 text-xs font-mono text-ink-3">{{ item.file }}</td>
                <td class="whitespace-nowrap px-4 py-2 text-right">
                  <div class="inline-flex gap-1">
                    <button type="button" class="btn btn-ghost text-xs" (click)="viewDetails(item)">
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-sky-800"
                      (click)="editItem(item)"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost text-xs text-rose-700"
                      (click)="deleteItem(item)"
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="p-8 text-center text-ink-2">ยังไม่มีอุปกรณ์ในรายการ</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <!-- View Details Modal -->
      @if (viewing(); as item) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-labelledby="view-eq-title"
          aria-modal="true"
        >
          <div class="card w-full max-w-md p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-line pb-3">
              <h2 id="view-eq-title" class="text-base font-bold text-ink">รายละเอียดอุปกรณ์</h2>
              <button
                type="button"
                class="btn btn-ghost btn-icon text-xs"
                aria-label="ปิด"
                (click)="viewing.set(null)"
              >
                ✕
              </button>
            </div>
            <div class="flex flex-col items-center p-3 text-center">
              <div
                class="flex h-28 w-28 items-center justify-center rounded-xl border border-line bg-white p-3 shadow-inner"
              >
                <img
                  [src]="'equipment/' + item.file"
                  [alt]="item.nameTh"
                  class="max-h-full max-w-full object-contain"
                />
              </div>
              <h3 class="mt-3 text-lg font-bold text-ink">{{ item.nameTh }}</h3>
              <p class="text-xs text-ink-3">{{ item.nameEn }}</p>
              <span class="badge badge-plain mt-2 text-xs">{{ item.category }}</span>
            </div>
            <div class="rounded-lg bg-sky-50 p-3 space-y-1.5 text-xs text-ink-2">
              <p>
                <strong>ชื่อไฟล์รูป:</strong> <code class="font-mono">{{ item.file }}</code>
              </p>
              <p>
                <strong>การอ้างอิงในการ์ด:</strong>
                <code class="font-mono">./assets/equipment/{{ item.file }}</code>
              </p>
            </div>
            <div class="flex justify-end pt-2 border-t border-line">
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
          aria-labelledby="edit-eq-title"
          aria-modal="true"
        >
          <div class="card w-full max-w-md p-6 shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-line pb-3">
              <h2 id="edit-eq-title" class="text-base font-bold text-ink">
                {{ f.isNew ? 'เพิ่มอุปกรณ์ใหม่' : 'แก้ไขข้อมูลอุปกรณ์' }}
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
                <label for="eq-nameth" class="label">ชื่ออุปกรณ์ (ภาษาไทย)</label>
                <input
                  id="eq-nameth"
                  type="text"
                  class="input"
                  [value]="f.nameTh"
                  (input)="f.nameTh = val($event)"
                  placeholder="เช่น เครื่องวัดความดันโลหิต…"
                />
              </div>

              <div>
                <label for="eq-nameen" class="label">ชื่อภาษาอังกฤษ</label>
                <input
                  id="eq-nameen"
                  type="text"
                  class="input"
                  [value]="f.nameEn"
                  (input)="f.nameEn = val($event)"
                  placeholder="เช่น Blood Pressure Monitor…"
                />
              </div>

              <div>
                <label for="eq-cat" class="label">หมวดหมู่</label>
                <input
                  id="eq-cat"
                  type="text"
                  class="input"
                  [value]="f.category"
                  (input)="f.category = val($event)"
                  placeholder="เช่น การติดตามสัญญาณชีพ, ยาและหัตถการ…"
                />
              </div>

              <div>
                <label for="eq-file" class="label">ชื่อไฟล์รูปภาพ (.png)</label>
                <input
                  id="eq-file"
                  type="text"
                  class="input font-mono"
                  [disabled]="!f.isNew"
                  [value]="f.file"
                  (input)="f.file = val($event)"
                  placeholder="เช่น bp_monitor.png"
                />
                @if (!f.isNew) {
                  <span class="text-[11px] text-ink-3">ไม่สามารถเปลี่ยนชื่อไฟล์รูปภาพเดิมได้</span>
                }
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-line">
              <button type="button" class="btn text-xs" (click)="editing.set(null)">ยกเลิก</button>
              <button type="button" class="btn btn-primary text-xs" (click)="saveEdit(f)">
                บันทึกอุปกรณ์
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EquipmentMgPage {
  private readonly meta = inject(MetaStore);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  protected readonly items = signal<EquipmentItem[]>([]);
  protected readonly viewing = signal<EquipmentItem | null>(null);
  protected readonly editing = signal<{
    isNew: boolean;
    nameTh: string;
    nameEn: string;
    category: string;
    file: string;
  } | null>(null);

  constructor() {
    // Populate items from meta and catalog
    const list = this.meta.equipment();
    const initial = list.map((file) => {
      const info = EQUIPMENT_CATALOG[file];
      return {
        file,
        nameTh: info?.nameTh ?? file.replace(/\.png$/, '').replaceAll('_', ' '),
        nameEn: info?.nameEn ?? file,
        category: info?.category ?? 'อุปกรณ์ทั่วไป',
      };
    });
    this.items.set(initial);
  }

  protected val(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }

  protected viewDetails(item: EquipmentItem): void {
    this.viewing.set(item);
  }

  protected openAddModal(): void {
    this.editing.set({
      isNew: true,
      nameTh: '',
      nameEn: '',
      category: 'อุปกรณ์ทั่วไป',
      file: '',
    });
  }

  protected editItem(item: EquipmentItem): void {
    this.editing.set({
      isNew: false,
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      category: item.category,
      file: item.file,
    });
  }

  protected saveEdit(form: {
    isNew: boolean;
    nameTh: string;
    nameEn: string;
    category: string;
    file: string;
  }): void {
    if (!form.nameTh.trim()) {
      this.toasts.show('กรุณาระบุชื่ออุปกรณ์ภาษาไทย', true);
      return;
    }
    if (form.isNew && !form.file.trim()) {
      this.toasts.show('กรุณาระบุชื่อไฟล์รูปภาพ', true);
      return;
    }
    const cleanFile = form.file.endsWith('.png') ? form.file : `${form.file}.png`;
    if (form.isNew) {
      this.items.update((list) => [
        ...list,
        {
          file: cleanFile,
          nameTh: form.nameTh,
          nameEn: form.nameEn || cleanFile,
          category: form.category || 'อุปกรณ์ทั่วไป',
        },
      ]);
      this.toasts.show('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว');
    } else {
      this.items.update((list) =>
        list.map((it) =>
          it.file === form.file
            ? {
                ...it,
                nameTh: form.nameTh,
                nameEn: form.nameEn,
                category: form.category,
              }
            : it,
        ),
      );
      this.toasts.show('แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว');
    }
    this.editing.set(null);
  }

  protected async deleteItem(item: EquipmentItem): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบอุปกรณ์ "${item.nameTh}"?`,
      body: 'อุปกรณ์นี้จะถูกลบออกจากรายการจัดการ',
      yes: 'ลบอุปกรณ์',
      danger: true,
    });
    if (!yes) return;
    this.items.update((list) => list.filter((it) => it.file !== item.file));
    this.toasts.show('ลบอุปกรณ์เรียบร้อยแล้ว');
  }
}
