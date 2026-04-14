import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, HostListener, AfterViewInit, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService, NodeTemplate, AppProvider } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, Subscription, fromEvent, of } from 'rxjs';
import { auditTime, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'node-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzToolTipModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Templates de nœuds</h1>
          <p>Gestion des templates (start, function, condition, loop…). À connecter à la base de données.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" (ngModelChange)="onQueryInput($event)" placeholder="Rechercher (nom, catégorie, app, tags)" class="search"/>
          <button nz-button nzType="primary" class="primary with-text" (click)="createNew()" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i> Nouveau template
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="createNew()" aria-label="Nouveau template" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    <div class="loading" *ngIf="loading && templates.length===0" role="status" aria-live="polite">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span class="loading-text">Chargement des templates…</span>
    </div>
    <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="empty" *ngIf="!loading && !error && templates.length===0">Aucun élément trouvé.</div>
      <div class="grid" *ngIf="!loading && !error && templates.length>0">
        <div class="card" *ngFor="let it of templates" (click)="view(it)">
          <div class="leading">
            <div class="avatar" *ngIf="!appFor(it); else appIcon">{{ (it.name || it.id || '').charAt(0) | uppercase }}</div>
            <ng-template #appIcon>
              <div class="app-icon" [style.background]="appFor(it)?.color || '#f3f4f6'">
                <img *ngIf="appFor(it)?.iconUrl" [src]="appFor(it)?.iconUrl" alt="icon"/>
                <i *ngIf="!appFor(it)?.iconUrl && appFor(it)?.iconClass" [class]="appFor(it)?.iconClass" [style.color]="fgColor(appFor(it)?.color)"></i>
                <img *ngIf="!appFor(it)?.iconUrl && !appFor(it)?.iconClass" [src]="simpleIconUrlWithColor(appFor(it)?.id || '', fgColor(appFor(it)?.color))" alt="icon"/>
              </div>
            </ng-template>
          </div>
          <div class="content">
            <div class="title-row"><div class="name">{{ titleOf(it) }}</div>
              <span class="chip" *ngIf="primaryChip(it)">{{ primaryChip(it) }}</span>
              <span class="chip more" *ngIf="chipsFor(it).length > 1" nz-tooltip [nzTooltipTitle]="restChips(it).join(', ')">+{{ chipsFor(it).length - 1 }}</span>
            </div>
            <div class="desc" *ngIf="it.description">{{ it.description }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="edit(it); $event.stopPropagation()" title="Éditer" [disabled]="!isAdmin">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="palette-loading more-loading" *ngIf="!loading && !error && loadingMore" role="status" aria-live="polite">
        <span class="palette-loading-spinner" aria-hidden="true"></span>
        <span class="palette-loading-text">Chargement des nœuds suivants…</span>
      </div>
      <div class="list-bottom-space" *ngIf="!loading && !error && templates.length>0" aria-hidden="true"></div>
    </div>
    
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; max-width: 100%; overflow-x: hidden; }
    /* iPhone/iOS: ensure bottom content is reachable despite dynamic browser UI */
    @media (max-width: 768px) {
      .list-page { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
    }
    .container { max-width: 1080px; width: 100%; min-width: 0; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; min-width: 0; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#8b8b8b; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; min-width: 0; }
    .actions .search { width: 220px; max-width: 100%; min-width: 0; border:1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; outline: none; }
    .actions .search:focus { box-shadow: 0 0 0 2px rgba(230,25,130,0.12), 0 2px 8px rgba(0,0,0,0.04); }
    .actions .primary { background:#e61982; border-color:#e61982; border-radius: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(230,25,130,0.2); }
    .actions .primary[disabled] { background:#f3f4f6; border-color:#e5e7eb; color:#9ca3af; }
    /* Icon-only buttons: hidden by default (except explicit mobile primary) */
    .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .actions .icon-only i { font-size: 14px; line-height: 1; }
    .actions .with-text i { margin-right: 6px; }
    @media (max-width: 640px) {
      .page-header { flex-direction: column; align-items: stretch; }
      .actions { width:100%; flex-wrap: nowrap; min-width: 0; }
      .actions .search { flex:1 1 auto; width:auto; }
      .actions .with-text { display:none; }
      .actions .primary.icon-only { display:inline-flex; }
    }
    .loading { min-height: 200px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#64748b; }
    .loading-spinner { width:24px; height:24px; border-radius:50%; border:3px solid #dbe4ef; border-top-color:#e61982; animation: list-spin .75s linear infinite; }
    .loading-text { font-size: 12px; font-weight: 500; color:#475569; }
    @keyframes list-spin { to { transform: rotate(360deg); } }
    .palette-loading { min-height: 200px; height: 100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#64748b; }
    .palette-loading.more-loading { min-height: 0; height: auto; padding: 14px 12px; }
    .palette-loading-spinner { width: 24px; height: 24px; border-radius: 50%; border: 3px solid #dbe4ef; border-top-color: #e61982; animation: palette-spin .75s linear infinite; }
    .palette-loading-text { font-size: 12px; font-weight: 500; color:#475569; }
    @keyframes palette-spin { to { transform: rotate(360deg); } }
    .list-bottom-space { height: 96px; }
    @media (max-width: 768px) {
      .list-bottom-space { height: calc(120px + env(safe-area-inset-bottom)); }
    }
    .error { color:#b42318; background:#fef2f2; padding:10px 14px; border-radius:14px; font-size: 13px; }
    .grid { display:grid; gap:16px; grid-template-columns: 1fr; min-width: 0; }
    @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .card { display:flex; align-items:center; gap:14px; width:100%; min-width:0; padding:14px 14px; border-radius:16px; cursor:pointer; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(230,25,130,0.08); }
    .leading .avatar { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center; font-weight:600; color: #e61982; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); }
    .leading .app-icon { width:40px; height:40px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .leading .app-icon img { width:24px; height:24px; object-fit:contain; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; min-width:0; }
    .name { flex:1 1 auto; min-width:0; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { display:inline-block; min-width:0; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .chip.more { background:#eef2ff; border-color:#e0e7ff; color:#3730a3; }
    .desc { color:#8b8b8b; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background: transparent; color:#b0b0b0; border: none; border-radius:10px; cursor:pointer; transition: background-color .15s ease, color .15s ease, box-shadow .15s ease, border-color .15s ease, transform .02s ease; }
    .icon-btn i { font-size:16px; }
    .icon-btn:hover:not([disabled]) { background: #fdf2f8; color:#e61982; box-shadow: 0 4px 12px rgba(230,25,130,0.18); transform: translateY(-1px); }
    .icon-btn:active { transform: translateY(0.5px); }
    .icon-btn[disabled] { opacity: .55; cursor: not-allowed; filter: grayscale(1); background:#f5f5f5; color:#9ca3af; border-color:#e5e7eb; }
    nz-modal .form { display:flex; flex-direction:column; gap:10px; }
    nz-modal .form label { font-size:12px; color:#8b8b8b; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `]
})
export class NodeTemplateListComponent implements OnInit, OnDestroy, AfterViewInit {
  templates: NodeTemplate[] = [];
  loading = true;
  loadingMore = false;
  hasMore = false;
  error: string | null = null;
  appsMap = new Map<string, AppProvider>();
  q = '';
  private readonly pageSize = 50;
  private readonly queryDebounceMs = 400;
  private currentQuery = '';
  private currentPage = 0;
  private queryInput$ = new Subject<string>();
  private loadSub?: Subscription;
  private loadTicket = 0;
  private querySub?: Subscription;
  private scrollSub?: Subscription;
  private scrollContainer?: HTMLElement | null;
  private loadingMoreStartedAt = 0;

  constructor(
    private router: Router,
    private catalog: CatalogService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private acl: AccessControlService,
    private elRef: ElementRef<HTMLElement>,
  ) {}
  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  titleOf(it: any): string { try { return (it && (it.title || it.name)) || ''; } catch { return ''; } }
  primaryChip(it: any): string { const c = this.chipsFor(it); return c.length ? c[0] : ''; }
  chipsFor(it: any): string[] {
    try {
      const chips: string[] = [];
      // Order: category, app, then type last if present
      if (it?.category) chips.push(String(it.category));
      const app = this.appFor(it);
      if (app && (app.title || app.name)) chips.push(String(app.title || app.name));
      if (it?.type) chips.push(String(it.type));
      return chips.filter(Boolean);
    } catch { return []; }
  }
  restChips(it: any): string[] { const c = this.chipsFor(it); return c.slice(1); }

  private changesSub?: Subscription;
  private appsSub?: Subscription;
  ngOnInit() {
    this.querySub = this.queryInput$
      .pipe(debounceTime(this.queryDebounceMs), distinctUntilChanged())
      .subscribe((value) => {
        this.currentQuery = String(value || '').trim();
        this.load(false);
      });
    this.load(false);
    this.appsSub = this.catalog.listApps().subscribe(list => { (list||[]).forEach(a => this.appsMap.set(a.id, a)); });
    try { this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load(false)); } catch {}
  }
  ngAfterViewInit(): void {
    setTimeout(() => this.attachScrollContainer(), 0);
  }
  ngOnDestroy(): void {
    try { this.changesSub?.unsubscribe(); } catch {}
    try { this.appsSub?.unsubscribe(); } catch {}
    try { this.querySub?.unsubscribe(); } catch {}
    try { this.scrollSub?.unsubscribe(); } catch {}
    try { this.loadSub?.unsubscribe(); } catch {}
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.checkLoadMore();
  }

  onQueryInput(value: string) {
    this.q = value || '';
    this.queryInput$.next(this.q);
  }

  load(append = false) {
    const ticket = ++this.loadTicket;
    const ws = this.acl.currentWorkspaceId();
    try { this.loadSub?.unsubscribe(); } catch {}

    // ACL can be empty during app bootstrap; keep loading until context is ready.
    if (!ws) return;

    const page = append ? (this.currentPage + 1) : 1;
    if (append) {
      this.loadingMore = true;
      this.loadingMoreStartedAt = Date.now();
      this.error = null;
      try { this.cdr.detectChanges(); } catch {}
    } else {
      this.loading = true;
      this.loadingMore = false;
      this.error = null;
      this.templates = [];
      this.currentPage = 0;
      this.hasMore = false;
    }

    this.loadSub = this.resolveTemplatePage(ws, page, this.currentQuery).pipe(
      finalize(() => {
        if (ticket !== this.loadTicket) return;
        const completeLoading = () => {
          this.zone.run(() => {
            this.loading = false;
            this.loadingMore = false;
            setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
          });
        };
        if (append) {
          const elapsed = Date.now() - this.loadingMoreStartedAt;
          const remaining = Math.max(0, 250 - elapsed);
          if (remaining > 0) {
            setTimeout(completeLoading, remaining);
            return;
          }
        }
        completeLoading();
      })
    ).subscribe({
      next: (pageItems) => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          const items = pageItems || [];
          this.templates = append ? [...this.templates, ...items] : items;
          this.currentPage = page;
          this.hasMore = items.length === this.pageSize;
          try { this.cdr.detectChanges(); } catch {}
          setTimeout(() => this.checkLoadMore(), 0);
        });
      },
      error: () => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          if (!append) this.templates = [];
          this.hasMore = false;
          this.error = 'Impossible de charger les templates.';
        });
      }
    });
  }

  private resolveTemplatePage(wsId: string, page: number, query: string) {
    const workspaces = this.acl.workspaces?.() || [];
    const currentWorkspace = workspaces.find(w => w.id === wsId) || this.acl.currentWorkspace?.() || null;
    const params = {
      page,
      limit: this.pageSize,
      q: query || undefined,
    } as { page: number; limit: number; q?: string; keys?: string[] };
    if (environment.useBackend && currentWorkspace?.isDefault) {
      return this.catalog.listNodeTemplatesPage(params);
    }
    return this.acl.listAllowedTemplates(wsId).pipe(
      switchMap((ids) => {
        const keys = Array.from(new Set((ids || []).map(id => String(id || '').trim()).filter(Boolean)));
        if (!keys.length) return of([] as NodeTemplate[]);
        return this.catalog.listNodeTemplatesPage({ ...params, keys });
      })
    );
  }

  private attachScrollContainer(): void {
    const host = this.elRef?.nativeElement || null;
    this.scrollContainer = this.resolveScrollContainer(host);
    try { this.scrollSub?.unsubscribe(); } catch {}
    if (!this.scrollContainer) return;
    this.scrollSub = fromEvent(this.scrollContainer, 'scroll')
      .pipe(auditTime(50))
      .subscribe(() => this.checkLoadMore(this.scrollContainer));
    this.checkLoadMore(this.scrollContainer);
  }

  private resolveScrollContainer(host: HTMLElement | null): HTMLElement | null {
    if (!host) return null;
    const byClass = (host.closest('.content') as HTMLElement | null) || (host.closest('.inner-content') as HTMLElement | null);
    if (byClass) return byClass;
    let cur: HTMLElement | null = host.parentElement;
    while (cur) {
      try {
        const st = getComputedStyle(cur);
        const oy = String(st?.overflowY || '').toLowerCase();
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return cur;
      } catch {}
      cur = cur.parentElement;
    }
    return null;
  }

  private checkLoadMore(container?: HTMLElement | null): void {
    if (this.loading || this.loadingMore || !this.hasMore || !!this.error) return;
    const target = container || this.scrollContainer;
    if (target) {
      const remaining = target.scrollHeight - (target.scrollTop + target.clientHeight);
      if (remaining <= 220) {
        this.load(true);
      }
      return;
    }
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const documentHeight = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0
    );
    if ((documentHeight - (scrollTop + viewportHeight)) <= 220) {
      this.load(true);
    }
  }

  fgColor(bg?: string|null): string {
    const b = String(bg || '#e61982');
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  simpleIconUrlWithColor(id: string, color?: string) { const hex = (color || '#111').replace('#',''); return `https://cdn.simpleicons.org/${encodeURIComponent(id)}/${hex}`; }
  private hexToRgb(hex: string): { r: number; g: number; b: number } { let s = hex.trim(); if (s.startsWith('#')) s = s.slice(1); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const num = parseInt(s, 16); return { r: (num>>16)&255, g: (num>>8)&255, b: num&255 }; }

  edit(it: NodeTemplate) { this.router.navigate(['/node-templates/editor'], { queryParams: { id: it.id } }); }
  view(it: NodeTemplate) { this.router.navigate(['/node-templates/viewer'], { queryParams: { id: it.id } }); }
  createNew() { this.router.navigate(['/node-templates/editor']); }
  appFor(t: NodeTemplate): AppProvider | undefined {
    const id = ((t as any).app && (t as any).app._id) ? (t as any).app._id : ((t as any).appId || '');
    return id ? this.appsMap.get(id) : undefined;
  }
  simpleIconUrl(id: string) { return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}` : ''; }
  viewApp(a: AppProvider) { this.router.navigate(['/apps/viewer'], { queryParams: { id: a.id } }); }
}
