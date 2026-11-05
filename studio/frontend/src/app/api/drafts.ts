import { httpResource } from '@angular/common/http';
import { computed, effect, inject, untracked } from '@angular/core';
import { Session } from './session';
import { DraftItem } from './types';

/**
 * Every draft, for a page that lists them. Signed in again after the session ended (the sign-in
 * dialog), it loads again: the request that was refused could not.
 */
export function draftList() {
  const drafts = httpResource<DraftItem[]>(() => '/api/drafts');
  const session = inject(Session);
  let seen = untracked(session.signIns);
  effect(() => {
    const n = session.signIns();
    if (n !== seen) {
      seen = n;
      untracked(() => drafts.reload());
    }
  });
  const items = computed(() => (drafts.hasValue() ? drafts.value() : []));
  return {
    resource: drafts,
    items,
    ready: computed(() => items().filter((d) => !d.problems).length),
    withProblems: computed(() => items().filter((d) => (d.problems ?? 0) > 0).length),
  };
}
