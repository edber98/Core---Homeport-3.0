import { Component, HostListener, ChangeDetectorRef, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { ChatRendererComponent } from '../../shared/chat/chat-renderer.component';
import { RichPart, mergeText } from '../../shared/chat/chat-types';
import { AiFlowAgentService, FlowAgentEvent } from '../../services/ai-flow-agent.service';
import { AiPanelComponent } from '../../features/ai/ai-panel.component';
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
    ChatRendererComponent,
    AiPanelComponent,
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
    { label: 'Credentials', icon: 'key', route: '/credentials' },
    { label: 'Workspaces', icon: 'cluster', route: '/workspaces', adminOnly: true },
    { label: 'Users', icon: 'user', route: '/users', adminOnly: true },
    { label: 'Apps / Providers', icon: 'api', route: '/apps' },
    { label: 'Plugin Repos', icon: 'database', route: '/plugin-repos', adminOnly: true },
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
  // Command Center — AI Flow quick create
  ccPrompt = '';
  ccBusy = false;
  ccStreamingParts: RichPart[] = [];
  private ccRecent = new Set<string>();
  private ccStop?: () => void;
  @ViewChild('ccScroller') ccScroller?: ElementRef<HTMLDivElement>;
  private ccMeta: { name?: string; description?: string } = {};

  constructor(private router: Router, public acl: AccessControlService, private cdr: ChangeDetectorRef, private auth: AuthService, private notifApi: NotificationsBackendService, private ui: UiMessageService, private confirm: ConfirmService, private modal: NzModalService, private flowAgent: AiFlowAgentService, private flowsApi: FlowsBackendService, public aiService: AiService) {
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
  notifications: Array<{ id: string; title: string; desc: string; acknowledged: boolean; link?: string }> = [];
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

  logout() { this.auth.logout(); }

  toggleAi() { this.aiService.toggleDrawer(); }

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

  // Generate workflow from prompt in Command Center
  startQuickFlow() {
    const t = (this.ccPrompt || '').trim();
    if (!t || this.ccBusy) return;
    this.ccBusy = true; this.ccStreamingParts = []; this.ccMeta = {}; try { this.ccRecent.clear(); } catch {}
    const stream = this.flowAgent.stream({ prompt: t });
    this.ccStop = stream.stop;
    stream.events$.subscribe({ next: (ev) => this.onCcEvent(ev), error: () => this.onCcError('Erreur de flux') });
  }
  stopQuickFlow() { try { this.ccStop?.(); } catch {} this.ccBusy = false; }

  private onCcError(msg: string) {
    this.ccBusy = false;
    this.ccStreamingParts.push({ kind: 'log', badge: 'FLOW', status: 'error', text: msg });
    try { this.cdr.detectChanges(); } catch {}
    this.ccScrollToBottom();
  }
  private onCcEvent(evt: FlowAgentEvent) {
    if (!evt) return;
    if (evt.type === 'message' && evt.text) {
      const raw = String(evt.text);
      const norm = raw.replace(/(>>>\s*tool\s+)/g, '\n$1').replace(/(\u2713|✓)\s+/g, '\n$&').replace(/(\[ai-form\])/gi, '\n$1').replace(/(\[ai-flow\])/gi, '\n$1');
      const lines = norm.split(/\r?\n/);
      for (const seg of lines) {
        if (!seg) continue; const s = seg.trim(); if (!s) continue;
        if (this.tryCcParseExecLine(s)) continue;
        this.ccAppendText(seg);
      }
      try { this.cdr.detectChanges(); } catch {}
      this.ccScrollToBottom();
      return;
    }
    if (evt.type === 'final' && (evt as any).graph) {
      const graph = (evt as any).graph;
      // Create the flow in current workspace
      const wsId = this.acl.currentWorkspaceId();
      if (!wsId) { this.ui.error('Aucun workspace'); this.ccBusy = false; return; }
      const meta = (this.ccMeta && (this.ccMeta.name || this.ccMeta.description)) ? (this.ccMeta as any) : { name: 'Nouveau workflow', description: '' };
      // Create even if graph is not yet valid (force) and start disabled
      this.flowsApi.create(wsId, { name: meta.name, description: meta.description, status: 'draft', enabled: false, graph, force: true }, true).subscribe({
        next: (res) => {
          try { this.ui.success('Workflow créé'); } catch {}
          const id = (res && (res.data?.id || res.id)) || null;
          this.ccBusy = false; this.cmdVisible = false;
          if (id) this.router.navigate(['/flow-builder','editor'], { queryParams: { flow: id, center: '1' } });
        },
        error: () => { this.ccBusy = false; this.ui.error('Création du workflow échouée'); }
      });
      return;
    }
    if (evt.type === 'meta') {
      const name = (evt as any).name ? String((evt as any).name) : undefined;
      const description = (evt as any).description ? String((evt as any).description) : undefined;
      this.ccMeta = { name, description };
      // also show a compact line in the stream for transparency
      const line = [name ? `name=“${name}”` : '', description ? `desc=“${description}”` : ''].filter(Boolean).join(' · ');
      if (line) this.ccStreamingParts.push({ kind: 'log', badge: 'FLOW', status: 'info', text: `meta ${line}` });
      try { this.cdr.detectChanges(); } catch {}
      this.ccScrollToBottom();
      return;
    }
    // forward key events for context
    if (evt.type === 'ai-form.tool.start') {
      const name = String((evt as any).name || 'tool');
      const args = (evt as any).args ? JSON.stringify((evt as any).args) : '';
      const key = `tool:start:${name}:${args}`;
      if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'tool', name, status: 'running', text: args, badge: 'AI FORM' }); this.ccRecent.add(key); }
    } else if (evt.type === 'ai-form.tool.end') {
      const name = String((evt as any).name || 'tool');
      const key = `tool:ok:${name}:ok`;
      if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'tool', name, status: 'success', text: 'ok', badge: 'AI FORM' }); this.ccRecent.add(key); }
    } else if (evt.type === 'ai-form.patch') {
      const ops = Array.isArray((evt as any).ops)?(evt as any).ops.length:0; const key = `ai-form:patch:${ops}`;
      if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'ai-form', status: 'info', text: `patch ops=${ops}`, badge: 'AI FORM' }); this.ccRecent.add(key); }
    } else if (evt.type === 'ai-form.snapshot') {
      const key = 'ai-form:snapshot'; if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'ai-form', status: 'info', text: 'snapshot', badge: 'AI FORM' }); this.ccRecent.add(key); }
    }
    try { this.cdr.detectChanges(); } catch {}
    this.ccScrollToBottom();
  }
  private ccAppendText(token: string) {
    const t = String(token || ''); if (!t) return;
    const last = this.ccStreamingParts[this.ccStreamingParts.length - 1];
    if (last && last.kind === 'text' && !last.badge) last.text = mergeText(last.text || '', t);
    else this.ccStreamingParts.push({ kind: 'text', text: mergeText('', t) });
  }
  private tryCcParseExecLine(s: string): boolean {
    const mMsgAiForm = s.match(/^\[ai-form\]\s*\[msg\]\s*(.*)$/i); if (mMsgAiForm) { this.ccAppendAiFormMsg(mMsgAiForm[1] || ''); return true; }
    const mMsgFlow = s.match(/^\[ai-flow\]\s*\[msg\]\s*(.*)$/i); if (mMsgFlow) { this.ccAppendFlowMsg(mMsgFlow[1] || ''); return true; }
    if (s.startsWith('>>> tool ')) {
      const rest = s.slice(9).trim(); const m = rest.match(/^(\S+)\s*(.*)$/); const name = m ? m[1] : (rest.split(/\s+/)[0] || 'tool'); const args = m ? m[2] : '';
      const key = `tool:start:${name}:${args}`; if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'tool', name, status: 'running', text: (args || rest), badge: 'TOOL' }); this.ccRecent.add(key); }
      return true;
    }
    if (s.startsWith('✓ ')) {
      const rest = s.slice(2).trim(); const m = rest.match(/^(\S+)\s*(.*)$/); const name = m ? m[1] : (rest.split(/\s+/)[0] || 'tool'); const tail = m ? m[2] : '';
      const key = `tool:ok:${name}:${tail || 'ok'}`; if (!this.ccRecent.has(key)) { this.ccStreamingParts.push({ kind: 'tool', name, status: 'success', text: (tail || 'ok'), badge: 'TOOL' }); this.ccRecent.add(key); }
      return true;
    }
    const m = s.match(/^\[([^\]]+)\]\s*(.*)$/); if (m) {
      const tag = m[1]; const text = m[2] || ''; const low = s.toLowerCase(); const status: 'error'|'warn'|'success'|'info' = (low.includes('error')||low.includes('[error]')) ? 'error' : (low.includes('warn') ? 'warn' : (low.includes('ok')||low.includes('success')) ? 'success' : 'info');
      const isFlow = this.ccIsFlowTag(tag);
      this.ccStreamingParts.push({ kind: 'log', tag, text, status, badge: isFlow ? 'FLOW' : undefined });
      return true;
    }
    return false;
  }
  private ccAppendAiFormMsg(text: string) {
    const t = String(text || ''); if (!t.trim()) return;
    for (let i = this.ccStreamingParts.length - 1; i >= 0; i--) {
      const p = this.ccStreamingParts[i];
      if (p && p.kind === 'ai-form' && p.badge === 'AI FORM' && p.name === 'Assistant formulaire:') { p.text = mergeText(p.text || '', t); return; }
    }
    this.ccStreamingParts.push({ kind: 'ai-form', badge: 'AI FORM', name: 'Assistant formulaire:', text: mergeText('', t) });
  }
  private ccAppendFlowMsg(text: string) {
    const t = String(text || ''); if (!t.trim()) return;
    for (let i = this.ccStreamingParts.length - 1; i >= 0; i--) {
      const p = this.ccStreamingParts[i];
      if (p && p.kind === 'log' && p.badge === 'FLOW' && p.name === 'Assistant workflow:') { p.text = mergeText(p.text || '', t); return; }
    }
    this.ccStreamingParts.push({ kind: 'log', badge: 'FLOW', name: 'Assistant workflow:', text: mergeText('', t) });
  }
  private ccIsFlowTag(tag?: string): boolean { const t = (tag || '').toLowerCase(); return !!(['ai-flow','edge','layout','outputs','context','args','flags','start','condition','template','schema','node','graph','elk','connect','layout.elk'].find(k => t.includes(k))); }
  private ccSuggestMeta(prompt: string): { name: string; description: string } {
    const p = (prompt || '').trim().replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
    const clean = p.replace(/["'`]/g, '').replace(/[\[\](){}]/g, '').replace(/[.,;:!?]+$/,'');
    let name = clean.split(/\.|;|:|,|\s-\s/)[0].trim();
    name = name.replace(/^[a-z]/, m => m.toUpperCase()).slice(0, 60);
    if (name.length < 6) name = 'Workflow — ' + (clean.slice(0, 40) || 'Sans titre');
    const description = clean.slice(0, 240);
    return { name, description };
  }
  private ccScrollToBottom(){ try { const el = this.ccScroller?.nativeElement; if (el) setTimeout(()=> el.scrollTop = el.scrollHeight, 0); } catch {} }
}
