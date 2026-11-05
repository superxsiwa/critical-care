import { Routes } from '@angular/router';
import { adminOnly, signedIn, signedOut } from './account/guards';
import { SignInPage } from './account/signin.page';
import type { DraftEditorPage } from './editor/draft-editor.page';

/**
 * The routes: Board, Case Library, Equipment, Knowledge, Case MG, Knowledge MG, Equipment MG.
 * Sign-in comes with the first load; every other page loads when first opened.
 */
export const routes: Routes = [
  {
    path: 'signin',
    component: SignInPage,
    title: 'เข้าสู่ระบบ · Case Studio',
    canActivate: [signedOut],
  },
  {
    path: '',
    canActivateChild: [signedIn],
    children: [
      {
        path: '',
        loadComponent: () => import('./board/board.page').then((m) => m.BoardPage),
        title: 'Board · Case Studio',
      },
      {
        path: 'case',
        loadComponent: () =>
          import('./case-library/case-library.page').then((m) => m.CaseLibraryPage),
        title: 'คลังเคส · Case Studio',
      },
      {
        path: 'equipment',
        loadComponent: () => import('./equipment/equipment.page').then((m) => m.EquipmentPage),
        title: 'คลังอุปกรณ์ · Case Studio',
      },
      {
        path: 'knowledge',
        loadComponent: () => import('./knowledge/knowledge.page').then((m) => m.KnowledgePage),
        title: 'คลังความรู้ · Case Studio',
      },
      {
        path: 'guide',
        loadComponent: () => import('./knowledge/knowledge.page').then((m) => m.KnowledgePage),
        title: 'คลังความรู้ · Case Studio',
      },
      {
        path: 'case-mg',
        loadComponent: () => import('./case-mg/case-mg.page').then((m) => m.CaseMgPage),
        title: 'จัดการเคส · Case Studio',
      },
      {
        path: 'knowledge-mg',
        loadComponent: () => import('./knowledge/knowledge-mg.page').then((m) => m.KnowledgeMgPage),
        title: 'จัดการคลังความรู้ · Case Studio',
      },
      {
        path: 'equipment-mg',
        loadComponent: () => import('./equipment/equipment-mg.page').then((m) => m.EquipmentMgPage),
        title: 'จัดการอุปกรณ์ · Case Studio',
      },
      {
        path: 'drafts/:id',
        loadComponent: () => import('./editor/draft-editor.page').then((m) => m.DraftEditorPage),
        title: 'แก้ไขเคส · Case Studio',
        // Leaving with unsaved changes asks first (a browser reload or close: beforeunload).
        canDeactivate: [(page: DraftEditorPage) => page.canLeave()],
      },
      {
        path: 'password',
        loadComponent: () => import('./account/password.page').then((m) => m.PasswordPage),
        title: 'เปลี่ยนรหัสผ่าน · Case Studio',
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users.page').then((m) => m.UsersPage),
        title: 'บัญชีผู้ใช้ · Case Studio',
        canActivate: [adminOnly],
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
