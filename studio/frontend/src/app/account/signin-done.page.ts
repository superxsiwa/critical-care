import { Component, OnInit, input } from '@angular/core';
import { GOOGLE_CHANNEL, GoogleOutcome } from '../api/session';
import { GOOGLE_REFUSALS } from '../ui/words';

/**
 * The Google popup's last page (the sign-in dialog opened it): it tells the studio's pages how the
 * sign-in ended, then closes itself. Opened on its own, it says what happened and links on.
 */
@Component({
  selector: 'cs-signin-done-page',
  template: `
    <div class="mx-auto mt-10 max-w-sm">
      <section class="card p-6" aria-labelledby="done-title">
        <h1 id="done-title" class="text-lg font-semibold">
          {{ message() ? 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' : 'เข้าสู่ระบบแล้ว' }}
        </h1>
        <p class="mt-2 text-sm text-ink-2" role="status">
          {{ message() || 'กลับไปที่หน้าเดิมได้เลย หน้าต่างนี้จะปิดเอง' }}
        </p>
        <a class="btn mt-4" href="/">ไปที่ Case Studio</a>
      </section>
    </div>
  `,
})
export class SignInDonePage implements OnInit {
  /** Why it was refused (?google=<code>); none when signed in. */
  readonly google = input<string>();

  protected message(): string {
    const code = this.google();
    return code ? (GOOGLE_REFUSALS[code] ?? GOOGLE_REFUSALS['failed']) : '';
  }

  ngOnInit(): void {
    const outcome: GoogleOutcome = { refused: this.google() || null };
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(GOOGLE_CHANNEL);
      channel.postMessage(outcome);
      channel.close();
    }
    // Only a window a script opened may close itself; opened on its own, the page stays.
    setTimeout(() => window.close(), 300);
  }
}
