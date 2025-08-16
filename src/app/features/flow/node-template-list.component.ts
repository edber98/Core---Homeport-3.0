import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService, NodeTemplate, AppProvider } from '../../services/catalog.service';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';

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
          <button nz-button nzType="primary" class="primary" (click)="createNew()">
            <i class="fa-solid fa-plus"></i> Nouveau template
          </button>
        </div>
      </div>
    <div class="loading" *ngIf="loading">
      <div class="spinner"></div>
      <div>Chargement des templates…</div>
    </div>
    <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="grid" *ngIf="!loading && !error">
        <div class="card" *ngFor="let it of templates" (click)="view(it)">
          <div class="leading">
            <div class="avatar" *ngIf="!appFor(it); else appIcon">{{ (it.name || it.id) | slice:0:1 }}</div>
            <ng-template #appIcon>
              <div class="app-icon" [style.background]="appFor(it)?.color || '#f3f4f6'">
                <i *ngIf="appFor(it)?.iconClass" [class]="appFor(it)?.iconClass"></i>
                <img *ngIf="!appFor(it)?.iconClass" [src]="simpleIconUrl(appFor(it)?.id || '')" alt="icon"/>
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
            <button class="icon-btn" (click)="edit(it); $event.stopPropagation()" title="Éditer">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <ng-container *ngIf="appFor(it) as a">
            <button class="icon-btn" (click)="viewApp(a); $event.stopPropagation()" title="Voir l'app">
              <i class="fa-regular fa-eye"></i>
            </button>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
    
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions .primary { background:#111; border-color:#111; }
    .loading { display:flex; align-items:center; gap:10px; color:#666; margin: 12px 0; }
    .spinner { width:16px; height:16px; border:2px solid #e5e7eb; border-top-color:#1677ff; border-radius:50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
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
    nz-modal .form { display:flex; flex-direction:column; gap:10px; }
    nz-modal .form label { font-size:12px; color:#6b7280; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `]
})
export class NodeTemplateListComponent implements OnInit {
  templates: NodeTemplate[] = [];
  loading = true;
  error: string | null = null;
  appsMap = new Map<string, AppProvider>();

  constructor(private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); this.catalog.listApps().subscribe(list => { (list||[]).forEach(a => this.appsMap.set(a.id, a)); }); }

  load() {
    this.loading = true; this.error = null;
    this.catalog.listNodeTemplates().subscribe({
      next: list => { this.zone.run(() => { this.templates = list || []; }); },
      error: () => { this.zone.run(() => { this.error = 'Impossible de charger les templates.'; }); },
      complete: () => { this.zone.run(() => { this.loading = false; setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0); }); }
    });
  }

  edit(it: NodeTemplate) { this.router.navigate(['/node-templates/editor'], { queryParams: { id: it.id } }); }
  view(it: NodeTemplate) { this.router.navigate(['/node-templates/viewer'], { queryParams: { id: it.id } }); }
  createNew() { this.router.navigate(['/node-templates/editor']); }
  appFor(t: NodeTemplate): AppProvider | undefined { const id = (t as any).appId || ''; return id ? this.appsMap.get(id) : undefined; }
  simpleIconUrl(id: string) { return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}` : ''; }
  viewApp(a: AppProvider) { this.router.navigate(['/apps/viewer'], { queryParams: { id: a.id } }); }
}
