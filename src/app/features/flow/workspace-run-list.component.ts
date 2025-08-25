import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RunsBackendService, BackendRun } from '../../services/runs-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';

@Component({
  selector: 'workspace-run-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Historique des exécutions</h1>
          <p>Workspace courant: {{ wsId }}</p>
        </div>
        <div class="actions">
          <select [(ngModel)]="status" (ngModelChange)="reload()">
            <option value="">status: tous</option>
            <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
          </select>
          <input [(ngModel)]="q" (keyup.enter)="reload()" placeholder="Rechercher (flow)" class="search" />
          <select [(ngModel)]="sort" (ngModelChange)="reload()">
            <option value="createdAt:desc">plus récents</option>
            <option value="createdAt:asc">plus anciens</option>
          </select>
          <button (click)="reload()">Filtrer</button>
        </div>
      </div>

      <div class="grid">
        <div class="card" *ngFor="let r of runs" (click)="open(r)">
          <div class="content">
            <div class="title-row">
              <div class="name">Run #{{ r.id }}</div>
              <span class="chip st">{{ r.status }}</span>
            </div>
            <div class="desc">flow: {{ r.flowId }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="cancel(r, $event)" title="Annuler"><i class="fa-solid fa-ban"></i></button>
          </div>
        </div>
        <div *ngIf="!runs.length" class="empty">Aucune exécution</div>
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
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
    .card { display:flex; align-items:center; gap:14px; padding:12px; border-radius:12px; background:#fff; border:1px solid #ececec; cursor:pointer; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight:600; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .trailing .icon-btn { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
    .empty { color:#6b7280; }
  `]
})
export class WorkspaceRunListComponent implements OnInit {
  runs: BackendRun[] = [];
  statuses = ['queued','running','success','error','cancelled','timed_out','partial_success'];
  status = '';
  sort = 'createdAt:desc';
  q = '';
  get wsId() { return this.acl.currentWorkspaceId(); }
  constructor(private runsApi: RunsBackendService, private acl: AccessControlService, private router: Router, private ui: UiMessageService) {}
  ngOnInit(): void { this.reload(); }
  reload() {
    this.runsApi.listByWorkspace(this.wsId, { status: this.status || undefined, q: this.q || undefined, sort: this.sort, page: 1, limit: 50 }).subscribe({
      next: l => this.runs = l || [],
      error: () => this.ui.error('Chargement des exécutions échoué'),
    });
  }
  open(r: BackendRun) {
    const flowId = r.flowId;
    if (flowId) this.router.navigate(['/flow-builder','executions'], { queryParams: { flow: flowId } });
  }
  cancel(r: BackendRun, ev: MouseEvent) { ev.stopPropagation(); this.runsApi.cancel(r.id).subscribe({ next: () => { this.ui.success('Annulation demandée'); this.reload(); }, error: () => this.ui.error('Échec annulation') }); }
}
