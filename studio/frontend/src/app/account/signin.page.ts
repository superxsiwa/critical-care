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
          สำหรับอาจารย์ผู้เขียนเคส บัญชีสร้างโดยผู้ดูแลระบบ
        </p>
        <cs-signin-form (signedIn)="go()" />
      </section>
    </div>
  `,
})
export class SignInPage {
  private readonly router = inject(Router);
  /** Where to go after signing in (from the guard); only a path of this site. */
  readonly next = input<string>();

  protected go(): void {
    const next = this.next();
    const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    void this.router.navigateByUrl(safe, { replaceUrl: true });
  }
}
