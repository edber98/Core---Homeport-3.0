import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AccessControlService, Workspace } from '../../services/access-control.service';
import { CatalogService, NodeTemplate } from '../../services/catalog.service';
import { WebsiteService, Website } from '../website/website.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';

@Component({
  selector: 'workspace-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzCheckboxModule, NzModalModule, NzSelectModule, NzDropDownModule, NzMenuModule],
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
        <div class="card" *ngFor="let w of workspaces" (click)="select(w)" [class.active]="selected?.id===w.id">
          <div class="leading"><div class="avatar">{{ w.name | slice:0:1 }}</div></div>
          <div class="content"><div class="name">{{ w.name }}</div><div class="desc">{{ w.id }}</div></div>
        </div>
      </div>

      <div class="editor" *ngIf="selected as ws">
        <div class="editor-header">
          <div class="title">Autorisations de templates — {{ ws.name }}</div>
          <div class="actions">
            <button nz-button class="btn" (click)="selectAll(true)" [disabled]="ws.id==='default'">Tout autoriser</button>
            <button nz-button class="btn" (click)="selectAll(false)" [disabled]="ws.id==='default'">Tout retirer</button>
          </div>
        </div>
        <div class="tpl-grid">
          <label class="tpl-item" *ngFor="let t of templates">
            <input type="checkbox" [checked]="isAllowed(t.id)" (change)="toggle(t, $any($event.target).checked)" [disabled]="ws.id==='default'"/>
            <span class="tpl-name">{{ t.name }}</span>
            <span class="tpl-id">{{ t.id }}</span>
            <span class="tpl-cat" *ngIf="t.category">· {{ t.category }}</span>
          </label>
          <div class="muted" *ngIf="ws.id==='default'">Le workspace “Default” autorise tous les templates (édition désactivée).</div>
        </div>

        <div class="transfer-block">
          <div class="section-title">Éléments de « {{ ws.name }} »</div>
          <div class="move-form">
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
          </div>
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
    .tpl-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #f0f0f0; border-radius:10px; }
    .tpl-name { font-weight:500; }
    .tpl-id { color:#9ca3af; font-size:12px; }
    .tpl-cat { color:#6b7280; font-size:12px; }
    .muted { grid-column: 1 / -1; color:#9ca3af; font-size:12px; padding:4px 2px; }
    .transfer-block { margin-top: 16px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
    .transfer-block .section-title { font-weight:600; color:#6b7280; margin-bottom: 8px; }
    .row-actions { display:flex; gap:8px; }
    .move-form { display:flex; flex-direction:column; gap:10px; }
    .move-form .row { display:flex; align-items:flex-start; gap:10px; }
    .move-form .row .field-label { width: 90px; color:#6b7280; font-size:12px; padding-top:6px; }
    .move-form .items { display:flex; flex-direction:column; gap:6px; max-height: 260px; overflow:auto; flex: 1 1 auto; }
    .move-form .item { display:flex; align-items:center; gap:8px; border:1px solid #f0f0f0; border-radius:10px; padding:6px 8px; }
    .move-form .item .id { color:#9ca3af; font-size:12px; margin-left:auto; }
    .empty { color:#9ca3af; font-size: 12px; border:1px dashed #e5e7eb; padding:8px 10px; border-radius: 10px; }
    .warn { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:10px; padding:8px 10px; }
    .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
  `]
})
export class WorkspaceListComponent implements OnInit {
  workspaces: Workspace[] = [];
  templates: NodeTemplate[] = [];
  allowed: string[] = [];
  selected: Workspace | null = null;
  draftName = '';
  private changesSub?: Subscription;

  constructor(private acl: AccessControlService, private catalog: CatalogService, private websites: WebsiteService, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.acl.listWorkspaces().subscribe(ws => this.workspaces = ws || []);
    this.catalog.listNodeTemplates().subscribe(list => this.templates = list || []);
    // Refresh lists when ACL changes (mapping/allowlists/users/workspaces)
    try { this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.reloadAll()); } catch {}
  }
  select(w: Workspace) {
    this.selected = w;
    if (w.id === 'default') { this.allowed = this.templates.map(t => t.id); this.initMoveDefaults(); return; }
    this.acl.listAllowedTemplates(w.id).subscribe(ids => this.allowed = ids || []);
    // Initialize transfer panel defaults on selection
    this.initMoveDefaults();
  }
  ngOnDestroy() { try { this.changesSub?.unsubscribe(); } catch {}
  }
  isAllowed(id: string): boolean { return this.allowed.includes(id); }
  toggle(t: NodeTemplate, on: boolean) {
    if (!this.selected) return;
    this.acl.toggleTemplate(this.selected.id, t.id, on).subscribe(() => this.select(this.selected!));
  }
  selectAll(on: boolean) {
    if (!this.selected) return;
    const ids = on ? this.templates.map(t => t.id) : [];
    this.acl.setAllowedTemplates(this.selected.id, ids).subscribe(() => this.select(this.selected!));
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

  // Initialize defaults when a workspace is selected
  private initMoveDefaults() {
    if (!this.selected) return;
    this.moveDestWs = this.selected.id;
    this.missingTemplates = [];
    this.reloadAll();
  }
  private reloadAll() {
    const src = this.selected?.id || '';
    if (!src) { this.flowsAvail = []; this.formsAvail = []; this.sitesAvail = []; return; }
    // Flows
    this.catalog.listFlows().subscribe(list => {
      const items = (list || []).filter(f => this.acl.ensureResourceWorkspace('flow', f.id) === src);
      this.flowsAvail = items.map(f => ({ id: f.id, name: f.name }));
      try { this.cdr.detectChanges(); } catch {}
    });
    // Forms
    this.catalog.listForms().subscribe(list => {
      const items = (list || []).filter(f => this.acl.ensureResourceWorkspace('form', f.id) === src);
      this.formsAvail = items.map(f => ({ id: f.id, name: f.name }));
      try { this.cdr.detectChanges(); } catch {}
    });
    // Websites
    this.websites.list().subscribe(list => {
      const items = (list || []).filter(s => this.acl.ensureResourceWorkspace('website', s.id) === src);
      this.sitesAvail = items.map(s => ({ id: s.id, name: s.name }));
      try { this.cdr.detectChanges(); } catch {}
    });
  }
  transferOne(kind: 'flow'|'form'|'website', id: string, dest: string) {
    this.moveDestWs = dest; this.moveMode = 'transfer';
    if (kind === 'flow') {
      this.checkMissingTemplatesForFlows(dest, [id], (missing) => {
        if (missing.length) { this.missingTemplates = missing; this.pendingIds = [id]; this.missingVisible = true; return; }
        this.acl.setResourceWorkspace('flow', id, dest); this.afterMoveCleanup();
      });
    } else if (kind === 'form') {
      this.acl.setResourceWorkspace('form', id, dest); this.afterMoveCleanup();
    } else {
      this.acl.setResourceWorkspace('website', id, dest); this.afterMoveCleanup();
    }
  }
  duplicateOne(kind: 'flow'|'form'|'website', id: string, dest: string) {
    this.moveDestWs = dest; this.moveMode = 'duplicate';
    if (kind === 'flow') {
      this.catalog.getFlow(id).subscribe(doc => {
        const nid = id + '-copy-' + Date.now().toString(36);
        const copy = { ...doc, id: nid, name: (doc.name || id) + ' (copie)' };
        this.catalog.saveFlow(copy).subscribe(() => this.acl.setResourceWorkspace('flow', nid, dest));
        this.afterMoveCleanup();
      });
    } else if (kind === 'form') {
      this.catalog.getForm(id).subscribe(doc => {
        const nid = id + '-copy-' + Date.now().toString(36);
        const copy: any = { ...doc, id: nid, name: (doc.name || id) + ' (copie)' };
        this.catalog.saveForm(copy).subscribe(() => this.acl.setResourceWorkspace('form', nid, dest));
        this.afterMoveCleanup();
      });
    } else {
      this.websites.getById(id).subscribe(site => {
        if (!site) return;
        const nid = site.id + '-copy-' + Date.now().toString(36);
        const copy: Website = { ...site, id: nid, name: (site.name || site.id) + ' (copie)', slug: (site.slug || site.id) + '-copy' };
        this.websites.upsert(copy).subscribe(() => this.acl.setResourceWorkspace('website', nid, dest));
        this.afterMoveCleanup();
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
