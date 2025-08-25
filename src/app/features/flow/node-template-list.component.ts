import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService, NodeTemplate, AppProvider } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';

@Component({
  selector: 'node-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Templates de nœuds</h1>
          <p>Gestion des templates (start, function, condition, loop…). À connecter à la base de données.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" placeholder="Rechercher (nom, catégorie, app, tags)" class="search"/>
          <button nz-button class="icon-only search-action" (click)="doSearch()" aria-label="Rechercher">
            <i class="fa-solid fa-search"></i>
          </button>
          <button nz-button nzType="primary" class="primary with-text" (click)="createNew()" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i> Nouveau template
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="createNew()" aria-label="Nouveau template" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    <div class="loading" *ngIf="loading">
      <div class="skeleton-grid">
        <div class="skeleton-card" *ngFor="let _ of [1,2,3,4,5,6]"></div>
      </div>
    </div>
    <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="empty" *ngIf="!loading && !error && filtered.length===0">Aucun élément trouvé.</div>
      <div class="grid" *ngIf="!loading && !error && filtered.length>0">
        <div class="card" *ngFor="let it of filtered" (click)="view(it)">
          <div class="leading">
            <div class="avatar" *ngIf="!appFor(it); else appIcon">{{ (it.name || it.id) | slice:0:1 }}</div>
            <ng-template #appIcon>
              <div class="app-icon" [style.background]="appFor(it)?.color || '#f3f4f6'">
                <i *ngIf="appFor(it)?.iconClass" [class]="appFor(it)?.iconClass" [style.color]="fgColor(appFor(it)?.color)"></i>
                <img *ngIf="!appFor(it)?.iconClass && appFor(it)?.iconUrl" [src]="appFor(it)?.iconUrl" alt="icon"/>
                <img *ngIf="!appFor(it)?.iconClass && !appFor(it)?.iconUrl" [src]="simpleIconUrlWithColor(appFor(it)?.id || '', fgColor(appFor(it)?.color))" alt="icon"/>
              </div>
            </ng-template>
          </div>
          <div class="content">
            <div class="title-row"><div class="name">{{ it.name }}</div>
              <span class="chip">{{ it.type }}</span>
              <span class="chip" *ngIf="it.category">{{ it.category }}</span>
              <ng-container *ngIf="appFor(it) as a"><span class="chip">{{ a.title || a.name }}</span></ng-container>
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
    </div>
    
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    /* iPhone/iOS: ensure bottom content is reachable despite dynamic browser UI */
    @media (max-width: 768px) {
      .list-page { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
    }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; outline: none; }
    .actions .search:focus { border-color:#d1d5db; }
    .actions .primary { background:#111; border-color:#111; }
    .actions .primary[disabled] { background:#f3f4f6; border-color:#e5e7eb; color:#9ca3af; }
    /* Icon-only buttons: hide by default except search-action */
    .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .actions .icon-only.search-action { display:inline-flex; }
    .actions .icon-only i { font-size: 14px; line-height: 1; }
    @media (max-width: 640px) {
      .page-header { flex-direction: column; align-items: stretch; }
      .actions { width:100%; flex-wrap: nowrap; }
      .actions .search { flex:1 1 auto; width:auto; }
      .actions .with-text { display:none; }
      .actions .primary.icon-only { display:inline-flex; }
    }
    .loading .skeleton-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .skeleton-card { height: 96px; border-radius: 14px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    .error { color:#b42318; background:#fee4e2; border:1px solid #fecaca; padding:10px 12px; border-radius:10px; display:inline-block; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .avatar { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center; font-weight:600; color:#111; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border: 1px solid #e5e7eb; }
    .leading .app-icon { width:40px; height:40px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .leading .app-icon img { width:24px; height:24px; object-fit:contain; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .desc { color:#6b7280; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition: background-color .15s ease, box-shadow .15s ease, border-color .15s ease, transform .02s ease; }
    .icon-btn i { font-size:16px; }
    .icon-btn:hover { border-color:#d1d5db; background-image: var(--hp-menu-hover-bg); background-color: transparent; }
    .icon-btn:active { transform: translateY(0.5px); }
    .icon-btn[disabled] { opacity: .55; cursor: not-allowed; filter: grayscale(1); background:#f5f5f5; color:#9ca3af; border-color:#e5e7eb; }
    nz-modal .form { display:flex; flex-direction:column; gap:10px; }
    nz-modal .form label { font-size:12px; color:#6b7280; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `]
})
export class NodeTemplateListComponent implements OnInit, OnDestroy {
  templates: NodeTemplate[] = [];
  loading = true;
  error: string | null = null;
  appsMap = new Map<string, AppProvider>();
  q = '';
  doSearch() { this.q = (this.q || '').trim(); }
  get filtered() {
    const s = (this.q || '').trim().toLowerCase();
    if (!s) return this.templates;
    return this.templates.filter(t => {
      const name = (t.name || '').toLowerCase();
      const title = ((t as any).title || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      const tags = ((t as any).tags || []).join(' ').toLowerCase();
      const appId = ((t as any).app && (t as any).app._id) ? (t as any).app._id : ((t as any).appId || '');
      const app = appId ? (this.appsMap.get(appId) || null) : null;
      const appText = app ? `${(app.title || app.name || app.id)}`.toLowerCase() : '';
      return name.includes(s) || title.includes(s) || cat.includes(s) || tags.includes(s) || appText.includes(s);
    });
  }

  constructor(private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService) {}
  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }

  private changesSub?: Subscription;
  ngOnInit() {
    this.load();
    this.catalog.listApps().subscribe(list => { (list||[]).forEach(a => this.appsMap.set(a.id, a)); });
    try { this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load()); } catch {}
  }
  ngOnDestroy(): void { try { this.changesSub?.unsubscribe(); } catch {} }

  load() {
    this.loading = true; this.error = null;
    this.catalog.listNodeTemplates().subscribe({
      next: list => { this.zone.run(() => {
        const all = list || [];
        const ws = this.acl.currentWorkspaceId();
        this.acl.listAllowedTemplates(ws).subscribe(ids => {
          const allow = Array.isArray(ids) ? ids : [];
          this.templates = allow.length === 0 ? [] : all.filter(t => allow.includes((t as any).id));
          try { this.cdr.detectChanges(); } catch {}
        });
      }); },
      error: () => { this.zone.run(() => { this.error = 'Impossible de charger les templates.'; }); },
      complete: () => { this.zone.run(() => { this.loading = false; setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0); }); }
    });
  }
  fgColor(bg?: string|null): string {
    const b = String(bg || '#1677ff');
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
