import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Session } from '../api/session';
import { Toasts } from '../ui/toast';
import { SignInForm } from './signin-form';

/**
 * Over the page when the session ended (a request was refused for it): signing in again keeps
 * everything on the page, unsaved edits included; then the person repeats what they were doing.
 */
@Component({
  selector: 'cs-signin-dialog',
  imports: [SignInForm],
  template: `
    <dialog
      #dlg
      class="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      aria-labelledby="expired-title"
      (cancel)="close($event)"
    >
      @if (session.expired()) {
        <div class="p-5">
          <h2 id="expired-title" class="text-base font-semibold">กรุณาเข้าสู่ระบบอีกครั้ง</h2>
          <p class="mt-1 mb-4 text-sm text-ink-2">
            หมดเวลาการใช้งาน งานที่ยังไม่บันทึกยังอยู่ในหน้านี้ เข้าสู่ระบบแล้วทำรายการเดิมอีกครั้ง
          </p>
          <cs-signin-form [popup]="true" (signedIn)="done()" />
          <button type="button" class="btn btn-ghost mt-2 w-full" (click)="close()">ปิด</button>
        </div>
      }
    </dialog>
  `,
})
export class SignInDialog {
  protected readonly session = inject(Session);
  private readonly toasts = inject(Toasts);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const d = this.dialog().nativeElement;
      if (this.session.expired() && !d.open) d.showModal();
      else if (!this.session.expired() && d.open) d.close();
    });
  }

  protected done(): void {
    this.toasts.show('เข้าสู่ระบบแล้ว: ทำรายการเดิมอีกครั้ง');
  }

  protected close(e?: Event): void {
    e?.preventDefault();
    this.session.expired.set(false);
  }
}
