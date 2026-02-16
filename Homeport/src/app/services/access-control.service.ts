import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CatalogService, NodeTemplate } from './catalog.service';
import { CompanyService } from './company.service';
import { WorkspaceBackendService, BackendWorkspace } from './workspace-backend.service';
import { environment } from '../../environments/environment';

export type Role = 'admin' | 'member';

export interface Workspace {
  id: string;      // Mongo _id in backend mode, slug in local mode
  name: string;
  companyId?: string;
  isDefault?: boolean;
  templatesAllowed?: string[];
  backendId?: string; // alias for id in backend mode
}

export interface User {
  id: string;
  name: string;
  role: Role;
  workspaces: string[];
  companyId?: string;
}

type ResourceKind = 'flow' | 'form' | 'website';

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  // localStorage keys
  private USERS_KEY = 'acl.users';           // local mode only
  private WORKSPACES_KEY = 'acl.workspaces'; // local mode only
  private CURRENT_USER_KEY = 'acl.currentUserId'; // local mode only
  private TPL_ALLOW_KEY = 'acl.allowedTemplates.'; // local mode only
  private MAP_KEY = 'acl.resource.';               // local mode only
  private LAST_WS_KEY = 'acl.lastWorkspaceId';     // both modes — cache for instant load

  private _users = signal<User[]>([]);
  private _workspaces = signal<Workspace[]>([]);
  private _currentUserId = signal<string | null>(null);
  private _currentWorkspaceId = signal<string | null>(null);
  private _ready = signal(false);

  users = computed(() => this._users());
  workspaces = computed(() => this._workspaces());
  ready = computed(() => this._ready());

  currentUser = computed<User | null>(() => {
    if (environment.useBackend) {
      // In backend mode, expose user from auth token
      const id = this._currentUserId();
      return { id: id || 'backend', name: id || 'Backend', role: 'admin', workspaces: [] } as User;
    }
    const id = this._currentUserId();
    return (this._users().find(u => u.id === id) || null);
  });

  currentWorkspace = computed<Workspace | null>(() => {
    const id = this._currentWorkspaceId();
    return (this._workspaces().find(w => w.id === id) || null);
  });

  private _changes = new BehaviorSubject<number>(0);
  readonly changes$ = this._changes.asObservable();

  constructor(private catalog: CatalogService, private company: CompanyService, private wsBackend: WorkspaceBackendService) {
    this.ensureSeed();
  }

  // ===== Init =====
  private ensureSeed() {
    if (environment.useBackend) {
      // Backend mode: fetch workspaces from API, no localStorage
      this._users.set([]);
      this._workspaces.set([]);
      this.syncFromBackend();
      return;
    }
    // Local mode: seed from localStorage
    const storedUsers = this.load<User[]>(this.USERS_KEY, []);
    const storedWs = this.load<Workspace[]>(this.WORKSPACES_KEY, []);
    let curr = this.load<string | null>(this.CURRENT_USER_KEY, null);
    if (!storedWs.length) {
      const ws: Workspace[] = [
        { id: 'default', name: 'Default', companyId: 'acme' },
        { id: 'marketing', name: 'Marketing', companyId: 'acme' },
        { id: 'beta-default', name: 'Beta — Default', companyId: 'beta' },
        { id: 'beta-ops', name: 'Beta — Ops', companyId: 'beta' },
      ];
      this.save(this.WORKSPACES_KEY, ws);
      this._workspaces.set(ws);
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
    const wsId = this.pickDefaultWorkspaceId();
    this._currentWorkspaceId.set(wsId);
    this._ready.set(true);
    this.seedResourceMappings();
  }

  // Backend sync: fetch workspace list + user preference
  private syncFromBackend() {
    // Use cached last workspace for instant load (before API responds)
    const cachedWsId = this.load<string | null>(this.LAST_WS_KEY, null);
    if (cachedWsId) this._currentWorkspaceId.set(cachedWsId);

    this.wsBackend.list({ page: 1, limit: 100 }).subscribe({
      next: (list) => {
        const mapped = this.mapBackendWorkspaces(list);
        this._workspaces.set(mapped);

        // Validate cached workspace still exists
        const validCached = cachedWsId && mapped.some(w => w.id === cachedWsId);
        if (validCached) {
          this._currentWorkspaceId.set(cachedWsId!);
          this._ready.set(true);
          this._changes.next(Date.now());
        } else {
          // Fetch user preference from backend
          this.wsBackend.getPreference().subscribe({
            next: (pref) => {
              const prefId = pref?.defaultWorkspaceId;
              const wsId = (prefId && mapped.some(w => w.id === prefId)) ? prefId : this.pickDefaultWorkspaceId();
              this._currentWorkspaceId.set(wsId);
              this.save(this.LAST_WS_KEY, wsId);
              this._ready.set(true);
              this._changes.next(Date.now());
            },
            error: () => {
              this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
              this._ready.set(true);
              this._changes.next(Date.now());
            },
          });
        }
      },
      error: () => {
        this._ready.set(true);
        this._changes.next(Date.now());
      },
    });
  }

  private mapBackendWorkspaces(list: BackendWorkspace[]): Workspace[] {
    return (list || []).map(w => ({
      id: String((w as any).id || (w as any)._id || ''),
      name: (w as any).name,
      companyId: undefined,
      isDefault: !!(w as any).isDefault,
      templatesAllowed: (w as any).templatesAllowed || [],
      backendId: String((w as any)._id || (w as any).id || ''),
    }));
  }

  // Called after login with the data from the login response
  initFromLogin(data: { workspaces?: any[]; defaultWorkspaceId?: string; user?: any }) {
    if (!environment.useBackend) return;
    const userId = data?.user?.id || data?.user?._id;
    if (userId) this._currentUserId.set(String(userId));
    if (Array.isArray(data.workspaces) && data.workspaces.length) {
      const mapped = this.mapBackendWorkspaces(data.workspaces as any);
      this._workspaces.set(mapped);
    }
    if (data.defaultWorkspaceId) {
      this._currentWorkspaceId.set(data.defaultWorkspaceId);
    } else {
      this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
    }
    this._ready.set(true);
    this._changes.next(Date.now());
  }

  // ===== Public API =====
  setCurrentUser(userId: string) {
    if (environment.useBackend) {
      this._currentUserId.set(userId);
      this._changes.next(Date.now());
      return;
    }
    const exists = this._users().some(u => u.id === userId);
    if (!exists) return;
    this._currentUserId.set(userId);
    this.save(this.CURRENT_USER_KEY, userId);
    this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
    this._changes.next(Date.now());
  }

  listUsers(): Observable<User[]> { return of(this._users()); }
  listWorkspaces(): Observable<Workspace[]> { return of(this._workspaces()); }
  listCompanyWorkspaces(): Observable<Workspace[]> {
    if (environment.useBackend) return of(this._workspaces());
    const cid = this.currentUser()?.companyId || null;
    const all = this._workspaces();
    const filtered = cid ? all.filter(w => (w.companyId || null) === cid) : all;
    return of(filtered);
  }

  addWorkspace(name: string): Observable<Workspace> {
    if (environment.useBackend) {
      return new Observable<Workspace>((observer) => {
        this.wsBackend.create({ name }).subscribe({
          next: (resp: any) => {
            const ws: Workspace = {
              id: String(resp?.id || resp?._id || ''),
              name: resp?.name || name,
              isDefault: false,
              templatesAllowed: resp?.templatesAllowed || [],
              backendId: String(resp?._id || resp?.id || ''),
            };
            this._workspaces.set([...this._workspaces(), ws]);
            this._changes.next(Date.now());
            observer.next(ws);
            observer.complete();
          },
          error: (e) => observer.error(e),
        });
      });
    }
    // Local mode
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
    if (environment.useBackend) {
      return new Observable<boolean>((observer) => {
        const ws = this._workspaces().find(w => w.id === id);
        const targetId = ws?.backendId || id;
        this.wsBackend.delete(targetId, true).subscribe({
          next: () => {
            this._workspaces.set(this._workspaces().filter(w => w.id !== id));
            this._changes.next(Date.now());
            observer.next(true);
            observer.complete();
          },
          error: (e) => observer.error(e),
        });
      });
    }
    const list = this._workspaces().filter(w => w.id !== id);
    this._workspaces.set(list);
    this.save(this.WORKSPACES_KEY, list);
    return of(true);
  }

  addUser(user: Omit<User, 'id'> & { id?: string }): Observable<User> {
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
    const normalized: User = {
      id: user.id,
      name: user.name,
      role: user.role,
      workspaces: user.role === 'admin' ? [] : Array.from(new Set(user.workspaces || [])),
    };
    const list = this._users().map(u => u.id === normalized.id ? normalized : u);
    this._users.set(list);
    this.save(this.USERS_KEY, list);
    if (this.currentUser()?.id === normalized.id && !this.canAccessWorkspace(this.currentWorkspaceId())) {
      this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
    }
    this._changes.next(Date.now());
    return of(normalized);
  }

  // Permissions
  canAccessWorkspace(wsId: string, user?: User | null): boolean {
    if (environment.useBackend) return true; // Backend enforces membership via API
    const u = user ?? this.currentUser();
    if (!u) return false;
    if (u.role === 'admin') return true;
    return (u.workspaces || []).includes(wsId);
  }

  // Resource mapping (local mode only — backend uses workspaceId on model)
  getResourceWorkspace(kind: ResourceKind, id: string): string | null {
    if (environment.useBackend) return null;
    return this.load<string | null>(this.MAP_KEY + kind + '.' + id, null);
  }
  setResourceWorkspace(kind: ResourceKind, id: string, workspaceId: string): void {
    if (environment.useBackend) return;
    this.save(this.MAP_KEY + kind + '.' + id, workspaceId);
  }
  ensureResourceWorkspace(kind: ResourceKind, id: string): string {
    if (environment.useBackend) return this.currentWorkspaceId();
    const ws = this.getResourceWorkspace(kind, id);
    if (ws) return ws;
    this.setResourceWorkspace(kind, id, 'default');
    return 'default';
  }

  // Template allow-list per workspace
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
      const ws = this._workspaces().find(w => w.id === workspaceId);
      const targetId = ws?.backendId || workspaceId;
      return new Observable<string[]>((observer) => {
        this.wsBackend.update(targetId, { templatesAllowed: uniq, force: true }).subscribe({
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
      const targetId = ws?.backendId || workspaceId;
      return new Observable<boolean>((observer) => {
        this.wsBackend.update(targetId, { templatesAllowed: next, force: true }).subscribe({
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

  // Workspace selection
  setCurrentWorkspace(id: string) {
    if (!id) return;
    if (!environment.useBackend && !this.canAccessWorkspace(id)) return;
    this._currentWorkspaceId.set(id);
    // Cache in localStorage for instant load on next visit
    this.save(this.LAST_WS_KEY, id);
    // In backend mode, also persist preference server-side
    if (environment.useBackend) {
      this.wsBackend.setPreference(id).subscribe({ error: () => {} });
    }
    this._changes.next(Date.now());
  }

  currentWorkspaceId(): string {
    if (environment.useBackend) {
      return this._currentWorkspaceId() || (this._workspaces().length ? this._workspaces()[0].id : '');
    }
    return this._currentWorkspaceId() || this.pickDefaultWorkspaceId();
  }

  private pickDefaultWorkspaceId(): string {
    if (environment.useBackend) {
      const list = this._workspaces();
      if (list && list.length) {
        const def = list.find(w => (w as any).isDefault);
        return (def?.id || list[0].id);
      }
      return '';
    }
    const u = this.currentUser();
    if (!u) return 'default';
    const companyWs = this._workspaces().filter(w => !u.companyId || w.companyId === u.companyId);
    if (u.role === 'admin') return companyWs[0]?.id || this._workspaces()[0]?.id || 'default';
    const allowed = (u.workspaces || []).filter(id => companyWs.some(w => w.id === id));
    return allowed[0] || companyWs[0]?.id || 'default';
  }

  // Refresh workspaces from backend
  refreshBackendWorkspaces(): void {
    if (!environment.useBackend) return;
    this.wsBackend.list({ page: 1, limit: 100 }).subscribe({
      next: (list) => {
        const mapped = this.mapBackendWorkspaces(list);
        this._workspaces.set(mapped);
        // Keep current workspace if it still exists, otherwise pick default
        const curr = this._currentWorkspaceId();
        if (!curr || !mapped.some(w => w.id === curr)) {
          this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
        }
        this._changes.next(Date.now());
      },
      error: () => {},
    });
  }

  debugLogWorkspaceState(): void {
    try {
      console.debug('[ACL] Debug workspace state', {
        useBackend: environment.useBackend,
        currentWorkspaceId: this._currentWorkspaceId(),
        currentWorkspace: this.currentWorkspace(),
        workspaces: this._workspaces(),
        ready: this._ready(),
      });
    } catch {}
  }

  // ===== Utilities =====
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

  // Local mode: seed resource mappings
  private seedResourceMappings() {
    if (environment.useBackend) return;
    const ws = this._workspaces();
    if (!ws.length) return;
    const allWsIds = ws.map(w => w.id);
    const dist = (id: string) => allWsIds[this.hash(id) % allWsIds.length] || 'default';
    this.catalog.listFlows().subscribe(list => {
      (list || []).forEach(f => {
        const k = this.MAP_KEY + 'flow.' + f.id;
        if (localStorage.getItem(k) == null) {
          const ws = String(f.id || '').startsWith('demo-') ? 'default' : dist(f.id);
          this.setResourceWorkspace('flow', f.id, ws);
        }
      });
    });
    this.catalog.listForms().subscribe(list => {
      (list || []).forEach(f => {
        const k = this.MAP_KEY + 'form.' + f.id;
        if (localStorage.getItem(k) == null) this.setResourceWorkspace('form', f.id, dist(f.id));
      });
    });
  }
  private hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }

  // ===== Export / Import / Reset (local mode only) =====
  resetAll(): Observable<boolean> {
    try {
      this.remove(this.USERS_KEY);
      this.remove(this.WORKSPACES_KEY);
      this.remove(this.CURRENT_USER_KEY);
      this.keys().forEach(k => {
        if (k.startsWith(this.TPL_ALLOW_KEY) || k.startsWith(this.MAP_KEY)) this.remove(k);
      });
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
      const allowed: Record<string, string[]> = {};
      workspaces.forEach(w => {
        const v = this.load<string[]>(this.TPL_ALLOW_KEY + w.id, []);
        allowed[w.id] = v;
      });
      const resource: Record<string, Record<string, string>> = { flow: {}, form: {}, website: {} };
      this.keys().forEach(k => {
        if (k.startsWith(this.MAP_KEY)) {
          const rest = k.slice(this.MAP_KEY.length);
          const dot = rest.indexOf('.');
          if (dot > 0) {
            const kind = rest.slice(0, dot);
            const id = rest.slice(dot + 1);
            try { const ws = this.load<string | null>(k, null); if (ws) (resource as any)[kind][id] = ws; } catch {}
          }
        }
      });
      return of({
        kind: 'homeport-acl',
        version: 1,
        exportedAt: new Date().toISOString(),
        users, workspaces, currentUserId,
        allowedTemplatesByWorkspace: allowed,
        resourceWorkspace: resource,
      });
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
      if (mode === 'replace') this.resetAll();
      if (users.length) { this._users.set(users); this.save(this.USERS_KEY, users); }
      if (workspaces.length) { this._workspaces.set(workspaces); this.save(this.WORKSPACES_KEY, workspaces); }
      if (currentUserId) { this._currentUserId.set(currentUserId); this.save(this.CURRENT_USER_KEY, currentUserId); }
      Object.keys(allowed || {}).forEach(wsId => this.save(this.TPL_ALLOW_KEY + wsId, Array.from(new Set(allowed[wsId] || []))));
      const kinds: ResourceKind[] = ['flow','form','website'];
      kinds.forEach(k => {
        const map = (resource as any)[k] || {};
        Object.keys(map).forEach(id => this.setResourceWorkspace(k, id, map[id]));
      });
      this._currentWorkspaceId.set(this.pickDefaultWorkspaceId());
      this._changes.next(Date.now());
      return of(true);
    } catch {
      return of(false);
    }
  }
}
