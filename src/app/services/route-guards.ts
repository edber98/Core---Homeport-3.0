import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccessControlService } from './access-control.service';
import { AuthService } from './auth.service';
import { FlowSharedStateService } from './flow-shared-state.service';
import { ConfirmService } from './confirm.service';

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

// Warn when leaving the Flow Builder feature (not when switching child routes)
export const unsavedChangesGuard: CanDeactivateFn<any> = (
  component: any,
  _currentRoute: ActivatedRouteSnapshot,
  _currentState: RouterStateSnapshot,
  nextState?: RouterStateSnapshot
) => {
  try {
    // Decide if we're staying inside the workbench (any /flow-builder path)
    const nextUrl = String(nextState?.url || '');
    const stayingInWorkbench = nextUrl.startsWith('/flow-builder');
    // Current location context
    const currentUrl = String(_currentState?.url || '');
    const inFlowBuilder = currentUrl.startsWith('/flow-builder');
    const inDynamicForm = currentUrl.startsWith('/dynamic-form');

    // Check unsaved via component or shared state fallback
    let has = false;
    try { if (component && typeof component.hasUnsavedChanges === 'function') has = !!component.hasUnsavedChanges(); } catch {}
    // Shared-state fallback (only relevant for Flow Builder, not for other routes like /dynamic-form)
    let flowId: string | null = null;
    try { if (component && typeof component.currentFlowId === 'string') flowId = component.currentFlowId; } catch {}
    if (!has && inFlowBuilder && !inDynamicForm) {
      try {
        const shared = inject(FlowSharedStateService);
        const cur = (shared as any).current as { id?: string; currentChecksum?: string | null; serverChecksum?: string | null } | null;
        if (cur && typeof cur.id === 'string') flowId = cur.id;
        if (cur && cur.currentChecksum && typeof cur.serverChecksum !== 'undefined') {
          has = cur.currentChecksum !== cur.serverChecksum;
        }
      } catch {}
    }

    const purgeDraft = () => {
      try {
        if (component && typeof component.purgeDraft === 'function') { component.purgeDraft(); return; }
      } catch {}
      try { if (flowId) localStorage.removeItem('flow.draft.' + flowId); } catch {}
    };

    // If navigation keeps us inside /flow-builder (including executions), do nothing
    if (stayingInWorkbench) return true;

    if (has) {
      const confirm = inject(ConfirmService);
      return confirm.ask({
        title: 'Quitter sans sauvegarder ?',
        content: 'Vous avez des modifications non enregistrées qui seront perdues si vous quittez cette page.',
        okText: 'Quitter',
        cancelText: 'Rester',
        className: 'unsaved-leave-modal',
        centered: true,
        width: 480,
      }).then(ok => { if (ok) purgeDraft(); return ok; });
    } else {
      // No unsaved changes: still clean any residual draft for this flow when leaving the builder
      purgeDraft();
      return true;
    }
  } catch {}
  return true;
};
