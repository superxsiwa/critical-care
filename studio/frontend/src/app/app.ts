import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ConfirmHost } from './ui/confirm';
import { ToastHost } from './ui/toast';

/** The page: the studio's bar, the screen, the one dialog and the toasts. */
@Component({
  selector: 'cs-root',
  imports: [RouterOutlet, RouterLink, ConfirmHost, ToastHost],
  template: `
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <a routerLink="/" class="flex items-baseline gap-2">
          <span class="text-base font-semibold">Case Studio</span>
          <span class="text-sm text-sky-200">เขียนเคสสำหรับแอป Critical Care</span>
        </a>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 pt-4 pb-16">
      <router-outlet />
    </main>
    <cs-confirm-host />
    <cs-toast-host />
  `,
})
export class App {}
