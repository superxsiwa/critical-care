import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { Session, sessionInterceptor } from './api/session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // CSRF: every write echoes the XSRF-TOKEN cookie in X-XSRF-TOKEN (the server's names).
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([sessionInterceptor]),
    ),
    provideRouter(routes, withComponentInputBinding()),
    // Who is signed in, before the first route decides anything (and the page's CSRF token).
    provideAppInitializer(() => inject(Session).load()),
  ],
};
