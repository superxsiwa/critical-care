import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Session } from '../api/session';
import { Me } from '../api/types';
import { GOOGLE_REFUSALS, failure } from '../ui/words';

/** Google's mark and the words Google gives for its button in Thai. */
@Component({
  selector: 'cs-google-mark',
  host: { class: 'contents' },
  template: `
    <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
    <span>ลงชื่อเข้าใช้ด้วย Google</span>
  `,
})
export class GoogleMark {}

/**
 * Sign in with Google (the default, when the server has it), or with a username and password (the
 * fallback). Used by the sign-in page (Google takes the whole window, then goes on to next) and by
 * the dialog when a session ends (popup: Google opens in a small window, so the page's unsaved edits
 * stay).
 */
@Component({
  selector: 'cs-signin-form',
  imports: [FormField, GoogleMark],
  template: `
    @if (session.google()) {
      @if (popup()) {
        <button type="button" class="btn btn-google w-full" (click)="googlePopup()">
          <cs-google-mark />
        </button>
      } @else {
        <a class="btn btn-google w-full" [href]="googleHref()">
          <cs-google-mark />
        </a>
      }
      @if (googleMessage(); as m) {
        <p class="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {{ m }}
        </p>
      }
      <p class="my-4 flex items-center gap-3 text-xs text-ink-3">
        <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
        หรือใช้ชื่อผู้ใช้และรหัสผ่าน
        <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
      </p>
    }
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
      <button
        type="submit"
        class="btn w-full"
        [class.btn-primary]="!session.google()"
        [disabled]="f().submitting()"
      >
        {{ f().submitting() ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ' }}
      </button>
    </form>
  `,
})
export class SignInForm {
  protected readonly session = inject(Session);
  readonly signedIn = output<Me>();
  /** In the dialog over a page: Google in a popup. */
  readonly popup = input(false);
  /** The page to go on to after a full-window Google sign-in. */
  readonly next = input<string>();
  /** Why the last Google sign-in was refused (the page's ?google=), until another try. */
  readonly googleRefused = input<string | null | undefined>(null);

  private readonly popupRefused = signal<string | null>(null);
  protected readonly googleMessage = computed(() => {
    const code = this.popupRefused() ?? this.googleRefused();
    return code ? (GOOGLE_REFUSALS[code] ?? GOOGLE_REFUSALS['failed']) : '';
  });
  protected readonly googleHref = computed(() => this.session.googleUrl(this.next()));

  protected async googlePopup(): Promise<void> {
    this.popupRefused.set(null);
    const refused = await this.session.googlePopup();
    const me = this.session.user();
    if (refused === null && me) this.signedIn.emit(me);
    else this.popupRefused.set(refused ?? 'failed');
  }

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
