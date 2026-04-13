import { CommonModule } from '@angular/common';
import { Component, NgZone, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AccessControlService } from '../../services/access-control.service';
import { CatalogService, CredentialDoc, AppProvider } from '../../services/catalog.service';
import { FormTableViewerComponent } from '../../modules/dynamic-form/components/table-viewer/table-viewer';
import { CredentialEditDialogComponent } from './credential-edit-dialog.component';

@Component({
  selector: 'credential-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, FormTableViewerComponent, CredentialEditDialogComponent],
  template: `
    <div class="viewer" *ngIf="doc as d">
      <div class="page-header">
        <div class="left">
          <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="card-title left">
            <span class="t">Credential</span>
            <span class="s">{{ d.name || 'Détails' }}</span>
          </div>
        </div>
        <div class="actions">
          <button nz-button class="apple-btn" (click)="openProvider()" [disabled]="!d.providerId" title="Ouvrir l'application">
            <i class="fa-regular fa-eye"></i>
            <span class="label">App</span>
          </button>
          <button nz-button class="apple-btn" (click)="edit()" [disabled]="!canEdit" title="Édition">
            <i class="fa-regular fa-pen-to-square"></i>
            <span class="label">Édition</span>
          </button>
          <button nz-button class="apple-btn" (click)="duplicate()" [disabled]="!canEdit" title="Dupliquer">
            <i class="fa-regular fa-copy"></i>
            <span class="label">Dupliquer</span>
          </button>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="panel hero span-2" *ngIf="provider as p; else providerFallback">
          <div class="hero-main">
            <div class="icon" [style.background]="p.color || '#f3f4f6'">
              <i *ngIf="p.iconClass" [class]="p.iconClass"></i>
              <img *ngIf="!p.iconClass && p.iconUrl" [src]="p.iconUrl" alt="icon"/>
              <img *ngIf="!p.iconClass && !p.iconUrl" [src]="simpleIconUrl(p.id)" alt="icon"/>
            </div>
            <div class="hero-meta">
              <div class="hero-title">{{ d.name || 'Credential' }}</div>
              <div class="hero-sub">{{ p.title || p.name }}</div>
            </div>
          </div>
          <div class="hero-chips">
            <span class="chip">{{ p.id }}</span>
            <span class="chip ws">{{ d.workspaceId }}</span>
          </div>
        </div>

        <ng-template #providerFallback>
          <div class="panel hero span-2">
            <div class="hero-main">
              <div class="icon fallback">
                <span>{{ (d.providerId || d.name || 'C') | slice:0:1 | uppercase }}</span>
              </div>
              <div class="hero-meta">
                <div class="hero-title">{{ d.name || 'Credential' }}</div>
                <div class="hero-sub">{{ d.providerId || 'Provider inconnu' }}</div>
              </div>
            </div>
            <div class="hero-chips">
              <span class="chip">{{ d.providerId || '—' }}</span>
              <span class="chip ws">{{ d.workspaceId }}</span>
            </div>
          </div>
        </ng-template>

        <div class="panel">
          <div class="panel-title">Général</div>
          <div class="kv">
            <div><span class="k">ID</span><span class="v mono">{{ d.id || '—' }}</span></div>
            <div><span class="k">Nom</span><span class="v">{{ d.name || '—' }}</span></div>
            <div><span class="k">Workspace</span><span class="v mono">{{ d.workspaceId || '—' }}</span></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Provider</div>
          <div class="kv">
            <div><span class="k">Nom</span><span class="v">{{ provider?.title || provider?.name || '—' }}</span></div>
            <div><span class="k">ID</span><span class="v"><span class="chip">{{ provider?.id || d.providerId || '—' }}</span></span></div>
            <div><span class="k">Application</span><span class="v">
              <button nz-button class="link-btn" (click)="openProvider()" [disabled]="!d.providerId">Ouvrir l'app</button>
            </span></div>
          </div>
        </div>

        <div class="panel span-2" *ngIf="provider?.credentialsForm as schema">
          <div class="panel-title">Valeurs configurées</div>
          <div class="table-wrap">
            <df-table-viewer [schema]="schema" [value]="d.values || {}"></df-table-viewer>
          </div>
        </div>
      </div>

      <credential-edit-dialog [visible]="editVisible" [provider]="provider" [doc]="editDoc" [workspaceId]="d.workspaceId || null" (closed)="editVisible=false" (saved)="onSaved($event)"></credential-edit-dialog>
    </div>
  `,
  styles: [`
    .viewer {
      --card-bg: #ffffff;
      --card-border: #e6ebf2;
      --ink: #0f172a;
      --muted: #64748b;
      padding: 14px;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      max-width: 1080px;
      margin: 0 auto;
    }

    .page-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      margin-bottom: 14px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 10px 12px;
      box-shadow: none;
    }
    .page-header .left { display:flex; align-items:flex-start; gap:0; min-width: 0; }
    .icon-btn.back {
      width:32px;
      height:32px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:0;
      background:transparent;
      border-radius:8px;
      cursor:pointer;
    }
    .icon-btn.back:hover { background: #f1f5f9; }
    .actions { display:flex; gap:8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
    .apple-btn {
      border: 1px solid #e5e7eb;
      background: #fff;
      border-radius: 10px;
      color: #111;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px;
      box-shadow: none;
    }
    .apple-btn:hover:not([disabled]) { border-color:#f9a8d4; background: rgba(230,25,130,0.1); color:#e61982; }
    .apple-btn[disabled] { opacity: .55; cursor: not-allowed; }
    @media (max-width: 640px) {
      .page-header { flex-direction: row; align-items: flex-start; }
      .page-header .left { flex: 1 1 auto; min-width: 0; }
      .actions { margin-left: auto; justify-content: flex-end; flex-wrap: nowrap; gap: 6px; }
      .actions .apple-btn {
        width: 34px;
        height: 34px;
        min-width: 34px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .apple-btn .label { display:none; }
    }
    .card-title { display:flex; flex-direction:column; align-items:center; line-height:1.2; min-width: 0; }
    .card-title.left { align-items:flex-start; text-align:left; }
    .card-title .t { font-weight:700; font-size:14px; color: var(--ink); }
    .card-title .s { font-size:12px; color:var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    .grid { display:grid; gap:14px; width: 100%; min-width: 0; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid .span-2 { grid-column: span 2; }
    @media (max-width: 960px) {
      .grid.cols-2 { grid-template-columns: 1fr; }
      .grid .span-2 { grid-column: span 1; }
    }

    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
      min-width: 0;
      box-shadow: none;
    }
    .panel-title {
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 10px;
      color: #475569;
      display:flex;
      align-items:center;
      gap:8px;
    }

    .hero {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .hero-main {
      min-width: 0;
      display:flex;
      align-items:center;
      gap: 12px;
      flex: 1 1 auto;
    }
    .hero-meta { min-width: 0; }
    .hero-title {
      color: var(--ink);
      font-weight: 700;
      font-size: 15px;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hero-sub {
      color: var(--muted);
      font-size: 12px;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hero-chips { display:inline-flex; align-items:center; gap: 8px; flex-wrap: wrap; }

    .icon {
      width:48px;
      height:48px;
      border-radius:10px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
      align-self:flex-start;
      flex: 0 0 auto;
    }
    .icon.fallback { background: #f1f5f9; color:#334155; font-weight: 700; }
    .icon img { width: 28px; height: 28px; object-fit: contain; display:block; }
    .icon i { font-size: 22px; line-height: 1; color: #111; display:block; }

    .chip {
      background:#f5f5f5;
      border:1px solid #eaeaea;
      color:#444;
      border-radius:999px;
      padding:2px 8px;
      font-size:11px;
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chip.ws { color:#6b7280; }

    .kv { display:flex; flex-direction:column; gap:8px; }
    .kv > div {
      display:grid;
      grid-template-columns: 120px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      padding: 9px 10px;
      border: 1px solid #edf1f6;
      border-radius: 12px;
      background: #f8fafc;
    }
    .kv .k {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      font-weight: 700;
      display:inline-block;
    }
    .kv .v { color: var(--ink); min-width: 0; overflow-wrap: anywhere; }
    .kv .v.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
    @media (max-width: 640px) {
      .kv > div { grid-template-columns: 90px minmax(0, 1fr); gap: 8px; }
    }

    .link-btn {
      border: 1px solid #dbe3ee;
      border-radius: 10px;
      box-shadow: none;
      font-size: 12px;
      height: 30px;
      padding: 0 10px;
    }

    .table-wrap {
      width: 100%;
      min-width: 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  `]
})
export class CredentialViewerComponent implements OnInit {
  doc?: CredentialDoc;
  provider?: AppProvider;
  editVisible = false;
  editDoc: CredentialDoc | null = null;
  constructor(private route: ActivatedRoute, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService, private catalog: CatalogService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id') || '';
    if (!id) { this.router.navigateByUrl('/credentials'); return; }
    this.catalog.getCredential(id).subscribe({
      next: d => this.zone.run(() => {
        const can = this.acl.currentUser()?.role === 'admin' || this.acl.canAccessWorkspace(d.workspaceId);
        if (!can) { this.router.navigateByUrl('/not-authorized'); return; }
        this.doc = d;
        this.catalog.getApp(d.providerId).subscribe(p => this.zone.run(() => { this.provider = p; try { this.cdr.detectChanges(); } catch {} }));
        try { this.cdr.detectChanges(); } catch {}
      }),
      error: () => this.router.navigateByUrl('/credentials')
    });
  }
  back() { history.back(); }
  openProvider() { if (this.doc?.providerId) this.router.navigate(['/apps/viewer'], { queryParams: { id: this.doc.providerId } }); }
  get canEdit() { return (this.acl.currentUser()?.role === 'admin') || (this.doc && this.acl.canAccessWorkspace(this.doc.workspaceId)); }
  edit() { if (!this.canEdit) return; this.editDoc = this.doc || null; this.editVisible = true; }
  duplicate() { if (!this.canEdit || !this.doc) return; this.editDoc = { ...this.doc, id: '', name: (this.doc.name || '') + ' (copie)' }; this.editVisible = true; }
  onSaved(out: CredentialDoc) { this.editVisible = false; this.doc = out; try { this.cdr.detectChanges(); } catch {} }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
}
