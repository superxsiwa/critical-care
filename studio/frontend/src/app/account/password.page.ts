import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ApiError } from '../api/studio-api';
import { Session } from '../api/session';
import { Toasts } from '../ui/toast';
import { failure } from '../ui/words';

/** Changing one's own password; every other session of the account ends with it. */
@Component({
  selector: 'cs-password-page',
  imports: [FormField, RouterLink],
  template: `
    <div class="mx-auto mt-6 max-w-md">
      <section class="card p-6" aria-labelledby="password-title">
        <h1 id="password-title" class="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h1>
        <p class="mt-1 mb-4 text-sm text-ink-2">
          อย่างน้อย 10 ตัวอักษร เมื่อเปลี่ยนแล้ว
          เครื่องอื่นที่เข้าสู่ระบบด้วยบัญชีนี้จะต้องเข้าสู่ระบบใหม่
        </p>
        <form class="space-y-3" (submit)="send($event)" novalidate>
          @for (k of keys; track k.key) {
            <div>
              <label class="label" [for]="'pw-' + k.key">{{ k.label }}</label>
              <input
                class="input"
                type="password"
                [id]="'pw-' + k.key"
                [attr.autocomplete]="k.key === 'current' ? 'current-password' : 'new-password'"
                [formField]="f[k.key]"
                [attr.aria-invalid]="shown(k.key) ? 'true' : null"
                [attr.aria-describedby]="shown(k.key) ? 'pw-' + k.key + '-err' : null"
              />
              @if (shown(k.key)) {
                <span class="field-error" [id]="'pw-' + k.key + '-err'">{{ first(k.key) }}</span>
              }
            </div>
          }
          <div class="flex gap-2 pt-1">
            <button type="submit" class="btn btn-primary" [disabled]="f().submitting()">
              เปลี่ยนรหัสผ่าน
            </button>
            <a routerLink="/" class="btn">กลับไปรายการเคส</a>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class PasswordPage {
  private readonly session = inject(Session);
  private readonly toasts = inject(Toasts);
  protected readonly keys = [
    { key: 'current', label: 'รหัสผ่านปัจจุบัน' },
    { key: 'next', label: 'รหัสผ่านใหม่' },
    { key: 'again', label: 'รหัสผ่านใหม่อีกครั้ง' },
  ] as const;

  private readonly model = signal({ current: '', next: '', again: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.current, { message: 'ใส่รหัสผ่านปัจจุบัน' });
    required(p.next, { message: 'ใส่รหัสผ่านใหม่' });
    minLength(p.next, 10, { message: 'รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร' });
    validate(p.again, ({ value, valueOf }) =>
      value() === valueOf(p.next)
        ? undefined
        : { kind: 'mismatch', message: 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน' },
    );
  });

  protected shown(key: 'current' | 'next' | 'again'): boolean {
    return this.f[key]().touched() && this.f[key]().invalid();
  }

  protected first(key: 'current' | 'next' | 'again'): string {
    return this.f[key]().errors()[0]?.message ?? '';
  }

  protected async send(e: Event): Promise<void> {
    e.preventDefault();
    await submit(this.f, async (f) => {
      const { current, next } = this.model();
      try {
        await this.session.changePassword(current, next);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'wrong')
          return [{ fieldTree: f.current, kind: 'server', message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }];
        return [{ fieldTree: f.next, kind: 'server', message: failure(err) }];
      }
      this.model.set({ current: '', next: '', again: '' });
      this.f().reset();
      this.toasts.show('เปลี่ยนรหัสผ่านแล้ว');
      return undefined;
    });
  }
}
