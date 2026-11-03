import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SignInDialog } from './account/signin-dialog';
import { Session } from './api/session';
import { ConfirmHost } from './ui/confirm';
import { ToastHost } from './ui/toast';

/** The page: the studio's bar, the screen, the dialogs and the toasts. */
@Component({
  selector: 'cs-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmHost, ToastHost, SignInDialog],
  template: `
    <header class="bg-ink text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <a routerLink="/" class="flex items-baseline gap-2">
          <span class="text-base font-semibold">Case Studio</span>
          <span class="hidden text-sm text-sky-200 sm:inline">เขียนเคสสำหรับแอป Critical Care</span>
        </a>
        @if (session.user(); as me) {
          <nav class="ml-auto flex items-center gap-1 text-sm" aria-label="บัญชี">
            <span class="px-2 text-sky-100">{{ me.name }}</span>
            @if (me.admin) {
              <a
                routerLink="/users"
                routerLinkActive="bg-white/15"
                class="rounded-md px-2 py-1 hover:bg-white/10"
                >บัญชีผู้ใช้</a
              >
            }
            <a
              routerLink="/password"
              routerLinkActive="bg-white/15"
              class="rounded-md px-2 py-1 hover:bg-white/10"
              >เปลี่ยนรหัสผ่าน</a
            >
            <button
              type="button"
              class="rounded-md px-2 py-1 hover:bg-white/10"
              (click)="signOut()"
            >
              ออกจากระบบ
            </button>
          </nav>
        }
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 pt-4 pb-16">
      <router-outlet />
    </main>
    <cs-signin-dialog />
    <cs-confirm-host />
    <cs-toast-host />
  `,
})
export class App {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    // Leaving an editor with unsaved changes asks first, as any other way out of it does.
    if (this.router.url.startsWith('/drafts/') && !(await this.router.navigateByUrl('/'))) return;
    await this.session.signOut();
    await this.router.navigateByUrl('/signin');
  }
}
