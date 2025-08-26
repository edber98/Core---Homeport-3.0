import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AccessControlService, Workspace } from '../../services/access-control.service';
import { WorkspaceBackendService } from '../../services/workspace-backend.service';
import { CatalogService, NodeTemplate, CredentialSummary, CredentialDoc } from '../../services/catalog.service';
import { WebsiteService, Website } from '../website/website.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { auditTime } from 'rxjs/operators';

@Component({
  selector: 'workspace-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzCheckboxModule, NzModalModule, NzSelectModule, NzDropDownModule, NzMenuModule, NzToolTipModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Workspaces</h1>
          <p>Créer et gérer les workspaces. Autoriser des templates de nœuds par workspace.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="draftName" placeholder="Nom du workspace" class="search" (keyup.enter)="create()"/>
          <button nz-button nzType="primary" class="primary with-text" (click)="create()">Créer</button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="create()" aria-label="Créer">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="loading" *ngIf="loadingWs">
          <div class="skeleton-grid">
            <div class="skeleton-card" *ngFor="let _ of [1,2,3,4]"></div>
          </div>
        </div>
        <div class="card" *ngFor="let w of workspaces" (click)="select(w)" [class.active]="selected?.id===w.id">
          <div class="leading"><div class="avatar">{{ w.name | slice:0:1 | uppercase }}</div></div>
          <div class="content"><div class="name">{{ w.name }}</div><div class="desc">{{ w.id }}</div></div>
        </div>
      </div>

        <div class="editor" *ngIf="selected as ws">
          <div class="editor-header">
            <div class="title">Autorisations de templates — {{ ws.name }}</div>
            <div class="actions">
            <button nz-button class="btn" (click)="selectAll(true)" [disabled]="ws.isDefault || savingAllowed || !isBackendId(ws.id)">Tout autoriser</button>
            <button nz-button class="btn" (click)="selectAll(false)" [disabled]="ws.isDefault || savingAllowed || !isBackendId(ws.id)">Tout retirer</button>
            </div>
          </div>
        <div class="tpl-grid" *ngIf="!loadingAllowed; else allowedLoading">
          <label class="tpl-item" *ngFor="let t of templates" nz-tooltip [nzTooltipTitle]="tplLabel(t)">
            <input type="checkbox" [checked]="isAllowed(t.id)" (change)="toggle(t, $any($event.target).checked)" [disabled]="ws.isDefault || savingAllowed || !isBackendId(ws.id)"/>
            <span class="tpl-line">{{ tplLabel(t) }}</span>
          </label>
          <div class="muted" *ngIf="ws.isDefault">Le workspace par défaut autorise tous les templates (édition désactivée).</div>
        </div>
        <ng-template #allowedLoading>
          <div class="skeleton-grid small">
            <div class="skeleton-line" *ngFor="let _ of [1,2,3,4,5,6,7,8]"></div>
          </div>
        </ng-template>

        <div class="transfer-block">
          <div class="section-title">Éléments de « {{ ws.name }} »</div>
          <div class="move-form" *ngIf="!loadingItems; else itemsLoading">
            <!-- Flows -->
            <div class="row">
              <label class="field-label">Flows</label>
              <div class="items" *ngIf="(flowsAvail?.length || 0) > 0; else emptyFlows">
                <div class="muted" style="margin-bottom:4px">{{ flowsAvail.length }} élément(s)</div>
                <div class="item" *ngFor="let it of flowsAvail">
                  <span class="name">{{ it.name || it.id }}</span>
                  <span class="id">{{ it.id }}</span>
                  <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="menuFlows" (click)="$event.stopPropagation()">Actions <i class="fa-solid fa-chevron-down"></i></button>
                  <nz-dropdown-menu #menuFlows="nzDropdownMenu">
                    <ul nz-menu>
                      <li nz-menu-item nzDisabled="true">Transférer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="transferOne('flow', it.id, w.id)">{{ w.name }}</li>
                      <li nz-menu-divider></li>
                      <li nz-menu-item nzDisabled="true">Dupliquer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="duplicateOne('flow', it.id, w.id)">{{ w.name }}</li>
                    </ul>
                  </nz-dropdown-menu>
                </div>
              </div>
              <ng-template #emptyFlows><div class="empty">Aucun flow.</div></ng-template>
            </div>
            <!-- Forms -->
            <div class="row">
              <label class="field-label">Forms</label>
              <div class="items" *ngIf="(formsAvail?.length || 0) > 0; else emptyForms">
                <div class="muted" style="margin-bottom:4px">{{ formsAvail.length }} élément(s)</div>
                <div class="item" *ngFor="let it of formsAvail">
                  <span class="name">{{ it.name || it.id }}</span>
                  <span class="id">{{ it.id }}</span>
                  <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="menuForms" (click)="$event.stopPropagation()">Actions <i class="fa-solid fa-chevron-down"></i></button>
                  <nz-dropdown-menu #menuForms="nzDropdownMenu">
                    <ul nz-menu>
                      <li nz-menu-item nzDisabled="true">Transférer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="transferOne('form', it.id, w.id)">{{ w.name }}</li>
                      <li nz-menu-divider></li>
                      <li nz-menu-item nzDisabled="true">Dupliquer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="duplicateOne('form', it.id, w.id)">{{ w.name }}</li>
                    </ul>
                  </nz-dropdown-menu>
                </div>
              </div>
              <ng-template #emptyForms><div class="empty">Aucun formulaire.</div></ng-template>
            </div>
            <!-- Websites -->
            <div class="row">
              <label class="field-label">Websites</label>
              <div class="items" *ngIf="(sitesAvail?.length || 0) > 0; else emptySites">
                <div class="muted" style="margin-bottom:4px">{{ sitesAvail.length }} élément(s)</div>
                <div class="item" *ngFor="let it of sitesAvail">
                  <span class="name">{{ it.name || it.id }}</span>
                  <span class="id">{{ it.id }}</span>
                  <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="menuSites" (click)="$event.stopPropagation()">Actions <i class="fa-solid fa-chevron-down"></i></button>
                  <nz-dropdown-menu #menuSites="nzDropdownMenu">
                    <ul nz-menu>
                      <li nz-menu-item nzDisabled="true">Transférer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="transferOne('website', it.id, w.id)">{{ w.name }}</li>
                      <li nz-menu-divider></li>
                      <li nz-menu-item nzDisabled="true">Dupliquer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="duplicateOne('website', it.id, w.id)">{{ w.name }}</li>
                    </ul>
                  </nz-dropdown-menu>
                </div>
              </div>
              <ng-template #emptySites><div class="empty">Aucun site.</div></ng-template>
            </div>
            <!-- Credentials -->
            <div class="row">
              <label class="field-label">Credentials</label>
              <div class="items" *ngIf="(credsAvail?.length || 0) > 0; else emptyCreds">
                <div class="muted" style="margin-bottom:4px">{{ credsAvail.length }} élément(s)</div>
                <div class="item" *ngFor="let it of credsAvail">
                  <span class="name">{{ it.name || it.id }}</span>
                  <span class="id">{{ it.id }}</span>
                  <button nz-button nzSize="small" nz-dropdown [nzDropdownMenu]="menuCreds" (click)="$event.stopPropagation()">Actions <i class="fa-solid fa-chevron-down"></i></button>
                  <nz-dropdown-menu #menuCreds="nzDropdownMenu">
                    <ul nz-menu>
                      <li nz-menu-item nzDisabled="true">Transférer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="transferOne('credential', it.id, w.id)">{{ w.name }}</li>
                      <li nz-menu-divider></li>
                      <li nz-menu-item nzDisabled="true">Dupliquer vers</li>
                      <li nz-menu-item *ngFor="let w of workspaces" (click)="duplicateOne('credential', it.id, w.id)">{{ w.name }}</li>
                    </ul>
                  </nz-dropdown-menu>
                </div>
              </div>
              <ng-template #emptyCreds><div class="empty">Aucun credential.</div></ng-template>
            </div>
          </div>
          <ng-template #itemsLoading>
            <div class="skeleton-grid">
              <div class="skeleton-card" *ngFor="let _ of [1,2,3,4]"></div>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  </div>

  <!-- Missing templates modal (only when transferring flows with missing templates) -->
  <nz-modal [(nzVisible)]="missingVisible" [nzFooter]="null" (nzOnCancel)="cancelMissing()">
    <ng-container *nzModalTitle>Templates manquants</ng-container>
    <div *nzModalContent>
      <div class="warn">
        Les templates suivants ne sont pas autorisés dans « {{ getWsName(moveDestWs) }} »:
        <div class="chips" style="margin-top:6px">
          <span class="chip" *ngFor="let t of missingTemplates">{{ t }}</span>
        </div>
      </div>
      <div class="modal-actions">
        <button nz-button (click)="cancelMissing()">Annuler</button>
        <button nz-button nzType="primary" (click)="activateAndProceed()">Activer et continuer</button>
      </div>
    </div>
  </nz-modal>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; }
    .actions .primary { background:#111; border-color:#111; }
    .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .actions .with-text { display:inline-flex; align-items:center; gap:6px; }
    @media (max-width: 640px) { .actions .with-text { display:none; } .actions .icon-only { display:inline-flex; } }

    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:14px; margin-bottom: 16px; }
    .card { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:linear-gradient(180deg,#fff,#fafafa); border:1px solid #ececec; cursor:pointer; transition: transform .1s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(0,0,0,.08); border-color:#e5e7eb; }
    .card.active { border-color:#1677ff; box-shadow: 0 12px 24px rgba(22,119,255,.15); }
    .avatar { width:36px; height:36px; border-radius:12px; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; font-weight:600; }
    .content .name { font-weight: 600; }
    .content .desc { color:#6b7280; font-size:12px; }

    .editor { background:#fff; border:1px solid #ececec; border-radius:14px; padding:12px; }
    .editor-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .editor-header .title { font-weight:600; }
    .editor-header .actions { display:flex; align-items:center; gap:8px; }
    .editor .btn { border-radius: 10px; }
    .tpl-grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap:10px; }
    .tpl-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #f0f0f0; border-radius:10px; min-width: 0; }
    .tpl-line { flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { grid-column: 1 / -1; color:#9ca3af; font-size:12px; padding:4px 2px; }
    .transfer-block { margin-top: 16px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
    .transfer-block .section-title { font-weight:600; color:#6b7280; margin-bottom: 8px; }
    .row-actions { display:flex; gap:8px; }
    .move-form { display:flex; flex-direction:column; gap:10px; }
    .move-form .row { display:flex; align-items:flex-start; gap:10px; }
    .move-form .row .field-label { width: 90px; color:#6b7280; font-size:12px; padding-top:6px; }
    .move-form .items { display:flex; flex-direction:column; gap:6px; max-height: 260px; overflow:auto; flex: 1 1 auto; padding-bottom: 12px; }
    .move-form .item { display:flex; align-items:center; gap:8px; border:1px solid #f0f0f0; border-radius:10px; padding:6px 8px; }
    .move-form .item .id { color:#9ca3af; font-size:12px; margin-left:auto; }
    .empty { color:#9ca3af; font-size: 12px; border:1px dashed #e5e7eb; padding:8px 10px; border-radius: 10px; }
    .warn { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:10px; padding:8px 10px; }
    .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
    .loading .skeleton-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:14px; }
    @media (max-width: 1024px) { .loading .skeleton-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 640px) { .loading .skeleton-grid { grid-template-columns: 1fr; } }
    .skeleton-card { height: 64px; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    /* Extra spacing for elements loaders */
    .transfer-block .skeleton-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 4px 0 14px; }
  `]
})
export class WorkspaceListComponent implements OnInit {
  workspaces: Workspace[] = [];
  templates: NodeTemplate[] = [];
  allowed: string[] = [];
  selected: Workspace | null = null;
  draftName = '';
  private changesSub?: Subscription;
  loadingWs = false;
  loadingAllowed = false;
  loadingItems = false;
  savingAllowed = false;
  isBackendId(id: string | null | undefined): boolean { return !!id && /^[a-fA-F0-9]{24}$/.test(String(id)); }
  private itemsReqId = 0;
  private dbg(msg: string, data?: any) { try { console.debug('[WorkspaceList]', msg, data ?? ''); } catch {} }

  constructor(private acl: AccessControlService, private catalog: CatalogService, private websites: WebsiteService, private wsApi: WorkspaceBackendService, private cdr: ChangeDetectorRef, private zone: NgZone) {}
  ngOnInit(): void {
    // N'afficher que les workspaces de l'entreprise de l'utilisateur courant
    this.loadingWs = true;
    this.syncWorkspacesFromAcl();
    this.catalog.listNodeTemplates().subscribe(list => {
      this.templates = list || [];
      if (this.selected && (this.selected as any).isDefault) {
        this.loadingAllowed = false;
        this.allowed = this.templates.map(t => t.id);
        try { this.cdr.detectChanges(); } catch {}
      }
    });
    // Rafraîchir la liste et la sélection quand l'ACL change (ex: au premier sync backend)
    try { this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.syncWorkspacesFromAcl()); } catch {}
  }
  private syncWorkspacesFromAcl() {
    this.acl.listCompanyWorkspaces().subscribe(ws => {
      this.zone.run(() => {
        this.dbg('ACL sync start');
        const incoming = ws || [];
        this.workspaces = incoming;
        this.loadingWs = false;
        const selectedStillExists = this.selected && incoming.some(w => w.id === this.selected!.id);
        if (!selectedStillExists) {
          const def = incoming.find(w => (w as any).isDefault);
          this.selected = def || incoming[0] || null;
        }
        if (this.selected) {
          this.dbg('Selecting ws', { id: this.selected.id, name: this.selected.name });
          this.select(this.selected);
        } else {
          // No selection; clear panels and loaders
          this.allowed = [];
          this.loadingAllowed = false;
          this.flowsAvail = []; this.formsAvail = []; this.sitesAvail = []; this.credsAvail = [];
          this.loadingItems = false;
        }
        this.dbg('ACL sync done', { count: incoming.length, selected: this.selected?.id });
        try { this.cdr.detectChanges(); } catch {}
      });
    });
  }
  select(w: Workspace) {
    this.zone.run(() => {
      this.selected = w;
      this.loadingAllowed = true;
      this.dbg('Allowed loading start', { wsId: w.id, isDefault: (w as any).isDefault });
      if ((w as any).isDefault) { this.allowed = this.templates.map(t => t.id); this.loadingAllowed = false; this.initMoveDefaults(); return; }
      this.acl.listAllowedTemplates(w.id).subscribe(ids => this.zone.run(() => { this.allowed = ids || []; this.loadingAllowed = false; this.dbg('Allowed loaded', { count: this.allowed.length }); try { this.cdr.detectChanges(); } catch {} }));
      // Initialize transfer panel defaults on selection
      this.initMoveDefaults();
    });
  }
  ngOnDestroy() { try { this.changesSub?.unsubscribe(); } catch {}
  }
  isAllowed(id: string): boolean { return this.allowed.includes(id); }
  toggle(t: NodeTemplate, on: boolean) {
    if (!this.selected) return;
    this.savingAllowed = true;
    this.acl.toggleTemplate(this.selected.id, t.id, on).subscribe({
      next: () => this.select(this.selected!),
      complete: () => { this.savingAllowed = false; }
    });
  }
  selectAll(on: boolean) {
    if (!this.selected) return;
    const ids = on ? this.templates.map(t => t.id) : [];
    this.savingAllowed = true;
    this.acl.setAllowedTemplates(this.selected.id, ids).subscribe({
      next: () => this.select(this.selected!),
      complete: () => { this.savingAllowed = false; }
    });
  }
  canCreate() { return (this.draftName || '').trim().length >= 2; }
  create() {
    const name = (this.draftName || '').trim();
    if (!name) return;
    this.acl.addWorkspace(name).subscribe(ws => {
      this.workspaces = [...this.workspaces, ws];
      this.draftName = '';
      // Auto-sélectionne le workspace créé pour afficher l'éditeur des autorisations
      this.select(ws);
    });
  }

  // ===== Move / Duplicate (inline) =====
  moveMode: 'transfer' | 'duplicate' = 'transfer';
  moveDestWs: string | null = null;
  flowsAvail: Array<{ id: string; name?: string }> = [];
  formsAvail: Array<{ id: string; name?: string }> = [];
  sitesAvail: Array<{ id: string; name?: string }> = [];
  missingTemplates: string[] = [];
  missingVisible = false;
  private pendingIds: string[] = [];
  credsAvail: Array<{ id: string; name?: string }> = [];

  tplLabel(t: NodeTemplate): string {
    const parts = [t.name, t.id];
    if ((t as any).category) parts.push((t as any).category);
    return parts.filter(Boolean).join(' · ');
  }

  // Initialize defaults when a workspace is selected
  private initMoveDefaults() {
    if (!this.selected) return;
    this.moveDestWs = this.selected.id;
    this.missingTemplates = [];
    this.reloadAll();
  }
  private reloadAll() {
    const src = this.selected?.id || '';
    if (!src) { this.flowsAvail = []; this.formsAvail = []; this.sitesAvail = []; this.credsAvail = []; this.loadingItems = false; return; }
    const reqId = ++this.itemsReqId;
    this.zone.run(() => { this.loadingItems = true; this.dbg('Items loading start', { wsId: src, reqId }); });
    // In backend mode: fetch aggregated elements to avoid race conditions
    if (environment.useBackend && this.isBackendId(src)) {
      let pending = 3; // elements + forms + websites (forms/websites are local)
      const finish = () => {
        if (reqId !== this.itemsReqId) return; // selection changed; ignore
        if (--pending <= 0) { this.zone.run(() => { this.loadingItems = false; this.dbg('Items loading done', { wsId: src, reqId }); try { this.cdr.detectChanges(); } catch {} }); }
      };
      this.dbg('Elements request', { wsId: src, reqId });
      this.wsApi.elements(src).subscribe({
        next: (resp: any) => this.zone.run(() => {
          if (reqId !== this.itemsReqId) return;
          const flows = Array.isArray(resp?.flows) ? resp.flows : [];
          const creds = Array.isArray(resp?.credentials) ? resp.credentials : [];
          this.flowsAvail = flows.map((f: any) => ({ id: String(f.id || f._id || ''), name: f.name || String(f.id || '') }));
          this.credsAvail = creds.map((c: any) => ({ id: String(c.id || c._id || ''), name: c.name || String(c.id || '') }));
          this.dbg('Elements response', { flows: this.flowsAvail.length, creds: this.credsAvail.length, reqId });
          try { this.cdr.detectChanges(); } catch {}
        }),
        error: (e) => this.zone.run(() => {
          if (reqId !== this.itemsReqId) return;
          this.dbg('Elements error', { error: (e && (e.message || e.code)) || 'error', reqId });
          this.flowsAvail = []; this.credsAvail = [];
          finish();
        }),
        complete: () => this.zone.run(() => { this.dbg('Elements complete', { reqId }); finish(); })
      });
      // Local forms (demo)
      this.catalog.listForms().subscribe({ next: list => { this.dbg('Forms response');
        const items = (list || []).filter(f => this.acl.ensureResourceWorkspace('form', f.id) === src);
        this.formsAvail = items.map(f => ({ id: f.id, name: f.name }));
        try { this.cdr.detectChanges(); } catch {}
      }, error: () => {}, complete: () => this.zone.run(() => { finish(); }) });
      // Local websites (demo)
      this.websites.list().subscribe({ next: list => { this.dbg('Websites response');
        const items = (list || []).filter(s => this.acl.ensureResourceWorkspace('website', s.id) === src);
        this.sitesAvail = items.map(s => ({ id: s.id, name: s.name }));
        try { this.cdr.detectChanges(); } catch {}
      }, error: () => {}, complete: () => this.zone.run(() => { finish(); }) });
      return;
    }
    // Local mode: original parallel calls
    let pending2 = 4; const finish2 = () => { if (reqId !== this.itemsReqId) return; if (--pending2<=0) this.zone.run(() => { this.loadingItems=false; this.dbg('Items loading done (local)', { wsId: src, reqId }); try { this.cdr.detectChanges(); } catch {} }); };
    this.catalog.listFlows(src).subscribe({ next: list => { this.dbg('Flows response (local)'); this.flowsAvail = (list||[]).map(f => ({ id: f.id, name: f.name })); try { this.cdr.detectChanges(); } catch {}; }, complete: finish2, error: finish2 });
    this.catalog.listForms().subscribe({ next: list => { this.dbg('Forms response (local)'); const items = (list||[]).filter(f => this.acl.ensureResourceWorkspace('form', f.id)===src); this.formsAvail = items.map(f => ({ id: f.id, name: f.name })); try { this.cdr.detectChanges(); } catch {}; }, complete: finish2, error: finish2 });
    this.websites.list().subscribe({ next: list => { this.dbg('Websites response (local)'); const items = (list||[]).filter(s => this.acl.ensureResourceWorkspace('website', s.id)===src); this.sitesAvail = items.map(s => ({ id: s.id, name: s.name })); try { this.cdr.detectChanges(); } catch {}; }, complete: finish2, error: finish2 });
    this.catalog.listCredentials(src).subscribe({ next: list => { this.dbg('Credentials response (local)'); this.credsAvail = (list||[]).map(c => ({ id: c.id, name: c.name })); try { this.cdr.detectChanges(); } catch {}; }, complete: finish2, error: finish2 });
  }
  transferOne(kind: 'flow'|'form'|'website'|'credential', id: string, dest: string) {
    this.moveDestWs = dest; this.moveMode = 'transfer';
    if (kind === 'flow') {
      this.checkMissingTemplatesForFlows(dest, [id], (missing) => {
        if (missing.length) { this.missingTemplates = missing; this.pendingIds = [id]; this.missingVisible = true; return; }
        // Backend: update flow workspaceId; Local: update mapping
        if (environment.useBackend) {
          // Call through catalog via flowsApi.update (workspaceId)
          this.catalog.transferFlow(id, dest).subscribe(() => this.afterMoveCleanup());
        } else {
          this.acl.setResourceWorkspace('flow', id, dest); this.afterMoveCleanup();
        }
      });
    } else if (kind === 'form') {
      this.acl.setResourceWorkspace('form', id, dest); this.afterMoveCleanup();
    } else if (kind === 'website') {
      this.acl.setResourceWorkspace('website', id, dest); this.afterMoveCleanup();
    } else {
      // credential: update workspaceId on the doc
      this.catalog.getCredential(id).subscribe(doc => {
        const updated: CredentialDoc = { ...doc, workspaceId: dest };
        this.catalog.saveCredential(updated).subscribe(() => this.afterMoveCleanup());
      });
    }
  }
  duplicateOne(kind: 'flow'|'form'|'website'|'credential', id: string, dest: string) {
    this.moveDestWs = dest; this.moveMode = 'duplicate';
    if (kind === 'flow') {
      this.catalog.getFlow(id).subscribe(doc => {
        const nameCopy = (doc.name || id) + ' (copie)';
        // Backend: create in destination ws; Local: save with new id then map
        if (environment.useBackend) {
          this.catalog.createFlow(dest, nameCopy, (doc as any).status || 'draft', !!(doc as any).enabled, (doc.nodes || []), (doc.edges || [])).subscribe(() => this.afterMoveCleanup());
        } else {
          const nid = id + '-copy-' + Date.now().toString(36);
          const copy = { ...doc, id: nid, name: nameCopy };
          this.catalog.saveFlow(copy).subscribe(() => this.acl.setResourceWorkspace('flow', nid, dest));
          this.afterMoveCleanup();
        }
      });
    } else if (kind === 'form') {
      this.catalog.getForm(id).subscribe(doc => {
        const nid = id + '-copy-' + Date.now().toString(36);
        const copy: any = { ...doc, id: nid, name: (doc.name || id) + ' (copie)' };
        this.catalog.saveForm(copy).subscribe(() => this.acl.setResourceWorkspace('form', nid, dest));
        this.afterMoveCleanup();
      });
    } else if (kind === 'website') {
      this.websites.getById(id).subscribe(site => {
        if (!site) return;
        const nid = site.id + '-copy-' + Date.now().toString(36);
        const copy: Website = { ...site, id: nid, name: (site.name || site.id) + ' (copie)', slug: (site.slug || site.id) + '-copy' };
        this.websites.upsert(copy).subscribe(() => this.acl.setResourceWorkspace('website', nid, dest));
        this.afterMoveCleanup();
      });
    } else {
      // credential
      this.catalog.getCredential(id).subscribe(doc => {
        const nid = id + '-copy-' + Date.now().toString(36);
        const copy: CredentialDoc = { ...doc, id: nid, name: (doc.name || id) + ' (copie)', workspaceId: dest };
        this.catalog.saveCredential(copy).subscribe(() => this.afterMoveCleanup());
      });
    }
  }

  private scanTemplatesInFlow(doc: any): string[] {
    const out = new Set<string>();
    const visit = (val: any, depth = 0) => {
      if (!val || depth > 6) return; // cap recursion
      // String cases
      if (typeof val === 'string') {
        if (val && /^[a-z0-9_\-]*tmpl[_\-]/i.test(val) || val.startsWith('tmpl_')) out.add(val);
        return;
      }
      // Array
      if (Array.isArray(val)) { val.forEach(v => visit(v, depth + 1)); return; }
      // Object: check common shapes
      if (typeof val === 'object') {
        try {
          // Direct template object
          const maybeId = val?.id;
          const maybeType = val?.type;
          if (typeof maybeId === 'string' && (maybeId.startsWith('tmpl_') || /tmpl[_\-]/.test(maybeId))) out.add(maybeId);
          // Known keys used by builder
          const t1 = val?.templateObj?.id || val?.template?.id || val?.data?.template?.id || val?.data?.model?.templateObj?.id || val?.data?.model?.template?.id;
          const t2 = val?.template || val?.data?.template || val?.data?.model?.template;
          if (typeof t1 === 'string') out.add(t1);
          if (typeof t2 === 'string') out.add(t2);
          // Heuristic: builder stores nodes with data.model having template/templateObj
          Object.keys(val).forEach(k => {
            if (k.toLowerCase().includes('template')) visit((val as any)[k], depth + 1);
          });
        } catch {}
        // Shallow traverse object values
        try { Object.values(val).forEach(v => visit(v, depth + 1)); } catch {}
      }
    };
    try { visit(doc?.nodes || []); } catch {}
    // Fallback: scan whole doc if nodes not found
    try { if (!out.size) visit(doc); } catch {}
    return Array.from(out);
  }
  private checkMissingTemplatesForFlows(destWs: string, ids: string[], done: (missing: string[]) => void) {
    const flows$ = ids.map(id => this.catalog.getFlow(id));
    forkJoin(flows$).subscribe(docs => {
      const used = new Set<string>();
      docs.forEach(doc => this.scanTemplatesInFlow(doc).forEach(t => used.add(t)));
      this.acl.listAllowedTemplates(destWs).subscribe(allow => {
        const allowSet = new Set(allow || []);
        const missing = Array.from(used).filter(t => !allowSet.has(t));
        try { console.debug('[WorkspaceMove] checkMissing', { dest: destWs, used: Array.from(used), allowedCount: allowSet.size, missing }); } catch {}
        done(missing);
      });
    });
  }
  cancelMissing() { this.missingVisible = false; this.pendingIds = []; this.missingTemplates = []; }
  activateAndProceed() {
    if (!this.moveDestWs) return;
    const ws = this.moveDestWs;
    this.acl.listAllowedTemplates(ws).subscribe(curr => {
      const set = new Set([...(curr || []), ...this.missingTemplates]);
      this.acl.setAllowedTemplates(ws, Array.from(set)).subscribe(() => {
        const ids = this.pendingIds.slice();
        this.missingTemplates = []; this.pendingIds = []; this.missingVisible = false;
        this.proceedFlowMove(ids);
      });
    });
  }
  private proceedFlowMove(ids: string[]) {
    const dest = this.moveDestWs!; const mode = this.moveMode;
    ids.forEach(id => {
      if (mode === 'transfer') {
        this.acl.setResourceWorkspace('flow', id, dest);
      } else {
        this.catalog.getFlow(id).subscribe(doc => {
          const nid = id + '-copy-' + Date.now().toString(36);
          const copy = { ...doc, id: nid, name: (doc.name || id) + ' (copie)' };
          this.catalog.saveFlow(copy).subscribe(() => this.acl.setResourceWorkspace('flow', nid, dest));
        });
      }
    });
    this.afterMoveCleanup();
  }
  private afterMoveCleanup() {
    this.reloadAll();
  }

  // Helpers
  getWsName(id: string | null): string { if (!id) return ''; return this.workspaces.find(w => w.id === id)?.name || id; }
}
