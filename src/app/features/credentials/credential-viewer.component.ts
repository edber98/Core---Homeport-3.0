import { CommonModule } from '@angular/common';
import { Component, NgZone, ChangeDetectorRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AccessControlService } from '../../services/access-control.service';
import { CatalogService, CredentialDoc, AppProvider } from '../../services/catalog.service';
import { FormTableViewerComponent } from '../../modules/dynamic-form/components/table-viewer/table-viewer';
import { CredentialEditDialogComponent } from './credential-edit-dialog.component';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'credential-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzTagModule, FormTableViewerComponent, CredentialEditDialogComponent, DynamicForm],
  template: `
    <div class="viewer" *ngIf="doc as d">
      <div class="header">
        <div class="left">
          <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
          <div class="card-title left"><span class="t">Credential</span><span class="s">{{ d.name }}</span></div>
        </div>
        <div class="actions">
          <button nz-button class="apple-btn" (click)="openProvider()"><i class="fa-regular fa-eye"></i><span class="label">App</span></button>
          <button nz-button class="apple-btn" nzType="primary" (click)="edit()" [disabled]="!canEdit"><i class="fa-regular fa-pen-to-square"></i><span class="label">Édition</span></button>
          <button nz-button class="apple-btn" (click)="duplicate()" [disabled]="!canEdit"><i class="fa-regular fa-copy"></i><span class="label">Dupliquer</span></button>
        </div>
      </div>
      <div class="content" *ngIf="provider as p">
        <div class="left-pane">
          <div class="icon" [style.background]="p.color || '#f3f4f6'">
            <i *ngIf="p.iconClass" [class]="p.iconClass"></i>
            <img *ngIf="!p.iconClass && p.iconUrl" [src]="p.iconUrl" alt="icon"/>
            <img *ngIf="!p.iconClass && !p.iconUrl" [src]="simpleIconUrl(p.id)" alt="icon"/>
          </div>
          <div class="kv">
            <div><span class="k">ID</span><span class="v">{{ d.id }}</span></div>
            <div><span class="k">Nom</span><span class="v">{{ d.name }}</span></div>
            <div><span class="k">Provider</span><span class="v">{{ p.title || p.name }} <span class="chip">{{ p.id }}</span></span></div>
            <div><span class="k">Workspace</span><span class="v">{{ d.workspaceId }}</span></div>
          </div>
        </div>
      </div>
      <div class="schema" *ngIf="provider?.credentialsForm as schema">
        <df-table-viewer [schema]="schema" [value]="d.values || {}"></df-table-viewer>
      </div>
      <credential-edit-dialog [visible]="editVisible" [provider]="provider" [doc]="editDoc" [workspaceId]="doc?.workspaceId || null" (closed)="editVisible=false" (saved)="onSaved($event)"></credential-edit-dialog>
    </div>
  `,
  styles: [`
    .viewer { padding: 12px; max-width: 980px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .header .left { display:flex; align-items:left; gap:0px; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .actions { display:flex; gap:8px; }
    .apple-btn[disabled] { opacity: .55; filter: grayscale(1); cursor: not-allowed; }
    @media (max-width: 640px) { .apple-btn .label { display:none; } }
    .card-title { display:flex; flex-direction:column; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .content { display:flex; gap:14px; align-items:flex-start; }
    .left-pane { display:flex; gap:12px; align-items:flex-start; }
    .icon { width:48px; height:48px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; align-self:flex-start; }
    .icon img { width: 28px; height: 28px; object-fit: contain; display:block; }
    .icon i { font-size: 22px; line-height: 1; color: #111; display:block; }
    .kv { display:flex; flex-direction:column; gap:8px; }
    .kv .k { color:#6b7280; width:140px; display:inline-block; }
    .kv .v { color:#111; }
    .kv .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; margin-left:6px; }
    .pane-title { font-weight:600; margin: 4px 0 6px; color:#374151; }
    .right-pane { flex:1; min-width: 360px; }
    .form-preview { pointer-events: none; user-select: none; }
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
