import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CatalogService, NodeTemplate } from './catalog.service';
import { CompanyService } from './company.service';
import { WorkspaceBackendService } from './workspace-backend.service';
import { environment } from '../../environments/environment';

export type Role = 'admin' | 'member';

export interface Workspace {
  id: string;      // slug-like id
  name: string;    // display name
  companyId?: string; // optional company scope
  isDefault?: boolean;
  templatesAllowed?: string[];
}

export interface User {
  id: string;      // slug-like id
  name: string;    // display name
  role: Role;
  workspaces: string[]; // workspace ids the user can access (ignored for admin)
  companyId?: string;   // optional company scope
}

type ResourceKind = 'flow' | 'form' | 'website';

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private USERS_KEY = 'acl.users';
  private WORKSPACES_KEY = 'acl.workspaces';
  private CURRENT_USER_KEY = 'acl.currentUserId';
  private TPL_ALLOW_KEY = 'acl.allowedTemplates.'; // + workspaceId => string[]
  private MAP_KEY = 'acl.resource.'; // + kind + '.' + id => workspaceId

  private _users = signal<User[]>([]);
  private _workspaces = signal<Workspace[]>([]);
  private _currentUserId = signal<string | null>(null);
  private _currentWorkspaceId = signal<string | null>(null);

  users = computed(() => this._users());
  workspaces = computed(() => this._workspaces());
  currentUser = computed<User | null>(() => {
    if (environment.useBackend) {
      // In backend mode, UI authorization is handled server-side; expose a synthetic admin user
      return { id: 'backend', name: 'Backend', role: 'admin', workspaces: [] } as User;
    }
    const id = this._currentUserId();
    return (this._users().find(u => u.id === id) || null);
  });
  currentWorkspace = computed<Workspace | null>(() => {
    const id = this._currentWorkspaceId();
    return (this._workspaces().find(w => w.id === id) || null);
  });

  // Emits when user/workspace changes so UI can refresh
  private _changes = new BehaviorSubject<number>(0);
  readonly changes$ = this._changes.asObservable();

  constructor(private catalog: CatalogService, private company: CompanyService, private wsBackend: WorkspaceBackendService) {
    this.ensureSeed();
  }

  // ===== Seed data =====
  private ensureSeed() {
    if (environment.useBackend) {
      // No local seeding in backend mode; sync from API
      this._users.set([]);
      this._workspaces.set([]);
      try {
        this.wsBackend.list({ page: 1, limit: 100 }).subscribe(list => {
          const mapped: Workspace[] = (list || []).map(w => ({ id: String((w as any).id || (w as any)._id || ''), name: (w as any).name, companyId: undefined, isDefault: (w as any).isDefault, templatesAllowed: (w as any).templatesAllowed || [] }));
          this._workspaces.set(mapped);
          this.save(this.WORKSPACES_KEY, mapped);
          // Initialize current workspace after sync
          const wsId2 = this.pickDefaultWorkspaceId();
          this._currentWorkspaceId.set(wsId2);
          try { console.debug('[ACL] Synced workspaces (backend)', { count: mapped.length, currentWorkspaceId: wsId2, workspaces: mapped }); } catch {}
          this._changes.next(Date.now());
        });
      } catch {}
      return;
    }
    const storedUsers = this.load<User[]>(this.USERS_KEY, []);
    const storedWs = this.load<Workspace[]>(this.WORKSPACES_KEY, []);
    let curr = this.load<string | null>(this.CURRENT_USER_KEY, null);
    if (!storedWs.length) {
      const acme = 'acme';
      const beta = 'beta';
      const ws: Workspace[] = [
        { id: 'default', name: 'Default', companyId: acme },
        { id: 'marketing', name: 'Marketing', companyId: acme },
        { id: 'beta-default', name: 'Beta — Default', companyId: beta },
        { id: 'beta-ops', name: 'Beta — Ops', companyId: beta },
      ];
      this.save(this.WORKSPACES_KEY, ws);
      this._workspaces.set(ws);
      // allow all templates by default for all workspaces
      ws.forEach(w => this.save(this.TPL_ALLOW_KEY + w.id, []));
    } else {
      this._workspaces.set(storedWs);
    }
    if (!storedUsers.length) {
      const users: User[] = [
        { id: 'admin', name: 'Admin', role: 'admin', workspaces: [], companyId: 'acme' },
        { id: 'alice', name: 'Alice', role: 'member', workspaces: ['default'], companyId: 'acme' },
        { id: 'demo', name: 'Demo', role: 'member', workspaces: ['beta-default'], companyId: 'beta' },
      ];
      this.save(this.USERS_KEY, users);
      this._users.set(users);
      curr = users[0].id;
      this.save(this.CURRENT_USER_KEY, curr);
      this._currentUserId.set(curr);
    } else {
      this._users.set(storedUsers);
      this._currentUserId.set(curr || storedUsers[0]?.id || null);
    }
    // If branché au backend, synchroniser la liste des workspaces
    if (environment.useBackend) {
      try {
        this.wsBackend.list({ page: 1, limit: 100 }).subscribe(list => {
          const mapped: Workspace[] = (list || []).map(w => ({ id: String((w as any).id || (w as any)._id || ''), name: (w as any).name, companyId: undefined, isDefault: (w as any).isDefault, templatesAllowed: (w as any).templatesAllowed || [] }));
          if (mapped.length) {
            this._workspaces.set(mapped);
            this.save(this.WORKSPACES_KEY, mapped);
          }
          // Initialize current workspace after sync
          const wsId2 = this.pickDefaultWorkspaceId();
          this._currentWorkspaceId.set(wsId2);
          this._changes.next(Date.now());
        });
      } catch {}
    }
    // Initialize current workspace to first accessible
    const wsId = this.pickDefaultWorkspaceId();
    this._currentWorkspaceId.set(wsId);
    // Seed resource mapping across workspaces if missing
    this.seedResourceMappings();
  }

  // ===== Public API =====
  setCurrentUser(userId: string) {
    const exists = this._users().some(u => u.id === userId);
    if (!exists) return;
    this._currentUserId.set(userId);
    this.save(this.CURRENT_USER_KEY, userId);
    // Always switch to a workspace belonging to the user's company and accessible
    this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
    try { console.debug('[ACL] Current user set', { userId, currentWorkspaceId: this._currentWorkspaceId(), workspaces: this._workspaces() }); } catch {}
    this._changes.next(Date.now());
  }

  listUsers(): Observable<User[]> { return of(this._users()); }
  listWorkspaces(): Observable<Workspace[]> { return of(this._workspaces()); }
  listCompanyWorkspaces(): Observable<Workspace[]> {
    const cid = this.currentUser()?.companyId || null;
    const all = this._workspaces();
    const filtered = cid ? all.filter(w => (w.companyId || null) === cid) : all;
    return of(filtered);
  }

  addWorkspace(name: string): Observable<Workspace> {
    // License enforcement: respect maxWorkspaces
    const currCount = this._workspaces().length;
    if (!this.company.canAddWorkspace(currCount, this.currentUser()?.companyId || undefined)) {
      return of({ id: '', name: 'Limit reached', companyId: 'acme' } as any);
    }
    const id = this.slug(name);
    const ws: Workspace = { id, name: name.trim() || id, companyId: 'acme' };
    const list = [...this._workspaces(), ws];
    this._workspaces.set(list);
    this.save(this.WORKSPACES_KEY, list);
    this.save(this.TPL_ALLOW_KEY + id, []);
    return of(ws);
  }

  removeWorkspace(id: string): Observable<boolean> {
    const list = this._workspaces().filter(w => w.id !== id);
    this._workspaces.set(list);
    this.save(this.WORKSPACES_KEY, list);
    // keep allow list key orphan-safe
    return of(true);
  }

  addUser(user: Omit<User, 'id'> & { id?: string }): Observable<User> {
    // License enforcement: respect maxUsers
    const currCount = this._users().length;
    if (!this.company.canAddUser(currCount, this.currentUser()?.companyId || undefined)) {
      return of({ id: '', name: 'Limit reached', role: 'member', workspaces: [], companyId: 'acme' } as any);
    }
    const id = user.id || this.slug(user.name || 'user');
    const u: User = { id, name: user.name, role: user.role, workspaces: user.role === 'admin' ? [] : Array.from(new Set(user.workspaces || [])), companyId: 'acme' };
    const list = [...this._users(), u];
    this._users.set(list);
    this.save(this.USERS_KEY, list);
    return of(u);
  }

  updateUser(user: User): Observable<User> {
    // Normalize: admin => all workspaces (empty list), member => unique array
    const normalized: User = {
      id: user.id,
      name: user.name,
      role: user.role,
      workspaces: user.role === 'admin' ? [] : Array.from(new Set(user.workspaces || [])),
    };
    const list = this._users().map(u => u.id === normalized.id ? normalized : u);
    this._users.set(list);
    this.save(this.USERS_KEY, list);
    // If current user updated, ensure current workspace remains valid
    if (this.currentUser()?.id === normalized.id && !this.canAccessWorkspace(this.currentWorkspaceId())) {
      this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
    }
    this._changes.next(Date.now());
    return of(normalized);
  }

  // Permissions helpers
  canAccessWorkspace(wsId: string, user?: User | null): boolean {
    if (environment.useBackend) return true;
    const u = user ?? this.currentUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    return (u.workspaces || []).includes(wsId);
  }

  // Resource mapping (attach flows/forms/websites to a workspace)
  getResourceWorkspace(kind: ResourceKind, id: string): string | null {
    return this.load<string | null>(this.MAP_KEY + kind + '.' + id, null);
  }
  setResourceWorkspace(kind: ResourceKind, id: string, workspaceId: string): void {
    this.save(this.MAP_KEY + kind + '.' + id, workspaceId);
  }

  // On first access, attach unknown resources to 'default' to simplify filtering
  ensureResourceWorkspace(kind: ResourceKind, id: string): string {
    const ws = this.getResourceWorkspace(kind, id);
    if (ws) return ws;
    const fallback = 'default';
    this.setResourceWorkspace(kind, id, fallback);
    return fallback;
  }

  // Node template allow-list per workspace
  listAllowedTemplates(workspaceId: string): Observable<string[]> {
    if (environment.useBackend) {
      const ws = this._workspaces().find(w => w.id === workspaceId);
      if (ws?.isDefault) {
        return this.catalog.listNodeTemplates().pipe(map(list => (list || []).map(t => (t as any).id)));
      }
      return of((ws?.templatesAllowed || []).slice());
    }
    const list = this.load<string[]>(this.TPL_ALLOW_KEY + workspaceId, []);
    return of(list);
  }
  setAllowedTemplates(workspaceId: string, ids: string[]): Observable<string[]> {
    const uniq = Array.from(new Set(ids));
    if (environment.useBackend) {
      const isOid = /^[a-fA-F0-9]{24}$/.test(String(workspaceId));
      if (!isOid) { return of(uniq); }
      return new Observable<string[]>((observer) => {
        this.wsBackend.update(workspaceId, { templatesAllowed: uniq, force: true }).subscribe({
          next: () => { this.refreshBackendWorkspaces(); observer.next(uniq); observer.complete(); },
          error: (e) => observer.error(e),
        });
      });
    }
    this.save(this.TPL_ALLOW_KEY + workspaceId, uniq);
    this._changes.next(Date.now());
    return of(uniq);
  }
  toggleTemplate(workspaceId: string, tplId: string, allowed: boolean): Observable<boolean> {
    if (environment.useBackend) {
      const ws = this._workspaces().find(w => w.id === workspaceId);
      const curr = new Set(ws?.templatesAllowed || []);
      if (allowed) curr.add(tplId); else curr.delete(tplId);
      const next = Array.from(curr);
      const isOid = /^[a-fA-F0-9]{24}$/.test(String(workspaceId));
      if (!isOid) { return of(true); }
      return new Observable<boolean>((observer) => {
        this.wsBackend.update(workspaceId, { templatesAllowed: next, force: true }).subscribe({
          next: () => { this.refreshBackendWorkspaces(); observer.next(true); observer.complete(); },
          error: (e) => observer.error(e),
        });
      });
    }
    const curr = this.load<string[]>(this.TPL_ALLOW_KEY + workspaceId, []);
    const next = allowed ? Array.from(new Set([...curr, tplId])) : curr.filter(id => id !== tplId);
    this.save(this.TPL_ALLOW_KEY + workspaceId, next);
    this._changes.next(Date.now());
    return of(true);
  }

  // Utility
  private slug(s: string): string {
    return (s || '').trim().toLowerCase().normalize('NFD')
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'id-' + Date.now().toString(36);
  }
  private save(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } }
  private load<T>(key: string, def: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : def; } catch { return def; } }
  private remove(key: string) { try { localStorage.removeItem(key); } catch {} }
  private keys(): string[] { try { return Object.keys(localStorage); } catch { return []; } }

  // Debug: log current workspace state to console
  debugLogWorkspaceState(): void {
    try {
      console.debug('[ACL] Debug workspace state', {
        useBackend: environment.useBackend,
        currentWorkspaceId: this._currentWorkspaceId(),
        currentWorkspace: this.currentWorkspace(),
        workspaces: this._workspaces(),
      });
    } catch {}
  }

  // Workspace selection
  setCurrentWorkspace(id: string) {
    if (!id) return;
    if (!this.canAccessWorkspace(id)) return; // ignore if not accessible
    this._currentWorkspaceId.set(id);
    try { console.debug('[ACL] Workspace changed', { id, workspaces: this._workspaces() }); } catch {}
    this._changes.next(Date.now());
  }
  currentWorkspaceId(): string {
    if (environment.useBackend) {
      // Avoid returning 'default' before sync; return first real id if ready, else empty string
      return this._currentWorkspaceId() || (this._workspaces().length ? this._workspaces()[0].id : '');
    }
    return this._currentWorkspaceId() || this.pickDefaultWorkspaceId();
  }
  private pickDefaultWorkspaceId(): string {
    // Backend mode: prefer the first synced workspace id
    if (environment.useBackend) {
      const list = this._workspaces();
      if (list && list.length) {
        const def = list.find(w => (w as any).isDefault);
        return (def?.id || list[0].id);
      }
    }
    const u = this.currentUser();
    if (!u) return 'default';
    const companyWs = this._workspaces().filter(w => !u.companyId || w.companyId === u.companyId);
    if (u.role === 'admin') return companyWs[0]?.id || this._workspaces()[0]?.id || 'default';
    const allowed = (u.workspaces || []).filter(id => companyWs.some(w => w.id === id));
    return allowed[0] || companyWs[0]?.id || 'default';
  }

  // Backend: refresh workspaces after login/token change and pick default
  refreshBackendWorkspaces(): void {
    if (!environment.useBackend) return;
    try {
      this.wsBackend.list({ page: 1, limit: 100 }).subscribe(list => {
        const mapped: Workspace[] = (list || []).map(w => ({ id: String((w as any).id || (w as any)._id || ''), name: (w as any).name, companyId: undefined, isDefault: (w as any).isDefault }));
        this._workspaces.set(mapped);
        this.save(this.WORKSPACES_KEY, mapped);
        const wsId = this.pickDefaultWorkspaceId();
        this._currentWorkspaceId.set(wsId);
        try { console.debug('[ACL] Refreshed workspaces (backend)', { count: mapped.length, currentWorkspaceId: wsId, workspaces: mapped }); } catch {}
        this._changes.next(Date.now());
      });
    } catch {}
  }

  // Seed mapping of existing resources if none assigned yet: distribute by hash across workspaces
  private seedResourceMappings() {
    const ws = this._workspaces();
    if (!ws.length) return;
    const allWsIds = ws.map(w => w.id);
    const dist = (id: string) => allWsIds[this.hash(id) % allWsIds.length] || 'default';
    // Flows
    this.catalog.listFlows().subscribe(list => {
      (list || []).forEach(f => {
        const k = this.MAP_KEY + 'flow.' + f.id;
        if (localStorage.getItem(k) == null) {
          const ws = String(f.id || '').startsWith('demo-') ? 'default' : dist(f.id);
          this.setResourceWorkspace('flow', f.id, ws);
        }
      });
    });
    // Forms
    this.catalog.listForms().subscribe(list => {
      (list || []).forEach(f => {
        const k = this.MAP_KEY + 'form.' + f.id;
        if (localStorage.getItem(k) == null) this.setResourceWorkspace('form', f.id, dist(f.id));
      });
    });
    // Websites: default to 'default' unless set during interactions
    // No async source here; ensure on demand via ensureResourceWorkspace('website', id)
  }
  private hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }

  // ===== Export / Import / Reset (ACL)
  resetAll(): Observable<boolean> {
    try {
      // Remove base keys
      this.remove(this.USERS_KEY);
      this.remove(this.WORKSPACES_KEY);
      this.remove(this.CURRENT_USER_KEY);
      // Remove allow lists and resource mappings
      this.keys().forEach(k => {
        if (k.startsWith(this.TPL_ALLOW_KEY) || k.startsWith(this.MAP_KEY)) this.remove(k);
      });
      // Reseed
      this.ensureSeed();
      this._changes.next(Date.now());
      return of(true);
    } catch {
      return of(false);
    }
  }

  exportData(): Observable<any> {
    try {
      const users = this._users();
      const workspaces = this._workspaces();
      const currentUserId = this._currentUserId();
      // allowed templates per workspace (only persisted keys)
      const allowed: Record<string, string[]> = {};
      workspaces.forEach(w => {
        const v = this.load<string[]>(this.TPL_ALLOW_KEY + w.id, []);
        allowed[w.id] = v;
      });
      // resource mapping per kind
      const resource: Record<string, Record<string, string>> = { flow: {}, form: {}, website: {} };
      this.keys().forEach(k => {
        if (k.startsWith(this.MAP_KEY)) {
          const rest = k.slice(this.MAP_KEY.length); // kind.id
          const dot = rest.indexOf('.');
          if (dot > 0) {
            const kind = rest.slice(0, dot);
            const id = rest.slice(dot + 1);
            try { const ws = this.load<string | null>(k, null); if (ws) (resource as any)[kind][id] = ws; } catch {}
          }
        }
      });
      const payload = {
        kind: 'homeport-acl',
        version: 1,
        exportedAt: new Date().toISOString(),
        users,
        workspaces,
        currentUserId,
        allowedTemplatesByWorkspace: allowed,
        resourceWorkspace: resource,
      };
      return of(payload);
    } catch {
      return of({ kind: 'homeport-acl', version: 1, users: [], workspaces: [], allowedTemplatesByWorkspace: {}, resourceWorkspace: {} });
    }
  }

  importData(data: any, mode: 'replace' | 'merge' = 'replace'): Observable<boolean> {
    try {
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      if (!payload || typeof payload !== 'object') return of(false);
      const users: User[] = Array.isArray(payload.users) ? payload.users : [];
      const workspaces: Workspace[] = Array.isArray(payload.workspaces) ? payload.workspaces : [];
      const currentUserId: string | null = payload.currentUserId ?? null;
      const allowed: Record<string, string[]> = (payload.allowedTemplatesByWorkspace && typeof payload.allowedTemplatesByWorkspace === 'object') ? payload.allowedTemplatesByWorkspace : {};
      const resource: Record<string, Record<string, string>> = (payload.resourceWorkspace && typeof payload.resourceWorkspace === 'object') ? payload.resourceWorkspace : {} as any;

      if (mode === 'replace') {
        // Clear existing
        this.resetAll();
      }
      // Save users/workspaces
      if (users.length) { this._users.set(users); this.save(this.USERS_KEY, users); }
      if (workspaces.length) { this._workspaces.set(workspaces); this.save(this.WORKSPACES_KEY, workspaces); }
      // Save current user
      if (currentUserId) { this._currentUserId.set(currentUserId); this.save(this.CURRENT_USER_KEY, currentUserId); }
      // Save allow-lists
      Object.keys(allowed || {}).forEach(wsId => this.save(this.TPL_ALLOW_KEY + wsId, Array.from(new Set(allowed[wsId] || []))));
      // Save resource mapping
      const kinds: ResourceKind[] = ['flow','form','website'];
      kinds.forEach(k => {
        const map = (resource as any)[k] || {};
        Object.keys(map).forEach(id => this.setResourceWorkspace(k, id, map[id]));
      });
      // Adjust current workspace if necessary
      this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
      this._changes.next(Date.now());
      return of(true);
    } catch {
      return of(false);
    }
  }
}
