import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessControlService } from './access-control.service';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const acl = inject(AccessControlService);
  const router = inject(Router);
  const isAdmin = (acl.currentUser()?.role || 'member') === 'admin';
  if (isAdmin) return true;
  // Redirect to a not-authorized page
  try { router.navigateByUrl('/not-authorized'); } catch {}
  return false;
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.loggedIn()) return true;
  try { router.navigateByUrl('/login'); } catch {}
  return false;
};
