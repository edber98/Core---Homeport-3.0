import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService, FormSummary } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';

type FormItem = { id: string; name: string; description?: string };

@Component({
  selector: 'form-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzInputModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>{{ title }}</h1>
          <p>Ouvrez un formulaire en Builder ou Viewer, ou créez-en un nouveau.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" placeholder="Rechercher un formulaire (nom, desc)" class="search"/>
          <button nz-button class="icon-only search-action" (click)="doSearch()" aria-label="Rechercher">
            <i class="fa-solid fa-search"></i>
          </button>
          <button nz-button nzType="primary" class="primary with-text" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nouveau formulaire
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="openCreate()" aria-label="Nouveau formulaire">
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
      <div class="grid" *ngIf="!loading && !error">
        <div class="card" *ngFor="let it of filtered">
          <div class="leading"><div class="icon-badge"><i class="fa-regular fa-rectangle-list"></i></div></div>
          <div class="content">
            <div class="title-row"><div class="name">{{ it.name }}</div></div>
            <div class="desc" *ngIf="it.description">{{ it.description }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="openBuilder(it)" title="Builder">
              <i class="fa-solid fa-screwdriver-wrench"></i>
            </button>
            <button class="icon-btn" (click)="openViewer(it)" title="Viewer">
              <i class="fa-regular fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Create modal -->
    <nz-modal [(nzVisible)]="createVisible" nzTitle="Nouveau formulaire" (nzOnCancel)="closeCreate()" [nzFooter]="null">
      <div class="form">
        <label>Nom du formulaire</label>
        <input nz-input placeholder="Ex: Demande" [(ngModel)]="draft.name" />
        <label>Description (optionnel)</label>
        <input nz-input placeholder="Brève description" [(ngModel)]="draft.description" />
        <div class="modal-actions">
          <button nz-button (click)="closeCreate()">Annuler</button>
          <button nz-button nzType="primary" [disabled]="!canCreate() || creating" (click)="createForm()">Créer</button>
        </div>
        <div class="error" *ngIf="createError">{{ createError }}</div>
      </div>
    </nz-modal>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .page-header .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; }
    .page-header .actions .search:focus { border-color:#d1d5db; }
    .page-header .actions .primary { background:#111; border-color:#111; }
    .page-header .actions .icon-only { display:none; align-items:center; justify-content:center; padding:6px 10px; }
    .page-header .actions .icon-only.search-action { display:inline-flex; }
    .page-header .actions .icon-only i { font-size:14px; line-height:1; }
    @media (max-width: 640px) {
      .page-header { flex-direction: column; align-items: stretch; }
      .page-header .actions { width:100%; flex-wrap: nowrap; }
      .page-header .actions .search { flex:1 1 auto; width:auto; }
      .page-header .actions .with-text { display:none; }
      .page-header .actions .primary.icon-only { display:inline-flex; }
    }
    .loading .skeleton-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
    .skeleton-card { height: 96px; border-radius: 14px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    .error { color:#b42318; background:#fee4e2; border:1px solid #fecaca; padding:10px 12px; border-radius:10px; display:inline-block; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .icon-badge { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center; color:#111; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border: 1px solid #e5e7eb; }
    .leading .icon-badge i { font-size:18px; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
export class FormListComponent implements OnInit, OnDestroy {
  title = 'Formulaires';

  forms: FormSummary[] = [];
  loading = true;
  error: string | null = null;
  q = '';
  get filtered() {
    const s = (this.q || '').trim().toLowerCase();
    if (!s) return this.forms;
    return this.forms.filter(f => (f.name || '').toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s));
  }
  // create modal state
  createVisible = false;
  creating = false;
  createError: string | null = null;
  draft: { name: string; description?: string } = { name: '', description: '' };

  private changesSub?: Subscription;
  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService) {}

  ngOnInit() { this.load(); this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load()); }
  ngOnDestroy(): void { try { this.changesSub?.unsubscribe(); } catch {} }

  load() {
    this.loading = true; this.error = null;
    this.catalog.listForms().subscribe({
      next: items => {
        this.zone.run(() => {
          const list = items || [];
          try {
            const counts: any = {};
            (list || []).forEach(f => { const w = this.acl.ensureResourceWorkspace('form', f.id); counts[w] = (counts[w]||0)+1; });
            console.debug('[FormList] list', { total: list.length, byWorkspace: counts, currentWorkspace: this.acl.currentWorkspaceId() });
          } catch {}
          const filtered = list.filter(f => {
            const ws = this.acl.ensureResourceWorkspace('form', f.id);
            return ws === this.acl.currentWorkspaceId() && this.acl.canAccessWorkspace(ws);
          });
          try { console.debug('[FormList] filtered', { count: filtered.length, currentWorkspace: this.acl.currentWorkspaceId() }); } catch {}
          this.forms = filtered;
        });
      },
      error: () => { this.zone.run(() => { this.error = 'Impossible de charger les formulaires.'; try { console.debug('[FormList] error loading'); } catch {} }); },
      complete: () => { this.zone.run(() => { this.loading = false; try { console.debug('[FormList] complete'); } catch {} setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0); }); }
    });
  }

  openBuilder(item: FormSummary) { this.router.navigate(['/dynamic-form'], { queryParams: { id: item.id } }); }
  openViewer(item: FormSummary) { this.router.navigate(['/dynamic-form'], { queryParams: { id: item.id, preview: '1' } }); }
  openCreate() { this.createVisible = true; this.createError = null; this.draft = { name: '', description: '' }; }
  closeCreate() { if (!this.creating) this.createVisible = false; }
  canCreate() { return !!(this.draft.name && this.draft.name.trim().length >= 2); }
  private makeIdFromName(name: string): string {
    const s = (name || '').trim().toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const base = s || 'form';
    return base + '-' + Date.now().toString(36);
  }
  createForm() {
    if (!this.canCreate()) return;
    this.creating = true; this.createError = null;
    const id = this.makeIdFromName(this.draft.name);
    const doc = { id, name: this.draft.name.trim(), description: (this.draft.description || '').trim(), schema: { title: this.draft.name.trim(), fields: [] } };
    this.catalog.saveForm(doc).subscribe({
      next: () => {
        this.zone.run(() => {
          // Attach to currently selected workspace
          const ws = this.acl.currentWorkspaceId();
          this.acl.setResourceWorkspace('form', id, ws);
          this.creating = false; this.createVisible = false; this.load(); this.openBuilder({ id, name: doc.name, description: doc.description });
          setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
        });
      },
      error: () => { this.zone.run(() => { this.creating = false; this.createError = 'Échec de la création.'; }); }
    });
  }
  // Refresh when user/workspace changes
  ngAfterViewInit() { try { this.acl.changes$.subscribe(() => this.load()); } catch {} }
  doSearch() { this.q = (this.q || '').trim(); }
}
