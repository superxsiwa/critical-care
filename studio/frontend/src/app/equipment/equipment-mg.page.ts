import { Component, computed, inject, signal } from '@angular/core';
import { equipmentList } from '../api/lists';
import { MetaStore } from '../api/meta';
import { ApiError, StudioApi } from '../api/studio-api';
import { EquipmentItem } from '../api/types';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { failure } from '../ui/words';

/** The add / edit form: a new entry names a picture that has none yet; an entry's picture stays. */
interface EquipmentForm {
  isNew: boolean;
  id: number;
  version: number;
  nameTh: string;
  nameEn: string;
  category: string;
  file: string;
}

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
            @if (list.resource.isLoading() && !list.resource.hasValue()) {
              <tr>
                <td colspan="6" class="p-8 text-center text-ink-2" role="status">กำลังโหลด…</td>
              </tr>
            } @else if (list.resource.error()) {
              <tr>
                <td colspan="6" class="p-8 text-center text-rose-700">
                  โหลดรายการอุปกรณ์ไม่สำเร็จ
                </td>
              </tr>
            }
            @for (item of items(); track item.id) {
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
              @if (list.resource.hasValue()) {
                <tr>
                  <td colspan="6" class="p-8 text-center text-ink-2">ยังไม่มีอุปกรณ์ในรายการ</td>
                </tr>
              }
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
                @if (f.isNew) {
                  <!-- Only the app's own pictures: a case can show no other. -->
                  <select
                    id="eq-file"
                    class="input font-mono"
                    [disabled]="!freePictures().length"
                    (change)="f.file = val($event)"
                    aria-describedby="eq-file-hint"
                  >
                    <option value="" [selected]="!f.file">เลือกรูปภาพ…</option>
                    @for (file of freePictures(); track file) {
                      <option [value]="file" [selected]="f.file === file">{{ file }}</option>
                    }
                  </select>
                  <span id="eq-file-hint" class="text-[11px] text-ink-3">
                    @if (freePictures().length) {
                      เลือกได้เฉพาะรูปอุปกรณ์ที่มีในแอปและยังไม่มีชื่อ
                    } @else {
                      รูปอุปกรณ์ทุกรูปในแอปมีชื่อแล้ว: ลบรายการของรูปนั้นก่อน จึงเพิ่มใหม่ได้
                    }
                  </span>
                } @else {
                  <input
                    id="eq-file"
                    type="text"
                    class="input font-mono"
                    disabled
                    [value]="f.file"
                  />
                  <span class="text-[11px] text-ink-3">ไม่สามารถเปลี่ยนชื่อไฟล์รูปภาพเดิมได้</span>
                }
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
  private readonly api = inject(StudioApi);
  private readonly meta = inject(MetaStore);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  /** The entries on the server, by picture. */
  protected readonly list = equipmentList();
  protected readonly items = this.list.items;
  protected readonly viewing = signal<EquipmentItem | null>(null);
  protected readonly editing = signal<EquipmentForm | null>(null);
  protected readonly busy = signal(false);

  /** The app's pictures that have no entry: the only ones a new entry can name. */
  protected readonly freePictures = computed(() => {
    const named = new Set(this.items().map((it) => it.file));
    return this.meta.equipment().filter((file) => !named.has(file));
  });

  protected val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected viewDetails(item: EquipmentItem): void {
    this.viewing.set(item);
  }

  protected openAddModal(): void {
    this.editing.set({
      isNew: true,
      id: 0,
      version: 0,
      nameTh: '',
      nameEn: '',
      category: 'อุปกรณ์ทั่วไป',
      file: '',
    });
  }

  protected editItem(item: EquipmentItem): void {
    this.editing.set({
      isNew: false,
      id: item.id,
      version: item.version,
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      category: item.category,
      file: item.file,
    });
  }

  /** Saves on the server. A refusal keeps the form open (nothing typed is lost) and says why. */
  protected async saveEdit(form: EquipmentForm): Promise<void> {
    if (!form.nameTh.trim()) {
      this.toasts.show('กรุณาระบุชื่ออุปกรณ์ภาษาไทย', true);
      return;
    }
    if (form.isNew && !form.file) {
      this.toasts.show('กรุณาเลือกรูปภาพ', true);
      return;
    }
    const names = {
      nameTh: form.nameTh,
      nameEn: form.isNew ? form.nameEn || form.file : form.nameEn,
      category: form.category.trim() || 'อุปกรณ์ทั่วไป',
    };
    this.busy.set(true);
    try {
      if (form.isNew) {
        await this.api.addEquipment(form.file, names);
        this.toasts.show('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว');
      } else {
        await this.api.changeEquipment(form.id, form.version, names);
        this.toasts.show('แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว');
      }
      this.editing.set(null);
    } catch (e) {
      this.toasts.show('บันทึกไม่สำเร็จ: ' + failure(e), true);
    } finally {
      this.busy.set(false);
      this.list.resource.reload();
    }
  }

  protected async deleteItem(item: EquipmentItem): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ลบอุปกรณ์ "${item.nameTh}"?`,
      body: 'อุปกรณ์นี้จะถูกลบออกจากรายการจัดการ',
      yes: 'ลบอุปกรณ์',
      danger: true,
    });
    if (!yes) return;
    try {
      await this.api.removeEquipment(item.id, item.version);
      this.toasts.show('ลบอุปกรณ์เรียบร้อยแล้ว');
    } catch (e) {
      const gone = e instanceof ApiError && e.code === 'not-found';
      this.toasts.show(gone ? 'อุปกรณ์นี้ถูกลบไปแล้ว' : 'ลบไม่สำเร็จ: ' + failure(e), !gone);
    }
    this.list.resource.reload();
  }
}
