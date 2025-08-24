import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessControlService } from './access-control.service';

export const adminGuard: CanActivateFn = () => {
  const acl = inject(AccessControlService);
  const router = inject(Router);
  const isAdmin = (acl.currentUser()?.role || 'member') === 'admin';
  if (isAdmin) return true;
  // Redirect to a not-authorized page
  try { router.navigateByUrl('/not-authorized'); } catch {}
  return false;
};

