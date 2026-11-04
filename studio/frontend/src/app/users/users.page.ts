import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, minLength, pattern, required, submit } from '@angular/forms/signals';
import { ApiError, StudioApi } from '../api/studio-api';
import { Session } from '../api/session';
import { Account } from '../api/types';
import { Confirm } from '../ui/confirm';
import { Toasts } from '../ui/toast';
import { failure, formatTime } from '../ui/words';

/** A password to hand a new instructor: 14 letters and digits that are easy to read aloud. */
function randomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

const USERNAME = /^[A-Za-z0-9._-]{2,40}$/;

/**
 * The accounts, for an admin: nobody signs up, an admin adds each instructor and tells them their
 * password. An account is switched off rather than deleted, so a draft can still say who saved it.
 */
@Component({
  selector: 'cs-users-page',
  imports: [FormField],
  template: `
    <h1 class="text-xl font-semibold">บัญชีผู้ใช้</h1>
    <p class="text-sm text-ink-2">
      ระบบ Case Studio มีผู้ใช้ 2 ประเภท: 1. Admin (ผู้ดูแลระบบ) 2. พยาบาล
    </p>

    <section class="card mt-4 p-4" aria-labelledby="add-title">
      <h2 id="add-title" class="section-title">เพิ่มบัญชี</h2>
      <form
        class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
        (submit)="add($event)"
        novalidate
      >
        @for (k of addKeys; track k.key) {
          <div>
            <label class="label" [for]="'add-' + k.key">{{ k.label }}</label>
            <input
              class="input"
              [id]="'add-' + k.key"
              [attr.autocomplete]="k.key === 'password' ? 'new-password' : 'off'"
              spellcheck="false"
              [formField]="f[k.key]"
              [attr.aria-invalid]="shown(k.key) ? 'true' : null"
              [attr.aria-describedby]="shown(k.key) ? 'add-' + k.key + '-err' : null"
            />
            @if (shown(k.key)) {
              <span class="field-error" [id]="'add-' + k.key + '-err'">{{ first(k.key) }}</span>
            }
            @if (k.key === 'password') {
              <button type="button" class="btn btn-ghost mt-1 text-xs" (click)="generate()">
                สุ่มรหัสผ่าน
              </button>
            }
          </div>
        }
        <div class="flex flex-col justify-between gap-2 md:pt-1">
          <div>
            <span class="label">ประเภทผู้ใช้</span>
            <div class="mt-1.5 flex items-center gap-3">
              <label class="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="userRole"
                  class="h-4 w-4 accent-sky-700"
                  [checked]="!model().admin"
                  (change)="setRole(false)"
                />
                <span>พยาบาล</span>
              </label>
              <label class="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="userRole"
                  class="h-4 w-4 accent-sky-700"
                  [checked]="model().admin"
                  (change)="setRole(true)"
                />
                <span class="font-semibold text-sky-800">Admin</span>
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="f().submitting()">
            เพิ่มบัญชี
          </button>
        </div>
      </form>
    </section>

    <section class="card mt-4 overflow-x-auto" aria-label="บัญชีทั้งหมด">
      @if (users.hasValue()) {
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-line text-xs text-ink-2">
              <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อผู้ใช้</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">ชื่อ</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">ประเภทผู้ใช้</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">สถานะ</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">สร้างเมื่อ</th>
              <th scope="col" class="px-4 py-2.5"><span class="sr-only">คำสั่ง</span></th>
            </tr>
          </thead>
          <tbody>
            @for (u of users.value(); track u.id) {
              <tr class="border-b border-sky-100 last:border-0" [class.text-ink-3]="!u.active">
                <td class="px-4 py-2.5 font-mono">{{ u.username }}</td>
                <td class="px-4 py-2.5">
                  {{ u.name }}
                  @if (u.id === me()?.id) {
                    <span class="badge badge-plain ml-1">คุณ</span>
                  }
                </td>
                <td class="px-4 py-2.5">
                  <span class="badge" [class]="u.admin ? 'badge-ok font-semibold' : 'badge-plain'">
                    {{ u.admin ? 'Admin' : 'พยาบาล' }}
                  </span>
                </td>
                <td class="px-4 py-2.5">
                  <span class="badge" [class]="u.active ? 'badge-ok' : 'badge-plain'">
                    {{ u.active ? 'ใช้งาน' : 'ปิดอยู่' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-2.5 text-ink-2">{{ time(u.createdAt) }}</td>
                <td class="whitespace-nowrap px-4 py-2.5 text-right">
                  @if (u.id !== me()?.id) {
                    <button
                      type="button"
                      class="btn btn-ghost"
                      [attr.aria-label]="
                        (u.admin ? 'เปลี่ยนเป็นพยาบาล ' : 'เปลี่ยนเป็น Admin ') + u.username
                      "
                      (click)="change(u, { admin: !u.admin })"
                    >
                      {{ u.admin ? 'เปลี่ยนเป็นพยาบาล' : 'เปลี่ยนเป็น Admin' }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost"
                      [class.text-rose-700]="u.active"
                      [attr.aria-label]="(u.active ? 'ปิดบัญชี ' : 'เปิดบัญชี ') + u.username"
                      (click)="change(u, { active: !u.active })"
                    >
                      {{ u.active ? 'ปิดบัญชี' : 'เปิดบัญชี' }}
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-ghost"
                    [attr.aria-label]="'ตั้งรหัสผ่านใหม่ ' + u.username"
                    (click)="reset(u)"
                  >
                    ตั้งรหัสผ่านใหม่
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else if (users.error()) {
        <p class="p-6 text-rose-700">โหลดรายการบัญชีไม่สำเร็จ</p>
      } @else {
        <p class="p-6 text-ink-2" role="status">กำลังโหลด…</p>
      }
    </section>

    @if (handed(); as h) {
      <section
        class="card mt-4 border-amber-300 bg-amber-50 p-4"
        role="status"
        aria-labelledby="handed-title"
      >
        <h2 id="handed-title" class="section-title">รหัสผ่านของ {{ h.username }}</h2>
        <p class="mt-1 text-sm text-ink-2">
          แจ้งรหัสนี้กับเจ้าของบัญชีทางช่องทางส่วนตัว แล้วให้เปลี่ยนเองหลังเข้าสู่ระบบ
          (ปิดหน้านี้แล้วจะไม่แสดงอีก)
        </p>
        <p class="mt-2 font-mono text-base" data-testid="handed-password">{{ h.password }}</p>
        <button type="button" class="btn mt-2" (click)="handed.set(null)">ซ่อน</button>
      </section>
    }
  `,
})
export class UsersPage {
  private readonly api = inject(StudioApi);
  private readonly session = inject(Session);
  private readonly confirm = inject(Confirm);
  private readonly toasts = inject(Toasts);

  protected readonly users = httpResource<Account[]>(() => '/api/users');
  protected readonly me = computed(() => this.session.user());
  /** A password just set, shown once so the admin can pass it on. */
  protected readonly handed = signal<{ username: string; password: string } | null>(null);

  protected readonly addKeys = [
    { key: 'username', label: 'ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)' },
    { key: 'name', label: 'ชื่อ-นามสกุล' },
    { key: 'password', label: 'รหัสผ่านเริ่มต้น' },
  ] as const;

  private readonly model = signal({ username: '', name: '', password: '', admin: false });
  protected readonly f = form(this.model, (p) => {
    required(p.username, { message: 'ใส่ชื่อผู้ใช้' });
    pattern(p.username, USERNAME, {
      message: 'ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีด และขีดล่าง 2 ถึง 40 ตัว',
    });
    required(p.name, { message: 'ใส่ชื่อของเจ้าของบัญชี' });
    required(p.password, { message: 'ใส่รหัสผ่านเริ่มต้น หรือกดสุ่มรหัสผ่าน' });
    minLength(p.password, 10, { message: 'รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร' });
  });

  protected shown(key: 'username' | 'name' | 'password'): boolean {
    return this.f[key]().touched() && this.f[key]().invalid();
  }

  protected first(key: 'username' | 'name' | 'password'): string {
    return this.f[key]().errors()[0]?.message ?? '';
  }

  protected time(iso: string): string {
    return formatTime(iso);
  }

  protected generate(): void {
    this.model.update((m) => ({ ...m, password: randomPassword() }));
  }

  protected setRole(admin: boolean): void {
    this.model.update((m) => ({ ...m, admin }));
  }

  protected async add(e: Event): Promise<void> {
    e.preventDefault();
    await submit(this.f, async (f) => {
      const a = this.model();
      try {
        await this.api.createUser(a);
      } catch (err) {
        const code = err instanceof ApiError ? err.code : '';
        const field = code.startsWith('username')
          ? f.username
          : code.startsWith('name')
            ? f.name
            : f.password;
        return [{ fieldTree: field, kind: 'server', message: failure(err) }];
      }
      this.handed.set({ username: a.username, password: a.password });
      this.model.set({ username: '', name: '', password: '', admin: false });
      this.f().reset();
      this.toasts.show(`เพิ่มบัญชี ${a.username} แล้ว`);
      this.users.reload();
      return undefined;
    });
  }

  protected async change(
    u: Account,
    to: Partial<Pick<Account, 'admin' | 'active'>>,
  ): Promise<void> {
    if (to.active === false) {
      const yes = await this.confirm.ask({
        title: `ปิดบัญชี ${u.username}?`,
        body: 'เจ้าของบัญชีจะออกจากระบบทันทีและเข้าสู่ระบบไม่ได้จนกว่าจะเปิดบัญชีอีกครั้ง เคสที่เขาเขียนยังอยู่',
        yes: 'ปิดบัญชี',
        danger: true,
      });
      if (!yes) return;
    }
    try {
      await this.api.updateUser(u.id, {
        name: u.name,
        admin: to.admin ?? u.admin,
        active: to.active ?? u.active,
      });
      this.toasts.show(`เปลี่ยนบัญชี ${u.username} แล้ว`);
    } catch (err) {
      this.toasts.show(failure(err), true);
    }
    this.users.reload();
  }

  protected async reset(u: Account): Promise<void> {
    const yes = await this.confirm.ask({
      title: `ตั้งรหัสผ่านใหม่ให้ ${u.username}?`,
      body: 'ระบบจะสุ่มรหัสผ่านใหม่ให้ แล้วเครื่องที่เข้าสู่ระบบด้วยบัญชีนี้อยู่จะต้องเข้าสู่ระบบใหม่',
      yes: 'ตั้งรหัสผ่านใหม่',
    });
    if (!yes) return;
    const password = randomPassword();
    try {
      await this.api.resetPassword(u.id, password);
      this.handed.set({ username: u.username, password });
    } catch (err) {
      this.toasts.show(failure(err), true);
    }
  }
}
