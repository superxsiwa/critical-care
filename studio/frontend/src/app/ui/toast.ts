import { Component, Service, inject, signal } from '@angular/core';

interface Toast {
  id: number;
  text: string;
  bad: boolean;
}

/** Short messages after an action; they leave by themselves. */
@Service()
export class Toasts {
  readonly list = signal<Toast[]>([]);
  private next = 1;

  show(text: string, bad = false): void {
    const t = { id: this.next++, text, bad };
    this.list.update((l) => [...l, t]);
    setTimeout(() => this.dismiss(t.id), bad ? 8000 : 4000);
  }

  dismiss(id: number): void {
    this.list.update((l) => l.filter((t) => t.id !== id));
  }
}

@Component({
  selector: 'cs-toast-host',
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      @for (t of toasts.list(); track t.id) {
        <div
          class="pointer-events-auto flex max-w-xl items-start gap-3 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg"
          [class.bg-ink]="!t.bad"
          [class.bg-rose-700]="t.bad"
        >
          <span class="whitespace-pre-line">{{ t.text }}</span>
          <button
            type="button"
            class="-mr-1 shrink-0 rounded px-1 text-white/80 hover:text-white"
            aria-label="ปิด"
            (click)="toasts.dismiss(t.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  protected readonly toasts = inject(Toasts);
}
