import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsBackendService, BackendNotification } from '../../services/notifications-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'notifications-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzTableModule, NzTagModule, NzButtonModule, NzBadgeModule,
    NzEmptyModule, NzSpinModule, NzSelectModule,
    NzIconModule, NzToolTipModule, NzPopconfirmModule,
  ],
  template: `
  <div class="notif-page">
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h2>Notifications</h2>
          <span class="subtitle">Surveillance des éléments (flows, credentials, templates…)</span>
        </div>
        <div class="header-actions">
          <button nz-button nzType="default" (click)="ackAll()" [disabled]="!hasUnread" nz-tooltip nzTooltipTitle="Tout marquer comme lu">
            <i class="fa-regular fa-envelope-open"></i> Tout marquer comme lu
          </button>
          <button nz-button nzType="primary" class="primary" (click)="reload()">
            <span nz-icon nzType="reload"></span> Actualiser
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">Sévérité</span>
          <nz-select [(ngModel)]="severityFilter" (ngModelChange)="reload()" nzPlaceHolder="Toutes" nzAllowClear style="width: 140px">
            <nz-option nzValue="info" nzLabel="Info"></nz-option>
            <nz-option nzValue="warning" nzLabel="Avertissement"></nz-option>
            <nz-option nzValue="error" nzLabel="Erreur"></nz-option>
            <nz-option nzValue="critical" nzLabel="Critique"></nz-option>
          </nz-select>
        </div>
        <div class="filter-group">
          <span class="filter-label">Type</span>
          <nz-select [(ngModel)]="entityType" (ngModelChange)="reload()" nzPlaceHolder="Tous" nzAllowClear style="width: 140px">
            <nz-option *ngFor="let t of entityTypes" [nzValue]="t" [nzLabel]="entityTypeLabel(t)"></nz-option>
          </nz-select>
        </div>
        <div class="filter-group">
          <span class="filter-label">État</span>
          <nz-select [(ngModel)]="acknowledged" (ngModelChange)="reload()" nzPlaceHolder="Tous" nzAllowClear style="width: 120px">
            <nz-option nzValue="false" nzLabel="Non lus"></nz-option>
            <nz-option nzValue="true" nzLabel="Lus"></nz-option>
          </nz-select>
        </div>
      </div>

      <!-- Table -->
      <nz-spin [nzSpinning]="loading">
        <nz-table
          #notifTable
          [nzData]="items"
          [nzFrontPagination]="false"
          [nzTotal]="total"
          [nzPageIndex]="pageIndex"
          [nzPageSize]="pageSize"
          [nzShowSizeChanger]="true"
          [nzPageSizeOptions]="[10, 20, 50]"
          (nzPageIndexChange)="onPageIndexChange($event)"
          (nzPageSizeChange)="onPageSizeChange($event)"
          nzSize="middle"
          [nzNoResult]="emptyTpl"
          [nzShowTotal]="totalTpl"
        >
          <thead>
            <tr>
              <th nzWidth="80px">Sévérité</th>
              <th>Code</th>
              <th>Message</th>
              <th nzWidth="100px">Type</th>
              <th nzWidth="100px">État</th>
              <th nzWidth="140px">Date</th>
              <th nzWidth="140px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let n of notifTable.data" [class.row-unread]="!n.acknowledged">
              <td>
                <nz-tag [nzColor]="severityColor(n.severity)">{{ severityLabel(n.severity) }}</nz-tag>
              </td>
              <td class="code-cell">{{ n.code || '—' }}</td>
              <td class="msg-cell">{{ n.message || '—' }}</td>
              <td>
                <nz-tag *ngIf="n.entityType">{{ entityTypeLabel(n.entityType) }}</nz-tag>
              </td>
              <td>
                <nz-badge *ngIf="!n.acknowledged" nzStatus="processing" nzText="Non lu"></nz-badge>
                <span *ngIf="n.acknowledged" class="read-label">Lu</span>
              </td>
              <td class="date-cell">{{ relativeTime(n.createdAt) }}</td>
              <td>
                <div class="action-btns">
                  <button nz-button nzSize="small" nzType="text" (click)="open(n)" *ngIf="n.link" nz-tooltip nzTooltipTitle="Ouvrir">
                    <span nz-icon nzType="link"></span>
                  </button>
                  <button nz-button nzSize="small" nzType="text" (click)="ack(n)" [disabled]="n.acknowledged" nz-tooltip nzTooltipTitle="Marquer comme lu">
                    <i class="fa-regular fa-envelope-open"></i>
                  </button>
                  <button nz-button nzSize="small" nzType="text" nzDanger nz-popconfirm nzPopconfirmTitle="Supprimer cette notification ?" (nzOnConfirm)="del(n)">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </nz-table>
      </nz-spin>

      <ng-template #emptyTpl>
        <nz-empty nzNotFoundContent="Aucune notification trouvée"></nz-empty>
      </ng-template>
      <ng-template #totalTpl let-total let-range="range">
        {{ range[0] }}-{{ range[1] }} sur {{ total }} notifications
      </ng-template>
    </div>
  </div>
  `,
  styles: [`
    .notif-page { padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .header-left h2 { margin: 0; font-size: 22px; font-weight: 600; }
    .header-left .subtitle { color: #8c8c8c; font-size: 13px; }
    .header-actions { display: flex; gap: 8px; }
    .header-actions .primary { background:#1677ff; border-color:#1677ff; color:#fff; }
    .filters { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: 6px; }
    .filter-label { font-size: 12px; color: #8c8c8c; white-space: nowrap; }
    .search-group { margin-left: auto; }
    .row-unread { background: #f0f5ff; }
    .code-cell { font-weight: 500; font-size: 13px; }
    .msg-cell { font-size: 13px; color: #595959; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .date-cell { font-size: 12px; color: #8c8c8c; white-space: nowrap; }
    .read-label { color: #8c8c8c; font-size: 12px; }
    .action-btns { display: flex; gap: 2px; }
    .container { overflow-x: hidden; }
    @media (max-width: 768px) {
      .notif-page { padding: 8px; }
      .page-header { flex-direction: column; align-items: flex-start; gap: 8px; }
      .header-left h2 { font-size: 18px; }
      .filters { flex-direction: column; align-items: flex-start; gap: 8px; }
      .search-group { margin-left: 0; width: 100%; }
      .msg-cell { max-width: 120px; font-size: 12px; }
      .code-cell { font-size: 12px; }
      .date-cell { font-size: 11px; }
      .action-btns button { padding: 0 4px !important; }
    }
    @media (max-width: 480px) {
      .notif-page { padding: 4px; }
      .msg-cell { max-width: 80px; font-size: 11px; }
      .code-cell { font-size: 11px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .header-left h2 { font-size: 16px; }
      .filter-group { width: 100%; }
    }
  `]
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  items: (BackendNotification & { createdAt?: string })[] = [];
  loading = false;
  error: string | null = null;
  entityTypes = ['company', 'flow', 'workspace', 'template', 'app', 'credential'];
  entityType: string | null = null;
  acknowledged: string | null = null;
  severityFilter: string | null = null;
  sort = 'createdAt:desc';
  pageIndex = 1;
  pageSize = 20;
  total = 0;
  unreadTotal = 0;
  private fetchSub?: Subscription;
  private lastWorkspaceId = '';
  private loadingFailsafe?: any;

  get wsId() { return this.acl.currentWorkspaceId(); }
  get hasUnread() { return this.unreadTotal > 0; }
  private sub?: Subscription;

  constructor(
    private api: NotificationsBackendService,
    private acl: AccessControlService,
    private ui: UiMessageService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.lastWorkspaceId = String(this.wsId || '');
    this.reload();
    try {
      this.sub = this.acl.changes$.subscribe(() => this.zone.run(() => {
        const wsIdNow = String(this.wsId || '');
        if (wsIdNow === this.lastWorkspaceId) return;
        this.lastWorkspaceId = wsIdNow;
        this.reload();
        try { this.cdr.detectChanges(); } catch {}
      }));
    } catch {}
  }

  ngOnDestroy(): void {
    try { this.sub?.unsubscribe(); } catch {}
    try { this.fetchSub?.unsubscribe(); } catch {}
    try { if (this.loadingFailsafe) clearTimeout(this.loadingFailsafe); } catch {}
  }

  reload(resetPage = true) {
    if (resetPage) this.pageIndex = 1;
    this.refreshTotalCount();
    this.fetchPage();
  }

  onPageIndexChange(page: number) {
    const next = Math.max(1, Number(page) || 1);
    if (next === this.pageIndex) return;
    this.pageIndex = next;
    this.fetchPage();
  }

  onPageSizeChange(size: number) {
    const next = Math.max(1, Number(size) || 20);
    if (next === this.pageSize) return;
    this.pageSize = next;
    this.pageIndex = 1;
    this.fetchPage();
  }

  private fetchPage() {
    try { this.fetchSub?.unsubscribe(); } catch {}
    try { if (this.loadingFailsafe) clearTimeout(this.loadingFailsafe); } catch {}
    this.loading = true;
    this.error = null;
    this.loadingFailsafe = setTimeout(() => {
      this.loading = false;
      try { this.cdr.detectChanges(); } catch {}
    }, 10000);
    const ws = String(this.wsId || '').trim();
    if (!ws) {
      this.items = [];
      this.total = 0;
      this.loading = false;
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    const ack = (this.acknowledged == null || this.acknowledged === '') ? undefined : (this.acknowledged as 'true' | 'false');
    this.fetchSub = this.api.list({
      workspaceId: ws,
      entityType: this.entityType || undefined,
      acknowledged: ack,
      severity: this.severityFilter || undefined,
      sort: this.sort,
      page: this.pageIndex,
      limit: this.pageSize,
    }).subscribe({
      next: (resp: any[]) => {
        try { if (this.loadingFailsafe) clearTimeout(this.loadingFailsafe); } catch {}
        const items = (resp || []).map((n: any) => ({
          ...n,
          id: String(n.id || n._id || ''),
          createdAt: n.createdAt || n.updatedAt || '',
        }));
        this.items = items;
        this.refreshUnreadCount();
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      },
      error: () => {
        try { if (this.loadingFailsafe) clearTimeout(this.loadingFailsafe); } catch {}
        this.error = 'Échec du chargement des notifications';
        this.loading = false;
        try { this.cdr.detectChanges(); } catch {}
      },
    });
  }

  private refreshTotalCount() {
    const ws = String(this.wsId || '').trim();
    if (!ws) { this.total = 0; return; }
    const ack = (this.acknowledged == null || this.acknowledged === '') ? undefined : (this.acknowledged as 'true' | 'false');
    this.api.count({
      workspaceId: ws,
      entityType: this.entityType || undefined,
      acknowledged: ack,
      severity: this.severityFilter || undefined,
    }).subscribe({
      next: (n) => { this.total = Math.max(0, Number(n) || 0); },
      error: () => {},
    });
  }

  private refreshUnreadCount() {
    const ws = String(this.wsId || '').trim();
    if (!ws) { this.unreadTotal = 0; return; }
    this.api.count({ workspaceId: ws, acknowledged: 'false' }).subscribe({
      next: (n) => { this.unreadTotal = Math.max(0, Number(n) || 0); },
      error: () => {},
    });
  }

  ack(n: BackendNotification) {
    if (n.acknowledged) return;
    const id = String((n as any).id);
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) { this.ui.error('Identifiant invalide'); return; }
    this.api.ack(id).subscribe({
      next: () => { n.acknowledged = true; this.ui.success('Marquée comme lue'); this.refreshUnreadCount(); },
      error: () => this.ui.error('Échec du marquage'),
    });
  }

  del(n: BackendNotification) {
    const id = String((n as any).id);
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) { this.ui.error('Identifiant invalide'); return; }
    this.api.delete(id).subscribe({
      next: () => {
        this.ui.success('Notification supprimée');
        const shouldGoPrevPage = this.items.length === 1 && this.pageIndex > 1;
        if (shouldGoPrevPage) this.pageIndex -= 1;
        this.refreshTotalCount();
        this.fetchPage();
      },
      error: () => this.ui.error('Échec de la suppression'),
    });
  }

  ackAll() {
    const ws = String(this.wsId || '').trim() || undefined;
    this.api.ackAll(ws).subscribe({
      next: () => {
        this.ui.success('Toutes les notifications marquées comme lues');
        this.fetchPage();
      },
      error: () => this.ui.error('Échec du marquage'),
    });
  }

  open(n: BackendNotification) {
    if (n.link) {
      // Ack first, then navigate
      if (!n.acknowledged) {
        const id = String((n as any).id);
        if (id && /^[a-fA-F0-9]{24}$/.test(id)) {
          this.api.ack(id).subscribe({ next: () => { n.acknowledged = true; this.refreshUnreadCount(); } });
        }
      }
      this.router.navigateByUrl(n.link);
    }
  }

  severityColor(sev?: string): string {
    switch (sev) {
      case 'info': return 'blue';
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'critical': return 'magenta';
      default: return 'blue';
    }
  }

  severityLabel(sev?: string): string {
    switch (sev) {
      case 'info': return 'Info';
      case 'warning': return 'Avertissement';
      case 'error': return 'Erreur';
      case 'critical': return 'Critique';
      default: return 'Info';
    }
  }

  entityTypeLabel(t: string): string {
    switch (t) {
      case 'company': return 'Entreprise';
      case 'flow': return 'Flow';
      case 'workspace': return 'Workspace';
      case 'template': return 'Template';
      case 'app': return 'Application';
      case 'credential': return 'Identifiant';
      default: return t;
    }
  }

  relativeTime(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 0) return 'à l\'instant';
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'à l\'instant';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
