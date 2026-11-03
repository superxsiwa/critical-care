import { Routes } from '@angular/router';
import { DraftEditorPage } from './editor/draft-editor.page';
import { DraftListPage } from './list/draft-list.page';

export const routes: Routes = [
  { path: '', component: DraftListPage, title: 'เคสทั้งหมด · Case Studio' },
  {
    path: 'drafts/:id',
    component: DraftEditorPage,
    title: 'แก้ไขเคส · Case Studio',
    // Leaving with unsaved changes asks first (a browser reload or close: beforeunload).
    canDeactivate: [(page: DraftEditorPage) => page.canLeave()],
  },
  { path: '**', redirectTo: '' },
];
