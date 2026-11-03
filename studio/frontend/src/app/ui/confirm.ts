import { Component, ElementRef, Service, effect, inject, signal, viewChild } from '@angular/core';

export interface ConfirmAsk {
  title: string;
  body?: string;
  yes: string;
  danger?: boolean;
}

interface Open extends ConfirmAsk {
  answer: (yes: boolean) => void;
}

/** One question at a time, in a modal dialog: ask() resolves true for yes, false for anything else. */
@Service()
export class Confirm {
  readonly open = signal<Open | null>(null);

  ask(q: ConfirmAsk): Promise<boolean> {
    this.open()?.answer(false);
    return new Promise((resolve) =>
      this.open.set({
        ...q,
        answer: (yes) => {
          this.open.set(null);
          resolve(yes);
        },
      }),
    );
  }
}

/** The dialog, mounted once at the root. Escape and the backdrop answer no. */
@Component({
  selector: 'cs-confirm-host',
  template: `
    <dialog
      #dlg
      class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      aria-labelledby="confirm-title"
      (cancel)="answer(false, $event)"
      (click)="backdrop($event)"
    >
      @if (confirm.open(); as q) {
        <div class="p-5">
          <h2 id="confirm-title" class="text-base font-semibold">{{ q.title }}</h2>
          @if (q.body) {
            <p class="mt-2 text-sm text-ink-2">{{ q.body }}</p>
          }
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="btn" (click)="answer(false)">ยกเลิก</button>
            <button
              type="button"
              class="btn"
              [class.btn-primary]="!q.danger"
              [class.btn-danger]="q.danger"
              (click)="answer(true)"
            >
              {{ q.yes }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmHost {
  protected readonly confirm = inject(Confirm);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const d = this.dialog().nativeElement;
      if (this.confirm.open() && !d.open) d.showModal();
      else if (!this.confirm.open() && d.open) d.close();
    });
  }

  protected answer(yes: boolean, e?: Event): void {
    e?.preventDefault();
    this.confirm.open()?.answer(yes);
  }

  protected backdrop(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.answer(false);
  }
}
