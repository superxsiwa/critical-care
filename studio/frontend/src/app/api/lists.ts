import { httpResource } from '@angular/common/http';
import { computed, effect, inject, untracked } from '@angular/core';
import { Session } from './session';
import { EquipmentItem, KnowledgeArticle, PublishedRevision } from './types';

/**
 * A list from the server, for a page that shows it. Signed in again after the session ended (the
 * sign-in dialog), it loads again: the request that was refused could not.
 */
export function serverList<T>(url: string) {
  const resource = httpResource<T[]>(() => url);
  const session = inject(Session);
  let seen = untracked(session.signIns);
  effect(() => {
    const n = session.signIns();
    if (n !== seen) {
      seen = n;
      untracked(() => resource.reload());
    }
  });
  return { resource, items: computed(() => (resource.hasValue() ? resource.value() : [])) };
}

/** The names of the app's equipment pictures, by picture. */
export const equipmentList = () => serverList<EquipmentItem>('/api/equipment');

/** The knowledge articles, oldest first. */
export const knowledgeList = () => serverList<KnowledgeArticle>('/api/knowledge');

/** The case sets published to the app, newest first. */
export const publishedList = () => serverList<PublishedRevision>('/api/publish');
