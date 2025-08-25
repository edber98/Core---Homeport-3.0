import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService, FlowSummary } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { UiMessageService } from '../../services/ui-message.service';
import { environment } from '../../../environments/environment';

type FlowItem = { id: string; name: string; description?: string };

@Component({
  selector: 'flow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzInputModule, NzFormModule, NzSelectModule, NzSwitchModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>{{ title }}</h1>
          <p>Ouvrez un flow en Éditeur ou Exécutions, ou créez-en un nouveau.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" placeholder="Rechercher un flow (nom, desc)" class="search"/>
          <button nz-button class="icon-only search-action" (click)="doSearch()" aria-label="Rechercher">
            <i class="fa-solid fa-search"></i>
          </button>
          <button nz-button nzType="primary" class="primary with-text" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nouveau flow
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="openCreate()" aria-label="Nouveau flow">
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
        <div class="card" *ngFor="let it of filtered">
          <div class="leading">
            <div class="icon-badge" aria-hidden="true"><i [class]="getIcon(it)"></i></div>
          </div>
          <div class="content">
            <div class="title-row">
              <div class="name">{{ it.name }}</div>
              <span class="chip" *ngIf="it.status">{{ it.status }}</span>
              <span class="chip ok" *ngIf="it.enabled">en service</span>
            </div>
            <div class="desc" *ngIf="it.description">{{ it.description }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="openEditor(it)" title="Éditeur">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="icon-btn" (click)="openExecutions(it)" title="Exécutions">
              <i class="fa-solid fa-circle-play"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <nz-modal [(nzVisible)]="createVisible" nzTitle="Nouveau flow" (nzOnCancel)="closeCreate()" [nzFooter]="null">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical">
          <nz-form-item>
            <nz-form-label>Titre</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="Titre du flow" [(ngModel)]="draft.name" name="flow_name" />
            </nz-form-control>
          </nz-form-item>
          <div class="grid2">
            <nz-form-item>
              <nz-form-label>Statut</nz-form-label>
              <nz-form-control>
                <nz-select [(ngModel)]="draft.status" name="flow_status" nzPlaceHolder="Choisir">
                  <nz-option nzValue="draft" nzLabel="Brouillon"></nz-option>
                  <nz-option nzValue="test" nzLabel="Test"></nz-option>
                  <nz-option nzValue="production" nzLabel="Production"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label>En service</nz-form-label>
              <nz-form-control>
                <nz-switch [(ngModel)]="draft.enabled" name="flow_enabled"></nz-switch>
              </nz-form-control>
            </nz-form-item>
          </div>
          <nz-form-item>
            <nz-form-label>Description (optionnel)</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="Brève description" [(ngModel)]="draft.description" name="flow_desc" />
            </nz-form-control>
          </nz-form-item>
          <div class="modal-actions">
            <button nz-button (click)="closeCreate()">Annuler</button>
            <button nz-button nzType="primary" [disabled]="!canCreate() || creating" (click)="createFlow()">Créer</button>
          </div>
          <div class="error" *ngIf="createError">{{ createError }}</div>
        </form>
      </ng-container>
    </nz-modal>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; flex-direction:row; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap: 10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; }
    .actions .search:focus { border-color:#d1d5db; }
    .actions .primary { background:#111; border-color:#111; }
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

    .loading .skeleton-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
    .skeleton-card { height: 96px; border-radius: 14px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }

    .error { color:#b42318; background:#fee4e2; border:1px solid #fecaca; padding:10px 12px; border-radius:10px; display:inline-block; }

    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer;
            background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
            border: 1px solid #ececec;
            box-shadow: 0 8px 24px rgba(0,0,0,0.04);
            transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .icon-badge { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center;
                           background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%);
                           border: 1px solid #e5e7eb; color:#111; }
    .leading .icon-badge i { font-size: 18px; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .chip.ok { background:#eefcef; border-color:#dcfce7; color:#166534; }
    .desc { color:#6b7280; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition: background-color .15s ease, box-shadow .15s ease, border-color .15s ease, transform .02s ease; }
    .icon-btn i { font-size:16px; }
    .icon-btn:hover { border-color:#d1d5db; background-image: var(--hp-menu-hover-bg); background-color: transparent; }
    .icon-btn:active { transform: translateY(0.5px); }

    .grid2 { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `]
})
export class FlowListComponent implements OnInit, OnDestroy {
  title = 'Flows';

  flows: FlowSummary[] = [];
  loading = true;
  error: string | null = null;
  q = '';
  get filtered() {
    const s = (this.q || '').trim().toLowerCase();
    if (!s) return this.flows;
    return this.flows.filter(f => (f.name || '').toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s));
  }
  // create dialog state
  createVisible = false;
  creating = false;
  createError: string | null = null;
  draft: { name: string; description?: string; status?: 'draft'|'test'|'production'; enabled?: boolean } = { name: '', description: '', status: 'draft', enabled: false };
  doSearch() { this.q = (this.q || '').trim(); }

  private changesSub?: Subscription;
  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService, private ui: UiMessageService) { }

  private autoOpened = false;
  ngOnInit() {
    this.load();
    // React to workspace changes
    this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load());
    // Auto-open create dialog when on flows/editor, optionally prefill via query
    try {
      const path = this.route.routeConfig?.path || '';
      if (path === 'flows/editor' && !this.autoOpened) {
        const pm = this.route.snapshot.queryParamMap;
        const name = (pm.get('name') || '').trim();
        const description = (pm.get('description') || '').trim();
        this.draft = { name, description } as any;
        this.createError = null;
        this.createVisible = true;
        this.autoOpened = true;
        setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
      }
    } catch {}
  }
  ngOnDestroy(): void { try { this.changesSub?.unsubscribe(); } catch {} }

  load() {
    this.loading = true; this.error = null;
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) { this.loading = false; try { console.debug('[FlowList] load skipped: no wsId yet', { workspaces: this.acl.workspaces(), current: this.acl.currentWorkspace() }); } catch {}; return; }
    try { console.debug('[FlowList] load', { wsId, workspaces: this.acl.workspaces(), current: this.acl.currentWorkspace() }); } catch {}
    this.catalog.listFlows(wsId).subscribe({
      next: items => {
        this.zone.run(() => {
          const list = items || [];
          try {
            const counts: any = {};
            (list || []).forEach(f => { const w = this.acl.ensureResourceWorkspace('flow', f.id); counts[w] = (counts[w]||0)+1; });
            console.debug('[FlowList] list', { total: list.length, byWorkspace: counts, currentWorkspace: this.acl.currentWorkspaceId() });
          } catch {}
          this.flows = list;
        });
      },
      error: () => {
        this.zone.run(() => { this.error = 'Impossible de charger les flows.'; try { console.debug('[FlowList] error loading'); } catch {} });
      },
      complete: () => {
        this.zone.run(() => { this.loading = false; try { console.debug('[FlowList] complete'); } catch {} setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0); });
      }
    });
  }

  getIcon(_item: FlowSummary): string {
    return 'fa-solid fa-diagram-project';
  }

  openEditor(item: FlowSummary) { this.router.navigate(['/flow-builder', 'editor'], { queryParams: { demo: '1', flow: item.id } }); }
  openExecutions(item: FlowSummary) { this.router.navigate(['/flow-builder', 'executions'], { queryParams: { demo: '1', flow: item.id } }); }

  openCreate() { this.createVisible = true; this.createError = null; this.draft = { name: '', description: '', status: 'draft', enabled: false }; }
  closeCreate() { if (!this.creating) this.createVisible = false; }
  canCreate() { return !!(this.draft.name && this.draft.name.trim().length >= 2); }
  private makeIdFromName(name: string): string {
    const s = (name || '').trim().toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const base = s || 'flow';
    return base + '-' + Date.now().toString(36);
  }
  createFlow() {
    if (!this.canCreate()) return;
    this.creating = true; this.createError = null;
    const name = this.draft.name.trim();
    const status = this.draft.status || 'draft';
    const enabled = !!this.draft.enabled;
    const localId = this.makeIdFromName(name);
    const wsId = this.acl.currentWorkspaceId() || 'default';
    const obs = environment.useBackend ? this.catalog.createFlow(wsId, name, status, enabled, [], []) : this.catalog.saveFlow({ id: localId, name, description: (this.draft.description || '').trim(), status, enabled, nodes: [], edges: [], meta: {} } as any);
    obs.subscribe({
      next: () => {
        this.zone.run(() => {
          const ws = this.acl.currentWorkspaceId();
          try { this.acl.setResourceWorkspace('flow', localId, ws); } catch {}
          this.creating = false; this.createVisible = false; this.ui.success('Flow créé');
          this.load(); this.openEditor({ id: localId, name, description: (this.draft.description || '').trim() });
          setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
        });
      },
      error: () => { this.zone.run(() => { this.creating = false; this.createError = 'Échec de la création.'; this.ui.error('Échec de la création du flow'); }); }
    });
  }
  // Change handling moved to ngOnInit with throttle and cleanup
}
