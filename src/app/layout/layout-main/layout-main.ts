import { Component, HostListener, ChangeDetectorRef, OnInit } from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { AccessControlService, User } from '../../services/access-control.service';
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
    NzSelectModule
  ],
  templateUrl: './layout-main.html',
  styleUrl: './layout-main.scss'
})
export class LayoutMain implements OnInit {
  menu: MenuItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Flows', icon: 'branches', route: '/flows' },
    { label: 'Formulaires', icon: 'form', route: '/forms' },
    { label: 'Sites web', icon: 'global', route: '/websites' },
    { label: 'Templates de nœuds', icon: 'appstore', route: '/node-templates' },
    { label: 'Workspaces', icon: 'cluster', route: '/workspaces', adminOnly: true },
    { label: 'Users', icon: 'user', route: '/users', adminOnly: true },
    { label: 'Apps / Providers', icon: 'api', route: '/apps' },
    { label: 'Debugging', icon: 'tool', route: '/debug' },
    { label: 'Paramètres', icon: 'setting', route: '/settings' },
  ];
  drawerVisible = false;
  innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  siderCollapsed = false;
  showLaunch = false; // desktop center bar visibility (legacy)
  mobileSearchOpen = false; // responsive: shows center search bar
  // User & workspace switchers
  selectedUserId: string | null = null;
  selectedWorkspaceId: string | null = null;

  constructor(private router: Router, public acl: AccessControlService, private cdr: ChangeDetectorRef) {
    // initialize selected user
    this.selectedUserId = this.acl.currentUser()?.id || null;
    this.selectedWorkspaceId = this.acl.currentWorkspaceId();
  }
  ngOnInit(): void {
    try {
      this.acl.changes$.subscribe(() => {
        // keep header selections in sync if service adjusts them
        this.selectedUserId = this.acl.currentUser()?.id || this.selectedUserId;
        this.selectedWorkspaceId = this.acl.currentWorkspaceId();
        try { this.cdr.detectChanges(); } catch {}
      });
    } catch {}
  }

  get showSider(): boolean { return this.innerWidth >= 992; }
  get isXs(): boolean { return this.innerWidth <= 576; }

  @HostListener('window:resize') onResize() { try { this.innerWidth = window.innerWidth; } catch { } }

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

  // Simulated notifications (epuré, Apple-like style)
  notifications = [
    { title: 'Build terminé', desc: 'Flow “Envoi mail” compilé avec succès', time: 'il y a 2 min', unread: true },
    { title: 'Exécution', desc: 'Scénario Slack exécuté', time: 'il y a 15 min', unread: false },
    { title: 'Formulaire', desc: 'Nouveau brouillon “Onboarding”', time: 'hier', unread: false },
  ];

  logout() {
    // Simulation de déconnexion
    this.router.navigateByUrl('/dashboard');
  }

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
