import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { call } from './studio-api';
import { Me } from './types';

/**
 * Who is signed in. Asked once before the first screen (which also gives the page its CSRF token);
 * a request refused because the session ended opens the sign-in dialog over the page, so nothing on
 * it is lost.
 */
@Service()
export class Session {
  private readonly http = inject(HttpClient);
  readonly user = signal<Me | null>(null);
  /** The session ended while a page was open: the sign-in dialog asks again. */
  readonly expired = signal(false);
  /** Counts sign-ins, so a page can load again what a refused request could not. */
  readonly signIns = signal(0);

  async load(): Promise<void> {
    try {
      const r = await firstValueFrom(this.http.get<{ user: Me | null }>('/api/auth/session'));
      this.user.set(r.user);
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
