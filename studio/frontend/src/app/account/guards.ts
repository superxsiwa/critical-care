import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Session } from '../api/session';

/** The studio's pages need a signed-in person; the sign-in page sends them on afterwards. */
export const signedIn: CanActivateFn = (_route, state) =>
  inject(Session).user()
    ? true
    : inject(Router).createUrlTree(['/signin'], { queryParams: { next: state.url } });

/** The accounts page is an admin's. */
export const adminOnly: CanActivateFn = () =>
  inject(Session).user()?.admin ? true : inject(Router).createUrlTree(['/']);

/** Signed in already: the sign-in page has nothing to do. */
export const signedOut: CanActivateFn = () =>
  inject(Session).user() ? inject(Router).createUrlTree(['/']) : true;
