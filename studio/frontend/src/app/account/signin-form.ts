import { Component, inject, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Session } from '../api/session';
import { Me } from '../api/types';
import { failure } from '../ui/words';

/** Username and password. Used by the sign-in page and by the dialog when a session ends. */
@Component({
  selector: 'cs-signin-form',
  imports: [FormField],
  template: `
    <form class="space-y-3" (submit)="send($event)" novalidate>
      <div>
        <label class="label" for="signin-username">ชื่อผู้ใช้</label>
        <input
          id="signin-username"
          class="input"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          [formField]="f.username"
          [attr.aria-invalid]="shown(f.username) ? 'true' : null"
          [attr.aria-describedby]="shown(f.username) ? 'signin-username-err' : null"
        />
        @if (shown(f.username)) {
          <span id="signin-username-err" class="field-error">{{ first(f.username) }}</span>
        }
      </div>
      <div>
        <label class="label" for="signin-password">รหัสผ่าน</label>
        <input
          id="signin-password"
          class="input"
          type="password"
          autocomplete="current-password"
          [formField]="f.password"
          [attr.aria-invalid]="shown(f.password) ? 'true' : null"
          [attr.aria-describedby]="shown(f.password) ? 'signin-password-err' : null"
        />
        @if (shown(f.password)) {
          <span id="signin-password-err" class="field-error">{{ first(f.password) }}</span>
        }
      </div>
      @if (refused(); as r) {
        <p class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{{ r }}</p>
      }
      <button type="submit" class="btn btn-primary w-full" [disabled]="f().submitting()">
        {{ f().submitting() ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ' }}
      </button>
    </form>
  `,
})
export class SignInForm {
  private readonly session = inject(Session);
  readonly signedIn = output<Me>();

  private readonly model = signal({ username: '', password: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.username, { message: 'ใส่ชื่อผู้ใช้' });
    required(p.password, { message: 'ใส่รหัสผ่าน' });
  });
  protected readonly refused = signal('');

  protected shown(field: typeof this.f.username): boolean {
    return field().touched() && field().invalid();
  }

  protected first(field: typeof this.f.username): string {
    return field().errors()[0]?.message ?? '';
  }

  protected async send(e: Event): Promise<void> {
    e.preventDefault();
    this.refused.set('');
    await submit(this.f, async () => {
      const { username, password } = this.model();
      try {
        this.signedIn.emit(await this.session.signIn(username, password));
      } catch (err) {
        this.refused.set(failure(err));
        this.model.update((m) => ({ ...m, password: '' }));
      }
      return undefined;
    });
  }
}
