import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { call } from './studio-api';
import { Me } from './types';

/** The channel the Google popup's last page (/signin/done) tells the studio's pages on. */
export const GOOGLE_CHANNEL = 'casestudio-google';

/** What /signin/done says: null when signed in, else why not (GOOGLE_REFUSALS). */
export interface GoogleOutcome {
  refused: string | null;
}

/**
 * Who is signed in. Asked once before the first screen (which also gives the page its CSRF token);
 * a request refused because the session ended opens the sign-in dialog over the page, so nothing on
 * it is lost.
 */
@Service()
export class Session {
  private readonly http = inject(HttpClient);
  readonly user = signal<Me | null>(null);
  /** Google sign-in is set up on the server. */
  readonly google = signal(false);
  private popupDone: ((refused: string | null) => void) | null = null;

  constructor() {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(GOOGLE_CHANNEL);
    channel.onmessage = (e: MessageEvent<GoogleOutcome>) =>
      void this.fromPopup(e.data?.refused ?? null);
  }
  /** The session ended while a page was open: the sign-in dialog asks again. */
  readonly expired = signal(false);
  /** Counts sign-ins, so a page can load again what a refused request could not. */
  readonly signIns = signal(0);

  async load(): Promise<void> {
    try {
      const r = await firstValueFrom(
        this.http.get<{ user: Me | null; google?: boolean }>('/api/auth/session'),
      );
      this.user.set(r.user);
      this.google.set(r.google === true);
    } catch {
      this.user.set(null);
    }
  }

  async signIn(username: string, password: string): Promise<Me> {
    const r = await call(
      firstValueFrom(this.http.post<{ user: Me }>('/api/auth/signin', { username, password })),
    );
    this.user.set(r.user);
    this.expired.set(false);
    this.signIns.update((n) => n + 1);
    return r.user;
  }

  /** Where the browser goes to sign in with Google; next is the page to go on to (a path here). */
  googleUrl(next?: string, popup = false): string {
    const q = new URLSearchParams();
    if (next) q.set('next', next);
    if (popup) q.set('popup', '1');
    const s = q.toString();
    return '/api/auth/google/start' + (s ? '?' + s : '');
  }

  /**
   * Google sign-in in a popup, so the page under it (unsaved edits) stays: resolves null once
   * signed in, else why not. A popup closed without signing in never answers; the form stays usable.
   */
  googlePopup(): Promise<string | null> {
    const w = window.open(
      this.googleUrl(undefined, true),
      'casestudio-google',
      'popup,width=500,height=650',
    );
    if (!w) return Promise.resolve('popup-blocked');
    return new Promise((resolve) => (this.popupDone = resolve));
  }

  /** The popup's last page told every page of the studio how it ended. */
  private async fromPopup(refused: string | null): Promise<void> {
    if (!refused) {
      await this.load();
      if (this.user()) {
        this.expired.set(false);
        this.signIns.update((n) => n + 1);
      } else refused = 'failed';
    }
    const done = this.popupDone;
    this.popupDone = null;
    done?.(refused);
  }

  async signOut(): Promise<void> {
    try {
      await call(firstValueFrom(this.http.post<void>('/api/auth/signout', {})));
    } finally {
      this.user.set(null);
      this.expired.set(false);
    }
  }

  changePassword(current: string, next: string): Promise<void> {
    return call(firstValueFrom(this.http.put<void>('/api/auth/password', { current, next })));
  }

  /** A request was refused for want of a session. */
  ended(): void {
    if (this.user()) this.expired.set(true);
  }
}

/** A 401 from any route but sign-in itself means the session ended. */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(Session);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !req.url.startsWith('/api/auth/')
      )
        session.ended();
      return throwError(() => err);
    }),
  );
};
