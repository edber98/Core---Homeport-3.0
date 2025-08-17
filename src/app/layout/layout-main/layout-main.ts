import { Component, HostListener } from '@angular/core';
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
type MenuItem = { label: string; icon: string; route?: string; children?: MenuItem[] };

@Component({
  selector: 'app-layout-main',
  standalone: true,
  imports: [
    CommonModule,
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
    NzModalModule
  ],
  templateUrl: './layout-main.html',
  styleUrl: './layout-main.scss'
})
export class LayoutMain {
  menu: MenuItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Flows', icon: 'branches', route: '/flows' },
    { label: 'Formulaires', icon: 'form', route: '/forms' },
    { label: 'Templates de nœuds', icon: 'appstore', route: '/node-templates' },
    { label: 'Apps / Providers', icon: 'api', route: '/apps' },
    { label: 'Paramètres', icon: 'setting', route: '/settings' },
  ];
  drawerVisible = false;
  innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  siderCollapsed = false;
  showLaunch = false; // desktop center bar visibility (legacy)
  mobileSearchOpen = false; // responsive: shows center search bar

  constructor(private router: Router) { }

  get showSider(): boolean { return this.innerWidth >= 992; }

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
