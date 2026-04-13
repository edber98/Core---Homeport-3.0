import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CatalogService, AppProvider, CredentialSummary, CredentialDoc } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { Subscription } from 'rxjs';
import { FormTableViewerComponent } from '../../modules/dynamic-form/components/table-viewer/table-viewer';
import { RecordsTableComponent } from '../../modules/dynamic-form/components/records-table/records-table';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'app-provider-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, FormTableViewerComponent, RecordsTableComponent, DynamicForm],
  template: `
  <div class="viewer" *ngIf="app as a">
    <div class="header">
      <div class="left">
        <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left"><span class="t">App</span><span class="s">{{ a.name }}</span></div>
      </div>
      <div class="actions">
        <button type="button" class="icon-ghost" *ngIf="app?.id" (click)="edit()" [disabled]="!isAdmin" title="Édition"><i class="fa-regular fa-pen-to-square"></i></button>
        <button type="button" class="icon-ghost" *ngIf="app?.id" (click)="duplicate()" [disabled]="!isAdmin" title="Dupliquer"><i class="fa-regular fa-copy"></i></button>
      </div>
    </div>
    <div class="content">
      <div class="left-pane">
        <div class="icon" [style.background]="a.color || '#f3f4f6'">
          <img *ngIf="a.iconUrl" [src]="a.iconUrl" alt="icon"/>
          <i *ngIf="!a.iconUrl && a.iconClass" [class]="a.iconClass" [style.color]="fgColor(a.color)"></i>
          <img *ngIf="!a.iconUrl && !a.iconClass" [src]="simpleIconUrl(a.id)" alt="icon"/>
        </div>
        <div class="kv">
          <div><span class="k">ID</span><span class="v">{{ a.id }}</span></div>
          <div><span class="k">Nom</span><span class="v">{{ a.name }}</span></div>
          <div *ngIf="a.title"><span class="k">Titre</span><span class="v">{{ a.title }}</span></div>
          <div *ngIf="a.tags?.length"><span class="k">Tags</span><span class="v tags"><nz-tag *ngFor="let t of a.tags">{{ t }}</nz-tag></span></div>
          <div><span class="k">Credentials</span>
            <span class="v">{{ a.hasCredentials ? 'Oui' : 'Non' }}</span>
          </div>
          <div *ngIf="a.hasCredentials"><span class="k">Sans credentials</span>
            <span class="v">{{ a.allowWithoutCredentials ? 'Autorisé' : 'Interdit' }}</span>
          </div>
          <div *ngIf="a.credentialsForm && showCreds">
            <span class="k">Identifiants</span>
            <span class="v wide" style="display:block; overflow-x:auto;">
              <df-records-table [schema]="$any(a.credentialsForm)" [records]="credentialRecords"></df-records-table>
            </span>
          </div>
        </div>
      </div>
      <div class="right-pane" *ngIf="a.credentialsForm as schema">
        <div class="pane-title">Preview</div>
        <div class="form-preview">
          <app-dynamic-form [schema]="schema" [value]="{}" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .viewer { padding: 12px; max-width: 980px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .header .left { display:flex; align-items:left; gap:0px; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .actions { display:flex; gap:8px; }
    .icon-ghost { border:0; background:transparent; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; color:#111; cursor:pointer; }
    .icon-ghost[disabled] { opacity:.5; cursor:not-allowed; }
    .icon-ghost:hover { background:#f5f5f5; }
    .card-title { display:flex; flex-direction:column; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .content { display:grid; grid-template-columns: 1fr 1fr; gap:14px; align-items:flex-start; }
    .left-pane { display:flex; gap:12px; align-items:flex-start; }
    .icon { width:64px; height:64px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; align-self:flex-start; }
    .icon img { width: 36px; height: 36px; object-fit: contain; display:block; }
    .icon i { font-size: 28px; line-height: 1; color: #111; display:block; }
    .kv { display:flex; flex-direction:column; gap:10px; }
    .kv .k { color:#6b7280; width:120px; display:inline-block; }
    .kv .v { color:#111; }
    .kv .v.wide { width: 100%; margin: 10px 0; }
    .kv .v.tags { display:inline-flex; gap:6px; flex-wrap:wrap; }
    .right-pane { width: 100%; }
    .pane-title { font-weight:600; margin: 4px 0 6px; color:#374151; }
    .form-preview { pointer-events: none; user-select: none; }
    @media (max-width: 860px) { .content { grid-template-columns: 1fr; } }
  `]
})
export class AppProviderViewerComponent implements OnInit, OnDestroy {
  app?: AppProvider;
  credentialRecords: Array<Record<string, any>> = [];
  private aclSub?: Subscription;
  constructor(private catalog: CatalogService, private route: ActivatedRoute, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService) {}
  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  get showCreds(): boolean { return !!this.isAdmin || this.acl.canAccessWorkspace(this.acl.currentWorkspaceId()); }
  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id') || '';
    if (id) this.catalog.getApp(id).subscribe(a => this.zone.run(() => {
      this.app = a;
      try { this.cdr.detectChanges(); } catch {}
      this.loadCredentials();
    }));
    try { this.aclSub = this.acl.changes$.subscribe(() => this.zone.run(() => { this.loadCredentials(); try { this.cdr.detectChanges(); } catch {} })); } catch {}
  }
  ngOnDestroy(): void { try { this.aclSub?.unsubscribe(); } catch {} }
  private loadCredentials() {
    try {
      const providerId = this.app?.id || '';
      if (!providerId) return;
      const ws = this.acl.currentWorkspaceId();
      if (!ws) return;
      this.catalog.listCredentials(ws, providerId).subscribe((list: CredentialSummary[]) => {
        const recs: Array<Record<string, any>> = [];
        let remaining = (list || []).length;
        if (!remaining) { this.zone.run(() => { this.credentialRecords = []; try { this.cdr.detectChanges(); } catch {} }); return; }
        (list || []).forEach(s => {
          this.catalog.getCredential(s.id).subscribe(doc => {
            const merged: Record<string, any> = { __name: doc?.name || s.name };
            Object.assign(merged, (doc?.values || {}));
            recs.push(merged);
            remaining--;
            if (remaining <= 0) this.zone.run(() => { this.credentialRecords = recs; try { this.cdr.detectChanges(); } catch {} });
          }, () => {
            remaining--;
            if (remaining <= 0) this.zone.run(() => { this.credentialRecords = recs; try { this.cdr.detectChanges(); } catch {} });
          });
        });
      });
    } catch {}
  }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
  fgColor(bg?: string | null): string {
    const b = String(bg || '#e61982');
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let s = hex.trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const num = parseInt(s, 16);
    return { r: (num>>16)&255, g: (num>>8)&255, b: num&255 };
  }
  back() { history.back(); }
  edit() { if (this.app?.id) this.router.navigate(['/apps/editor'], { queryParams: { id: this.app.id } }); }
  duplicate() { if (this.app?.id) this.router.navigate(['/apps/editor'], { queryParams: { duplicateFrom: this.app.id } }); }
}
