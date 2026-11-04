import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SignInDialog } from './account/signin-dialog';
import { Session } from './api/session';
import { ConfirmHost } from './ui/confirm';
import { ToastHost } from './ui/toast';

/** The page: top header, 2-col sidebar menu, 10-col workspace, dialogs and toasts. */
@Component({
  selector: 'cs-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmHost, ToastHost, SignInDialog],
  template: `
    <header class="border-b border-line bg-ink text-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <a routerLink="/" class="flex items-baseline gap-2">
          <span class="text-lg font-bold tracking-tight text-white">Case Studio</span>
          <span class="hidden text-xs text-sky-200 sm:inline">Critical Care Case Authoring</span>
        </a>

        @if (session.user(); as me) {
          <nav class="relative" aria-label="บัญชี">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10 transition"
              [attr.aria-expanded]="profileOpen()"
              (click)="toggleProfile()"
            >
              <div
                class="flex h-7 w-7 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white uppercase"
              >
                {{ me.name ? me.name.charAt(0) : 'U' }}
              </div>
              <span class="text-sm font-medium">{{ me.name }}</span>
              <span class="text-xs text-sky-200" aria-hidden="true">▾</span>
            </button>

            @if (profileOpen()) {
              <div
                class="fixed inset-0 z-30"
                (click)="profileOpen.set(false)"
                aria-hidden="true"
              ></div>
              <div
                class="absolute right-0 z-40 mt-1 w-56 rounded-lg border border-line bg-white py-1.5 text-ink shadow-lg"
                role="menu"
              >
                <div class="border-b border-line px-3 py-2 text-xs">
                  <p class="font-semibold text-ink">{{ me.name }}</p>
                  <p class="text-ink-3">@{{ me.username }} · {{ me.admin ? 'Admin' : 'พยาบาล' }}</p>
                </div>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sky-50 transition"
                  role="menuitem"
                  (click)="showProfileDialog.set(true); profileOpen.set(false)"
                >
                  <span>👤</span>
                  <span>โปรไฟล์</span>
                </button>
                <a
                  routerLink="/password"
                  class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-sky-50 transition"
                  role="menuitem"
                  (click)="profileOpen.set(false)"
                >
                  <span>🔑</span>
                  <span>เปลี่ยนรหัสผ่าน</span>
                </a>
                <div class="my-1 border-t border-line"></div>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 transition"
                  role="menuitem"
                  (click)="signOut(); profileOpen.set(false)"
                >
                  <span>🚪</span>
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            }
          </nav>
        }
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6">
      @if (session.user(); as me) {
        <div class="grid grid-cols-12 gap-6">
          <!-- ส่วนของเมนู (ให้มีขนาด 2 cols) -->
          <aside class="col-span-12 lg:col-span-2">
            <nav class="card p-2 space-y-1 text-sm sticky top-4" aria-label="เมนูระบบ">
              <a
                routerLink="/"
                [routerLinkActiveOptions]="{ exact: true }"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>📊</span>
                <span>Board</span>
              </a>
              <a
                routerLink="/case"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>📋</span>
                <span>คลังเคส</span>
              </a>
              <a
                routerLink="/equipment"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>🧰</span>
                <span>คลังอุปกรณ์</span>
              </a>
              <a
                routerLink="/knowledge"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>📖</span>
                <span>คลังความรู้</span>
              </a>

              <div class="my-2 border-t border-line"></div>

              <a
                routerLink="/case-mg"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>📝</span>
                <span>จัดการเคส</span>
              </a>
              <a
                routerLink="/equipment-mg"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>📚</span>
                <span>จัดการคลังความรู้</span>
              </a>
              <a
                routerLink="/knowledge-mg"
                routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
              >
                <span>🔧</span>
                <span>จัดการอุปกรณ์</span>
              </a>

              @if (me.admin) {
                <div class="my-2 border-t border-line"></div>
                <a
                  routerLink="/users"
                  routerLinkActive="bg-sky-100 text-sky-900 font-semibold"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-ink-2 hover:bg-sky-50 transition"
                >
                  <span>👥</span>
                  <span>บัญชีผู้ใช้</span>
                </a>
              }
            </nav>
          </aside>

          <!-- ส่วนของพื้นที่ทำงาน (ให้มีขนาด 10 cols) -->
          <section class="col-span-12 lg:col-span-10 min-w-0">
            <router-outlet />
          </section>
        </div>
      } @else {
        <router-outlet />
      }
    </main>

    <!-- Modal ข้อมูลโปรไฟล์ -->
    @if (showProfileDialog() && session.user(); as me) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        role="dialog"
        aria-labelledby="profile-dialog-title"
        aria-modal="true"
      >
        <div class="card w-full max-w-sm p-5 shadow-xl">
          <div class="flex items-center justify-between border-b border-line pb-3">
            <h2 id="profile-dialog-title" class="text-base font-semibold text-ink">
              ข้อมูลโปรไฟล์
            </h2>
            <button
              type="button"
              class="btn btn-ghost btn-icon text-xs"
              aria-label="ปิด"
              (click)="showProfileDialog.set(false)"
            >
              ✕
            </button>
          </div>
          <div class="mt-4 space-y-3 text-sm">
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-800 text-lg font-bold text-white uppercase"
              >
                {{ me.name ? me.name.charAt(0) : 'U' }}
              </div>
              <div>
                <p class="font-semibold text-ink">{{ me.name }}</p>
                <span class="badge" [class]="me.admin ? 'badge-ok font-semibold' : 'badge-plain'">
                  {{ me.admin ? 'Admin' : 'พยาบาล' }}
                </span>
              </div>
            </div>
            <div class="rounded-lg bg-sky-50/60 p-3 space-y-1.5 text-xs text-ink-2">
              <p><strong>ชื่อผู้ใช้ (Username):</strong> {{ me.username }}</p>
              <p>
                <strong>ประเภทผู้ใช้:</strong>
                {{ me.admin ? '1. Admin (ผู้ดูแลระบบ)' : '2. พยาบาล (Nurse)' }}
              </p>
              <p>
                <strong>สิทธิ์การใช้งาน:</strong>
                {{
                  me.admin
                    ? 'สิทธิ์เต็มรูปแบบ (จัดการเคส, อุปกรณ์, ความรู้, และจัดการบัญชีผู้ใช้)'
                    : 'สิทธิ์จัดการเคส, คลังอุปกรณ์, และคลังความรู้'
                }}
              </p>
              <p><strong>สถานะบัญชี:</strong> ใช้งานปกติ</p>
            </div>
          </div>
          <div class="mt-5 flex justify-end">
            <button
              type="button"
              class="btn btn-primary text-xs"
              (click)="showProfileDialog.set(false)"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    }

    <cs-signin-dialog />
    <cs-confirm-host />
    <cs-toast-host />
  `,
})
export class App {
  protected readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly profileOpen = signal(false);
  protected readonly showProfileDialog = signal(false);

  protected toggleProfile(): void {
    this.profileOpen.set(!this.profileOpen());
  }

  protected async signOut(): Promise<void> {
    // Leaving an editor with unsaved changes asks first, as any other way out of it does.
    if (this.router.url.startsWith('/drafts/') && !(await this.router.navigateByUrl('/'))) return;
    await this.session.signOut();
    await this.router.navigateByUrl('/signin');
  }
}
