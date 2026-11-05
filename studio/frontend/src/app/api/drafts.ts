import { computed } from '@angular/core';
import { serverList } from './lists';
import { DraftItem } from './types';

/** Every draft, for a page that lists them (loaded again after a sign-in, as every list is). */
export function draftList() {
  const { resource, items } = serverList<DraftItem>('/api/drafts');
  return {
    resource,
    items,
    ready: computed(() => items().filter((d) => !d.problems).length),
    withProblems: computed(() => items().filter((d) => (d.problems ?? 0) > 0).length),
  };
}
