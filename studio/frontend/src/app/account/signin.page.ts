import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SignInForm } from './signin-form';

/** Where a person who is not signed in lands; afterwards they go on to where they were going. */
@Component({
  selector: 'cs-signin-page',
  imports: [SignInForm],
  template: `
    <div class="mx-auto mt-10 max-w-sm">
      <section class="card p-6" aria-labelledby="signin-title">
        <h1 id="signin-title" class="text-lg font-semibold">เข้าสู่ระบบ Case Studio</h1>
        <p class="mt-1 mb-4 text-sm text-ink-2">
          สำหรับผู้ใช้งาน 2 ประเภท: 1. Admin 2. พยาบาล (บัญชีสร้างโดย Admin)
        </p>
        <cs-signin-form [next]="next()" [googleRefused]="google()" (signedIn)="go()" />
      </section>
      <p class="mt-4 text-center text-xs text-ink-3">
        <a class="underline" href="/about.html">เกี่ยวกับ Case Studio</a> ·
        <a class="underline" href="/privacy.html">นโยบายความเป็นส่วนตัว</a>
      </p>
    </div>
  `,
})
export class SignInPage {
  private readonly router = inject(Router);
  /** Where to go after signing in (from the guard); only a path of this site. */
  readonly next = input<string>();
  /** Why a Google sign-in was just refused (the server sends ?google=<code>). */
  readonly google = input<string>();

  protected go(): void {
    const next = this.next();
    const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    void this.router.navigateByUrl(safe, { replaceUrl: true });
  }
}
