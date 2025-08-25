import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationsBackendService, BackendNotification } from '../../services/notifications-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';

@Component({
  selector: 'notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Surveillance des éléments (flows, credentials, templates…).</p>
        </div>
        <div class="actions">
          <select [(ngModel)]="entityType" (ngModelChange)="reload()">
            <option value="">type: tous</option>
            <option *ngFor="let t of entityTypes" [value]="t">{{ t }}</option>
          </select>
          <select [(ngModel)]="acknowledged" (ngModelChange)="reload()">
            <option value="">état: tous</option>
            <option value="false">non lus</option>
            <option value="true">lus</option>
          </select>
          <input [(ngModel)]="q" (keyup.enter)="reload()" placeholder="Rechercher (code, message)" class="search" />
          <select [(ngModel)]="sort" (ngModelChange)="reload()">
            <option value="createdAt:desc">plus récents</option>
            <option value="createdAt:asc">plus anciens</option>
          </select>
          <button (click)="reload()">Filtrer</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4,5]"></div>
        </div>
      </div>
      <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="grid" *ngIf="!loading && !error">
        <div class="card" *ngFor="let n of items">
          <div class="left">
            <div class="sev" [ngClass]="n.severity || 'info'"></div>
          </div>
          <div class="content" (click)="open(n)">
            <div class="title-row">
              <div class="name">{{ n.code || 'notification' }}</div>
              <span class="chip" *ngIf="n.entityType">{{ n.entityType }}</span>
              <span class="chip" *ngIf="n.acknowledged">lu</span>
            </div>
            <div class="desc">{{ n.message }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="ack(n, $event)" [disabled]="n.acknowledged" title="Marquer lu"><i class="fa-regular fa-envelope-open"></i></button>
            <button class="icon-btn" (click)="del(n, $event)" title="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
        <div *ngIf="!items.length" class="empty">Aucun élément trouvé.</div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .actions { display:flex; align-items:center; gap:8px; flex-wrap: wrap; }
    .search { width: 220px; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; }
    .grid { display:grid; grid-template-columns: 1fr; gap: 10px; }
    .card { display:flex; align-items:center; gap:10px; padding:10px; border-radius:12px; border:1px solid #ececec; background:#fff; }
    .left .sev { width:8px; height: 40px; border-radius: 6px; }
    .sev.info { background:#1677ff; }
    .sev.warning { background:#f59e0b; }
    .sev.error, .sev.critical { background:#ef4444; }
    .content { flex:1; min-width: 0; cursor:pointer; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight:600; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .trailing .icon-btn { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
    .empty { color:#6b7280; }
    .loading .skeleton-grid { display:grid; grid-template-columns: 1fr; gap:10px; }
    .skeleton-card { height: 56px; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
  `]
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  items: BackendNotification[] = [];
  loading = false;
  error: string | null = null;
  entityTypes = ['company','flow','workspace','template','app','credential'];
  entityType = '';
  acknowledged = '';
  sort = 'createdAt:desc';
  q = '';
  get wsId() { return this.acl.currentWorkspaceId(); }
  private sub: any;
  constructor(private api: NotificationsBackendService, private acl: AccessControlService, private ui: UiMessageService, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.reload();
    try { this.sub = this.acl.changes$.subscribe(() => this.zone.run(() => { this.reload(); try { this.cdr.detectChanges(); } catch {} })); } catch {}
  }
  ngOnDestroy(): void { try { this.sub?.unsubscribe?.(); } catch {} }
  reload() {
    this.loading = true; this.error = null;
    const wsRaw = this.wsId;
    const ws = (wsRaw && /^[a-fA-F0-9]{24}$/.test(String(wsRaw))) ? wsRaw : undefined;
    const ack = (this.acknowledged === '' ? undefined : (this.acknowledged as 'true'|'false'));
    this.api.list({ workspaceId: ws, entityType: this.entityType || undefined, acknowledged: ack, q: this.q || undefined, sort: this.sort, page: 1, limit: 50 }).subscribe({
      next: l => this.items = (l || []).map((n: any) => ({ ...n, id: String(n.id || n._id || '') })),
      error: () => { this.error = 'Chargement des notifications échoué'; },
      complete: () => { this.loading = false; }
    });
  }
  ack(n: BackendNotification, ev: MouseEvent) { ev.stopPropagation(); if (n.acknowledged) return; const id = (n as any).id; if (!id || !/^[a-fA-F0-9]{24}$/.test(String(id))) { this.ui.error('Identifiant invalide'); return; } this.api.ack(id).subscribe({ next: () => { n.acknowledged = true; this.ui.success('Marquée comme lue'); }, error: () => this.ui.error('Échec marquage') }); }
  del(n: BackendNotification, ev: MouseEvent) { ev.stopPropagation(); const id = (n as any).id; if (!id || !/^[a-fA-F0-9]{24}$/.test(String(id))) { this.ui.error('Identifiant invalide'); return; } this.api.delete(id).subscribe({ next: () => { this.items = this.items.filter(x => x.id !== n.id); this.ui.success('Supprimée'); }, error: () => this.ui.error('Échec suppression') }); }
  open(n: BackendNotification) { if (n.link) { /* could navigate here */ } }
}
