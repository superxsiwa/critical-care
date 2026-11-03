import { Routes } from '@angular/router';
import { adminOnly, signedIn, signedOut } from './account/guards';
import { SignInPage } from './account/signin.page';
import type { DraftEditorPage } from './editor/draft-editor.page';
import { DraftListPage } from './list/draft-list.page';

/** The list and sign-in come with the first load; the other pages load when first opened. */
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
      { path: '', component: DraftListPage, title: 'เคสทั้งหมด · Case Studio' },
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
