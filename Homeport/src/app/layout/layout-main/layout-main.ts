import { Component, HostListener, ChangeDetectorRef, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AiPanelComponent } from '../../features/ai/ai-panel.component';
import { AiOnboardingDialogComponent } from '../../features/ai/ai-onboarding-dialog.component';
import { AiService } from '../../features/ai/ai.service';
import { FlowsBackendService } from '../../services/flows-backend.service';
import { FormsModule } from '@angular/forms';
import { AccessControlService, User } from '../../services/access-control.service';
import { AuthService } from '../../services/auth.service';
import { NotificationsBackendService, BackendNotification } from '../../services/notifications-backend.service';
import { UiMessageService } from '../../services/ui-message.service';
import { ConfirmService, ConfirmRequest } from '../../services/confirm.service';
import { NzModalService } from 'ng-zorro-antd/modal';
type MenuItem = { label: string; icon: string; route?: string; children?: MenuItem[]; adminOnly?: boolean };

@Component({
  selector: 'app-layout-main',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    NzFlexModule,
    NzIconModule,
    RouterModule,

    //Layout
    NzBreadCrumbModule,
    NzMenuModule,
    NzLayoutModule,
    NzButtonModule,
    NzDrawerModule,
    NzAvatarModule,
    NzBadgeModule,
    NzDropDownModule,
    NzPopoverModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    AiPanelComponent,
    AiOnboardingDialogComponent,
  ],
  templateUrl: './layout-main.html',
  styleUrl: './layout-main.scss'
})
export class LayoutMain implements OnInit {
  menu: MenuItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Assistant IA', icon: 'robot', route: '/ai' },
    { label: 'Flows', icon: 'branches', route: '/flows' },
    { label: 'Formulaires', icon: 'form', route: '/forms' },
    { label: 'Sites web', icon: 'global', route: '/websites' },
    { label: 'Templates de nœuds', icon: 'appstore', route: '/node-templates' },
    { label: 'Credentials', icon: 'key', route: '/credentials' },
    { label: 'Workspaces', icon: 'cluster', route: '/workspaces', adminOnly: true },
    { label: 'Users', icon: 'user', route: '/users', adminOnly: true },
    { label: 'Apps / Providers', icon: 'api', route: '/apps' },
    { label: 'Plugin Repos', icon: 'database', route: '/plugin-repos', adminOnly: true },
    { label: 'Notifications', icon: 'bell', route: '/notifications' },
    { label: 'Debugging', icon: 'tool', route: '/debug' },
    { label: 'Paramètres', icon: 'setting', route: '/settings' },
  ];
  drawerVisible = false;
  innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  siderCollapsed = false;
  private siderInitDone = false;
  showLaunch = false; // desktop center bar visibility (legacy)
  mobileSearchOpen = false; // responsive: shows center search bar
  // User & workspace switchers
  selectedUserId: string | null = null;
  selectedWorkspaceId: string | null = null;

  constructor(private router: Router, public acl: AccessControlService, private cdr: ChangeDetectorRef, private auth: AuthService, private notifApi: NotificationsBackendService, private ui: UiMessageService, private confirm: ConfirmService, private modal: NzModalService, private flowsApi: FlowsBackendService, public aiService: AiService) {
    // initialize selected user
    this.selectedUserId = this.acl.currentUser()?.id || null;
    this.selectedWorkspaceId = this.acl.currentWorkspaceId();
  }
  ngOnInit(): void {
    try {
      // Restore sider collapsed state from localStorage or set default for tablet widths
      const raw = localStorage.getItem('layout.siderCollapsed');
      if (raw != null) {
        this.siderCollapsed = String(raw) === 'true';
      } else {
        // Default: collapse on tablets (sider visible ~ 992-1279) to save space
        try { this.siderCollapsed = (this.innerWidth >= 992 && this.innerWidth < 1280); } catch { this.siderCollapsed = false; }
        localStorage.setItem('layout.siderCollapsed', String(this.siderCollapsed));
      }
      this.siderInitDone = true;
      try { this.cdr.detectChanges(); } catch {}

      // Global confirm bridge: show styled NzModal for guard-originated confirmations
      this.confirm.requests$.subscribe((req: ConfirmRequest) => {
        if (req.extraText) {
          let ref: any;
          const closeAndResolve = (v: boolean | 'extra') => {
            this.confirm.resolve(req.id, v);
            try { ref?.close(); } catch {}
          };
          ref = this.modal.create({
            nzTitle: req.title,
            nzContent: req.content,
            nzCentered: req.centered ?? true,
            nzWidth: req.width ?? 480,
            nzClassName: req.className || 'unsaved-leave-modal',
            nzOnCancel: () => closeAndResolve(false),
            nzFooter: [
              { label: req.cancelText || 'Annuler', onClick: () => closeAndResolve(false) },
              { label: req.extraText, type: 'primary', onClick: () => closeAndResolve('extra') },
              { label: req.okText || 'OK', danger: true, type: 'primary', onClick: () => closeAndResolve(true) }
            ]
          });
          return;
        }
        const ref = this.modal.confirm({
          nzTitle: req.title,
          nzContent: req.content,
          nzOkText: req.okText || 'OK',
          nzCancelText: req.cancelText || 'Annuler',
          nzOkDanger: true,
          nzCentered: req.centered ?? true,
          nzWidth: req.width ?? 480,
          nzClassName: req.className || 'unsaved-leave-modal',
          nzOnOk: () => this.confirm.resolve(req.id, true),
          nzOnCancel: () => this.confirm.resolve(req.id, false)
        });
        void ref;
      });
      this.acl.changes$.subscribe(() => {
        // keep header selections in sync if service adjusts them
        this.selectedUserId = this.acl.currentUser()?.id || this.selectedUserId;
        this.selectedWorkspaceId = this.acl.currentWorkspaceId();
        try { this.cdr.detectChanges(); } catch {}
        // Reload notifications on workspace change
        this.loadNotifications();
      });
    } catch {}
    // Handle AI action requests (open_element, open_credentials)
    this.aiService.actionRequests$.subscribe(action => {
      if (action.action === 'open_element') {
        this.openElement(action as any);
      }
    });

    // Initial notifications load
    this.loadNotifications();
  }

  get showSider(): boolean { return this.innerWidth >= 992; }
  get isXs(): boolean { return this.innerWidth <= 576; }

  @HostListener('window:resize') onResize() { try { this.innerWidth = window.innerWidth; } catch { } }

  onSiderCollapsedChange(v: boolean) {
    this.siderCollapsed = !!v;
    try { localStorage.setItem('layout.siderCollapsed', String(this.siderCollapsed)); } catch {}
  }

  openDrawer() { this.drawerVisible = true; }
  closeDrawer() { this.drawerVisible = false; }
  go(route?: string) {
    this.drawerVisible = false;
    if (route && typeof route === 'string') {
      this.router.navigateByUrl(route);
    }
  }

  getActiveOptions(route?: string): { exact: boolean } {
    // Keep parent menu active for subroutes of /node-templates
    if (route === '/node-templates') return { exact: false };
    // Keep parent menu active for subroutes of /apps
    if (route === '/apps') return { exact: false };
    // Keep menu active for children under websites and debugging
    if (route === '/websites') return { exact: false };
    if (route === '/debug') return { exact: false };
    return { exact: true };
  }

  // Notifications (backend)
  notifications: Array<{ id: string; title: string; desc: string; acknowledged: boolean; link?: string; severity?: string }> = [];
  notifUnreadCount = 0;
  notifLoading = false;
  private refreshUnreadCount() {
    const wsRaw = this.acl.currentWorkspaceId() || undefined;
    const wsId = (wsRaw && /^[a-fA-F0-9]{24}$/.test(String(wsRaw))) ? wsRaw : undefined;
    this.notifApi.count({ workspaceId: wsId, acknowledged: 'false' }).subscribe({
      next: (n) => { this.notifUnreadCount = Number(n) || 0; },
      error: () => { /* keep previous value */ },
    });
  }
  loadNotifications() {
    const wsRaw = this.acl.currentWorkspaceId() || undefined;
    const wsId = (wsRaw && /^[a-fA-F0-9]{24}$/.test(String(wsRaw))) ? wsRaw : undefined;
    this.notifLoading = true;
    this.notifApi.list({ workspaceId: wsId, page: 1, limit: 20, sort: 'createdAt:desc' }).subscribe({
      next: (list: BackendNotification[]) => {
        const items = (list || []).map(n => ({
          id: String((n as any).id || (n as any)._id || ''),
          title: n.code || n.entityType || 'Notification',
          desc: n.message || '',
          acknowledged: !!n.acknowledged,
          link: n.link || undefined,
          severity: n.severity || 'info',
        }));
        this.notifications = items;
        // Use server count for accuracy beyond pagination
        this.refreshUnreadCount();
      },
      error: () => {},
      complete: () => { this.notifLoading = false; try { this.cdr.detectChanges(); } catch {} }
    });
  }
  openNotificationsPopover() { this.loadNotifications(); }
  ackAllNotifications() {
    const wsRaw = this.acl.currentWorkspaceId() || undefined;
    const wsId = (wsRaw && /^[a-fA-F0-9]{24}$/.test(String(wsRaw))) ? wsRaw : undefined;
    this.notifApi.ackAll(wsId).subscribe({
      next: () => {
        this.notifications.forEach(n => n.acknowledged = true);
        this.notifUnreadCount = 0;
        try { this.cdr.detectChanges(); } catch {}
        this.ui.success('Toutes les notifications marquées comme lues');
      },
      error: () => this.ui.error('Échec du marquage')
    });
  }
  ackNotification(n: { id: string; acknowledged: boolean }) {
    if (!n || n.acknowledged) return;
    const id = (n as any).id;
    if (!id || !/^[a-fA-F0-9]{24}$/.test(String(id))) { this.ui.error('Identifiant de notification invalide'); return; }
    this.notifApi.ack(id).subscribe({ next: () => {
      n.acknowledged = true;
      // Trigger change detection for immediate UI update
      try { this.cdr.detectChanges(); } catch {}
      this.refreshUnreadCount();
      this.ui.success('Notification marquée comme lue');
    }, error: () => this.ui.error('Échec de l\'accusé de lecture') });
  }
  deleteNotification(n: { id: string }) {
    if (!n) return;
    const id = (n as any).id;
    if (!id || !/^[a-fA-F0-9]{24}$/.test(String(id))) { this.ui.error('Identifiant de notification invalide'); return; }
    this.notifApi.delete(id).subscribe({ next: () => {
      this.notifications = this.notifications.filter(x => x.id !== n.id);
      // Trigger change detection for immediate UI update
      try { this.cdr.detectChanges(); } catch {}
      this.refreshUnreadCount();
      this.ui.success('Notification supprimée');
    }, error: () => this.ui.error('Échec de la suppression') });
  }
  openNotification(n: { id: string; link?: string; acknowledged: boolean }) {
    if (!n) return;
    // Ack then navigate if link
    const go = () => { if (n.link) this.router.navigateByUrl(n.link); };
    if (!n.acknowledged) {
      const id = (n as any).id;
      if (!id || !/^[a-fA-F0-9]{24}$/.test(String(id))) { go(); return; }
      this.notifApi.ack(id).subscribe({ next: () => { n.acknowledged = true; try { this.cdr.detectChanges(); } catch {} this.refreshUnreadCount(); go(); }, error: () => go() });
    } else {
      go();
    }
  }

  openElement(action: { elementType: string; elementId: string; elementName?: string }) {
    switch (action.elementType) {
      case 'flow':
        this.router.navigate(['/flow-builder', 'editor'], { queryParams: { flow: action.elementId } });
        break;
      case 'form':
        this.router.navigate(['/dynamic-form'], { queryParams: { session: action.elementId } });
        break;
      case 'website':
        this.router.navigate(['/websites/editor'], { queryParams: { id: action.elementId } });
        break;
    }
  }

  logout() { this.auth.logout(); }

  toggleAi() { this.aiService.toggleDrawer(); }

  @ViewChild(AiOnboardingDialogComponent) onboardingDialog?: AiOnboardingDialogComponent;
  openOnboarding() { this.onboardingDialog?.open(); }

  // Permissions helpers
  get isAdmin(): boolean { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  get currentUser(): User | null { return this.acl.currentUser(); }
  get accessibleWorkspaces() { return this.acl.workspaces().filter(w => this.acl.canAccessWorkspace(w.id)); }
  get userInitials(): string {
    const n = this.acl.currentUser()?.name || '';
    const parts = n.trim().split(/\s+/).filter(Boolean);
    const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.slice(0,2) || 'U');
    return initials.toUpperCase();
  }
  onUserChange(id: string) {
    // Defer to next tick to avoid ExpressionChanged errors in dev
    setTimeout(() => {
      this.selectedUserId = id;
      this.acl.setCurrentUser(id);
      // Adjust workspace selection when switching users
      this.selectedWorkspaceId = this.acl.currentWorkspaceId();
      // Do not auto-redirect away from dynamic-form session routes
      const isFormBuilderSession = this.isFormBuilderSessionNow();
      if (isFormBuilderSession) {
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      try { this.cdr.detectChanges(); } catch {}
    }, 0);
  }
  onWorkspaceChange(id: string) {
    // Defer to next tick to avoid ExpressionChanged errors in dev
    setTimeout(() => {
      this.selectedWorkspaceId = id;
      this.acl.setCurrentWorkspace(id);
      // If currently in a builder/viewer detail route, go back to list
      try {
        const currentUrl = this.router.url || '';
        // When user is editing a form via route (/dynamic-form?session=...), do NOT auto-redirect
        const isFormBuilderSession = this.isFormBuilderSessionNow();
        if (currentUrl.startsWith('/flow-builder')) {
          this.router.navigateByUrl('/flows');
        } else if (currentUrl.startsWith('/dynamic-form')) {
          if (!isFormBuilderSession) {
            this.router.navigateByUrl('/forms');
          }
        } else if (currentUrl.startsWith('/websites/editor') || currentUrl.startsWith('/websites/viewer') || currentUrl.startsWith('/websites/page')) {
          this.router.navigateByUrl('/websites');
        }
      } catch { }
      try { this.cdr.detectChanges(); } catch {}
    }, 0);
  }
  private isFormBuilderSessionNow(): boolean {
    try {
      const url = this.router.url || '';
      const qs = (typeof window !== 'undefined' && window.location?.search) ? window.location.search : '';
      return (url.startsWith('/dynamic-form') || url.includes('/dynamic-form')) && (/[?&]session=/.test(url) || /[?&]session=/.test(qs));
    } catch { return false; }
  }

  // Central manager (quick actions)
  cmdVisible = false;
  activities = [
    { kind: 'run', label: 'Exécution “SendMail #21”', state: 'success', time: 'il y a 1 min' },
    { kind: 'build', label: 'Build “HTTP Request”', state: 'running', time: 'en cours' },
    { kind: 'form', label: 'Form “Onboarding” sauvegardé', state: 'success', time: 'il y a 10 min' }
  ];

  recentFlows = [
    { id: 'f-01', name: 'Envoi mail', updated: 'il y a 2 min' },
    { id: 'f-02', name: 'HTTP Request', updated: 'il y a 1 h' },
  ];
  recentForms = [
    { id: 'fo-01', name: 'Onboarding', updated: 'hier' },
    { id: 'fo-02', name: 'Demande de congés', updated: 'il y a 3 j' },
  ];

  openCmd() { this.cmdVisible = true; }
  closeCmd() { this.cmdVisible = false; }
  runQuick() { /* simulation */ this.activities.unshift({ kind: 'run', label: 'Exécution rapide', state: 'running', time: 'maintenant' }); }
  onSearch(v: string) {
    const val = (v || '').trim().toLowerCase();
    if (!val) return;
    // Route heuristics: f* → flows, form* → forms
    if (/^form/.test(val)) this.router.navigateByUrl('/forms'); else this.router.navigateByUrl('/flows');
  }

  // Launch bar (mobile)
  // Desktop/mobile toggles for the center bar
  openLaunch() { if (!this.showSider) this.showLaunch = true; }
  closeLaunch() { this.showLaunch = false; }
  toggleMobileSearch() { if (!this.showSider) this.mobileSearchOpen = !this.mobileSearchOpen; }

}
