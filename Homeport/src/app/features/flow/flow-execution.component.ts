import { CommonModule } from '@angular/common';
import { Component, NgZone, ElementRef, ViewChild } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FormsModule } from '@angular/forms';
import { FlowRunService, ExecutionRun, ExecutionMode } from '../../services/flow-run.service';
import { RunsBackendService, BackendRun } from '../../services/runs-backend.service';
import { UiMessageService } from '../../services/ui-message.service';
import { FlowPathHighlightService } from '../../services/flow-path-highlight.service';
import { AccessControlService } from '../../services/access-control.service';
import { environment } from '../../../environments/environment';
import { FlowSharedStateService } from '../../services/flow-shared-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ChangeDetectorRef } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { backAwareCurve } from './edge-curves';

@Component({
  selector: 'flow-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowViewerComponent, NzModalModule, NzDrawerModule, NzButtonModule, NzTagModule],
  template: `
  <div class="flow-exec">
    <!-- Reusable left panel content (desktop + drawer) -->
    <ng-template #leftPanelContent>
      <div class="panel-heading">
        <div class="card-title">
          <div class="t">Exécutions</div>
          <div class="s">{{ mode }}</div>
        </div>
      </div>
      <div class="mode-row apple">
        <select class="mode-select" [(ngModel)]="mode">
          <option value="test">test</option>
          <option value="prod">prod</option>
        </select>
        <button nz-button nzSize="small" (click)="onRun()" title="Lancer (local)" aria-label="Lancer (local)"><i class="fa-solid fa-play"></i></button>
        <button nz-button nzType="primary" nzSize="small" (click)="runBackend()" title="Lancer (backend)" aria-label="Lancer (backend)"><i class="fa-solid fa-rocket"></i></button>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="n">{{ flowStats.success || 0 }}</div><div class="l">Réussis</div></div>
        <div class="kpi"><div class="n">{{ flowStats.error || 0 }}</div><div class="l">Erreurs</div></div>
        <div class="kpi"><div class="n">{{ flowStats.cancelled || 0 }}</div><div class="l">Annulés</div></div>
        <div class="kpi"><div class="n">{{ flowStats.running || 0 }}</div><div class="l">En cours</div></div>
        <div class="kpi"><div class="n">{{ flowStats.avgDurationMs != null ? flowStats.avgDurationMs : '–' }}</div><div class="l">Durée moy. (ms)</div></div>
      </div>
      <ul class="exec-list">
        <li *ngFor="let r of visibleRuns" [class.sel]="r === selectedRun" (click)="selectRun(r)">
          <div class="line1">Run #{{ r.runId }} — {{ r.mode }} — {{ r.status }}</div>
          <div class="line2">{{ r.startedAt | date:'short' }} · {{ r.durationMs || 0 }} ms</div>
        </li>
      </ul>
      <div class="panel-subtitle">Historique (backend)</div>
      <div class="exec-list" (scroll)="onListScroll($event)">
        <div class="exec-item" *ngFor="let b of backendFlowRuns; trackBy: trackBackendRun" [class.active]="selectedBackendRun?.id === b.id" (click)="selectBackendRun(b)">
          <div class="row top">
            <div class="left">
              <nz-tag [nzColor]="b.status==='success' ? 'green' : (b.status==='error' ? 'red' : (b.status==='running' ? 'blue' : 'default'))">{{ b.status }}</nz-tag>
              <span class="start" *ngIf="b.startedAt as s">{{ s | date:'medium' }}</span>
            </div>
            <div class="right">
              <button nz-button nzSize="small" (click)="onViewRunClick(b); $event.stopPropagation()" title="Voir détails"><i class="fa-solid fa-eye"></i></button>
              <button nz-button nzSize="small" nzDanger (click)="cancelBackend(b.id); $event.stopPropagation()" title="Annuler"><i class="fa-solid fa-ban"></i></button>
              <button nz-button nzSize="small" (click)="openInEditor(b); $event.stopPropagation()" title="Ouvrir dans l'éditeur"><i class="fa-solid fa-up-right-from-square"></i></button>
            </div>
          </div>
          <div class="row bottom">
            <div class="id mono">ID: {{ b.id }}</div>
            <div class="meta" *ngIf="b.durationMs != null || b.nodesExecuted != null || b.eventsCount != null">
              <span *ngIf="b.durationMs != null">{{ b.durationMs }} ms</span>
              <span *ngIf="b.nodesExecuted != null"> · {{ b.nodesExecuted }} nœuds</span>
              <span *ngIf="b.eventsCount != null"> · {{ b.eventsCount }} évts</span>
            </div>
          </div>
        </div>
        <div class="empty" *ngIf="backendFlowRuns.length===0">Aucune exécution pour ce flow</div>
      </div>
      <div class="attempts" *ngIf="selectedRun as rs">
        <h5>Détails ({{ attemptsLen(rs.attempts) }} nœuds)</h5>
        <div class="attempt" *ngFor="let a of rs.attempts">
          <div class="hdr">
            <span class="nid">{{ a.nodeId }}</span>
            <span class="st" [ngClass]="a.status">{{ a.status }}</span>
            <span class="dur">{{ a.durationMs || 0 }} ms</span>
          </div>
          <div class="io">
            <div>
              <div class="k">input</div>
              <pre>{{ a.input | json }}</pre>
            </div>
            <div>
              <div class="k">args.pre</div>
              <pre>{{ a.argsPre | json }}</pre>
            </div>
            <div>
              <div class="k">args.post</div>
              <pre>{{ a.argsPost | json }}</pre>
            </div>
            <div>
              <div class="k">output</div>
              <pre>{{ a.result | json }}</pre>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
    <aside class="side executions">
      <ng-container [ngTemplateOutlet]="leftPanelContent"></ng-container>
    </aside>
    <section class="viewer">
      <div class="loading-overlay" *ngIf="loadingFlowDoc">
        <div class="spinner"></div>
        <div class="text">Chargement du flow…</div>
      </div>
      <div class="viewer-layout" [class.show-details]="rightPanelOpen">
        <div class="viewer-canvas-wrap">
          <flow-viewer #viewer class="viewer-canvas" [class.panel-open]="rightPanelOpen"
            [nodes]="viewNodes"
            [edges]="viewEdges"
            [background]="flowBackground"
            [portOrientation]="portOrientation"
            [useStorage]="false"
            [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"></flow-viewer>
        </div>
        <aside class="details-panel" *ngIf="rightPanelOpen && selectedBackendRun" #detailsPanel>
          <div class="panel-heading">
            <div class="card-title">
              <div class="t">Exécution</div>
              <div class="s" *ngIf="selectedBackendRun?.startedAt as s">{{ s | date:'medium' }}</div>
              <div class="s mono">ID: {{ selectedBackendRun?.id }}</div>
            </div>
            <div class="spacer"></div>
            <nz-tag [nzColor]="selectedBackendRun?.status==='success' ? 'green' : (selectedBackendRun?.status==='error' ? 'red' : (selectedBackendRun?.status==='running' ? 'blue' : (selectedBackendRun?.status==='cancelled' ? 'default' : 'default')))" class="status-tag">{{ selectedBackendRun?.status }}</nz-tag>
            <button nz-button nzType="text" nzSize="small" nzShape="circle" (click)="expandAllAttempts()" title="Développer tout">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
            </button>
            <button nz-button nzType="text" nzSize="small" nzShape="circle" (click)="collapseAllAttempts()" title="Replier tout">
              <i class="fa-solid fa-down-left-and-up-right-to-center"></i>
            </button>
          </div>
          <div class="run-meta">
            <span *ngIf="selectedBackendRun?.durationMs != null">{{ selectedBackendRun?.durationMs }} ms</span>
            <span *ngIf="selectedBackendRun?.nodesExecuted != null"> · {{ selectedBackendRun?.nodesExecuted }} nœuds</span>
            <span *ngIf="selectedBackendRun?.eventsCount != null"> · {{ selectedBackendRun?.eventsCount }} évts</span>
          </div>
          <div class="attempt backend-attempt" *ngFor="let a of backendAttempts; let i = index">
            <div class="hdr">
              <span class="nid">{{ a.nodeId }}</span>
              <span class="st" [ngClass]="a.status || 'success'">{{ a.status || 'success' }}</span>
            </div>
            <div class="sub">
              <span class="dur">{{ a.durationMs || 0 }} ms</span>
              <span class="when" *ngIf="a.startedAt">{{ a.startedAt | date:'shortTime' }}</span>
              <button class="toggle apple-btn" (click)="toggleAttempt(i)">{{ expanded[i] ? 'Masquer' : 'Voir' }}</button>
            </div>
            <div class="io" *ngIf="expanded[i]">
              <div>
                <div class="k">input</div>
                <pre>{{ a.input | json }}</pre>
              </div>
              <div>
                <div class="k">msgIn</div>
                <pre>{{ a.msgIn | json }}</pre>
              </div>
              <div>
                <div class="k">args.pre</div>
                <pre>{{ a.argsPre | json }}</pre>
              </div>
              <div>
                <div class="k">args.post</div>
                <pre>{{ a.argsPost | json }}</pre>
              </div>
              <div>
                <div class="k">output</div>
                <pre>{{ a.result | json }}</pre>
              </div>
              <div>
                <div class="k">msgOut</div>
                <pre>{{ a.msgOut | json }}</pre>
              </div>
            </div>
          </div>
          <h6>Journal (brut)</h6>
          <div class="attempt" *ngFor="let ev of backendEvents">
            <div class="hdr">
              <span class="nid">{{ ev?.data?.nodeId || ev?.type }}</span>
              <span class="dur">{{ ev?.ts || ev?.data?.ts || '' }}</span>
            </div>
            <pre>{{ ev | json }}</pre>
          </div>
        </aside>
      </div>
    </section>
    <!-- Floating panel toggles (mobile) -->
    <button nz-button nzSize="small" class="panel-toggle-fab left" type="button" (click)="leftDrawer = true" aria-label="Ouvrir le panneau gauche">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" id="sidebar">
        <g fill="none" fill-rule="evenodd" stroke="#6b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" transform="translate(1 1)">
          <rect width="16" height="16" rx="2"></rect>
          <path d="M6 0v18"></path>
        </g>
      </svg>
    </button>
    <button nz-button nzSize="small" class="panel-toggle-fab" type="button" (click)="onRightFabClick()" aria-label="Ouvrir le panneau droit">
      <i class="fa-regular fa-rectangle-list" style="color:#6b7280"></i>
    </button>

    <!-- Responsive drawers (mobile/tablet) -->
    <nz-drawer [nzVisible]="leftDrawer" (nzOnClose)="onLeftDrawerClose()" nzPlacement="left" [nzWidth]="360"
      [nzBodyStyle]="{padding:'0'}" [nzClosable]="false" [nzMaskClosable]="true" nzWrapClassName="ios-safe-drawer">
      <ng-container *nzDrawerContent>
        <ng-container [ngTemplateOutlet]="leftPanelContent"></ng-container>
      </ng-container>
    </nz-drawer>
    <nz-drawer [nzVisible]="rightDrawer" (nzOnClose)="onRightDrawerClose()" nzPlacement="right" [nzWidth]="360"
      [nzBodyStyle]="{padding:'0'}" [nzClosable]="false" [nzMaskClosable]="true" nzWrapClassName="ios-safe-drawer">
      <ng-container *nzDrawerContent>
        <div class="details-panel" *ngIf="selectedBackendRun">
          <div class="panel-heading">
            <div class="card-title">
              <div class="t">Exécution</div>
              <div class="s" *ngIf="selectedBackendRun?.startedAt as s">{{ s | date:'medium' }}</div>
              <div class="s mono">ID: {{ selectedBackendRun?.id }}</div>
            </div>
            <div class="spacer"></div>
            <nz-tag [nzColor]="selectedBackendRun?.status==='success' ? 'green' : (selectedBackendRun?.status==='error' ? 'red' : (selectedBackendRun?.status==='running' ? 'blue' : (selectedBackendRun?.status==='cancelled' ? 'default' : 'default')))" class="status-tag">{{ selectedBackendRun?.status }}</nz-tag>
            <button nz-button nzType="text" nzSize="small" nzShape="circle" (click)="expandAllAttempts()" title="Développer tout">
              <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
            </button>
            <button nz-button nzType="text" nzSize="small" nzShape="circle" (click)="collapseAllAttempts()" title="Replier tout">
              <i class="fa-solid fa-down-left-and-up-right-to-center"></i>
            </button>
          </div>
          <div class="run-meta">
            <span *ngIf="selectedBackendRun?.durationMs != null">{{ selectedBackendRun?.durationMs }} ms</span>
            <span *ngIf="selectedBackendRun?.nodesExecuted != null"> · {{ selectedBackendRun?.nodesExecuted }} nœuds</span>
            <span *ngIf="selectedBackendRun?.eventsCount != null"> · {{ selectedBackendRun?.eventsCount }} évts</span>
          </div>
          <div class="attempt backend-attempt" *ngFor="let a of backendAttempts; let i = index">
            <div class="hdr">
              <span class="nid">{{ a.nodeId }}</span>
              <span class="st" [ngClass]="a.status || 'success'">{{ a.status || 'success' }}</span>
            </div>
            <div class="sub">
              <span class="dur">{{ a.durationMs || 0 }} ms</span>
              <span class="when" *ngIf="a.startedAt">{{ a.startedAt | date:'shortTime' }}</span>
              <button class="toggle apple-btn" (click)="toggleAttempt(i)">{{ expanded[i] ? 'Masquer' : 'Voir' }}</button>
            </div>
            <div class="io" *ngIf="expanded[i]">
              <div>
                <div class="k">input</div>
                <pre>{{ a.input | json }}</pre>
              </div>
              <div>
                <div class="k">msgIn</div>
                <pre>{{ a.msgIn | json }}</pre>
              </div>
              <div>
                <div class="k">args.pre</div>
                <pre>{{ a.argsPre | json }}</pre>
              </div>
              <div>
                <div class="k">args.post</div>
                <pre>{{ a.argsPost | json }}</pre>
              </div>
              <div>
                <div class="k">output</div>
                <pre>{{ a.result | json }}</pre>
              </div>
              <div>
                <div class="k">msgOut</div>
                <pre>{{ a.msgOut | json }}</pre>
              </div>
            </div>
          </div>
          <h6>Journal (brut)</h6>
          <div class="attempt" *ngFor="let ev of backendEvents">
            <div class="hdr">
              <span class="nid">{{ ev?.data?.nodeId || ev?.type }}</span>
              <span class="dur">{{ ev?.ts || ev?.data?.ts || '' }}</span>
            </div>
            <pre>{{ ev | json }}</pre>
          </div>
        </div>
      </ng-container>
    </nz-drawer>
  </div>
  `,
  styles: [`
    .flow-exec { position: relative; display:grid; grid-template-columns: 320px 1fr; gap: 0; height:100%; min-height: 0; }
    /* Mobile/tablet only: use dynamic viewport height to account for top bars */
    @media (max-width: 1024px) {
      @supports (height: 100svh) {
        .flow-exec { height: 100svh; min-height: 100svh; }
      }
      @supports (height: 100dvh) {
        .flow-exec { height: 100dvh; min-height: 100dvh; }
      }
    }
    .side.executions { border: none; border-radius: 0; padding: 12px; padding-top: 0; background: #ffffff; overflow: auto; min-height: 0; }
    /* Align headers to builder styles */
    .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; border-bottom:1px solid #E2E1E4; margin: 0 0 8px; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; margin: 0; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; margin: 0; }
    .panel-subtitle { font-weight:600; font-size:12px; color:#444; margin: 8px 0 6px; opacity:.9; }
    .mode-row { display:flex; gap:6px; align-items:center; margin-bottom:8px; }
    .mode-row .mode-select { flex:0 0 76px; padding:3px 6px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; font-size:12px; }
    .mode-row .icon-btn { border:1px solid #e5e7eb; background:#fff; border-radius:10px; padding:6px 8px; font-size:12px; }
    /* KPIs wrap on multiple lines responsively */
    .kpis { display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:8px; margin: 6px 0 10px; }
    .kpi { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px; text-align:center; }
    .kpi .n { font-weight:700; font-size:14px; color:#111; }
    .kpi .l { font-size:11px; color:#6b7280; }
    .exec-list { list-style: none; padding: 0; margin: 8px 0; display:flex; flex-direction:column; gap:8px; }
    .exec-item { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px; cursor:pointer; display:flex; flex-direction:column; gap:6px; }
    .exec-item.active { border-color:#1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.12); }
    .exec-item .row.top { display:flex; align-items:center; gap:8px; }
    .exec-item .row.top .left { display:flex; align-items:center; gap:8px; min-width: 0; }
    .exec-item .row.top .right { margin-left:auto; display:inline-flex; gap:6px; }
    .exec-item .row.bottom { display:flex; align-items:center; gap:8px; color:#6b7280; font-size:12px; }
    .exec-item .row.bottom .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color:#374151; }
    .exec-item .badge.st { border:1px solid #e5e7eb; padding:2px 6px; border-radius:6px; font-size:12px; text-transform: lowercase; }
    .exec-item .badge.st.success { color:#0f5132; background:#d1e7dd; border-color:#badbcc; }
    .exec-item .badge.st.error { color:#842029; background:#f8d7da; border-color:#f5c2c7; }
    .exec-item .badge.st.running { color:#1d4ed8; background:#dbeafe; border-color:#bfdbfe; }
    /* Left panel scrolls itself; no internal max-height */
    .icon-btn.primary { background:#1677ff; color:#fff; border:1px solid #1677ff; }
    .exec-list li.sel { border-color:#1677ff; }
    .attempts { margin-top: 10px; }
    .attempts h5 { margin: 8px 0; }
    .attempt { border:1px solid #e5e7eb; border-radius:10px; padding:8px; margin-bottom:8px; min-width: 0; }
    .attempt .hdr { display:flex; gap:8px; align-items:center; font-size:12px; flex-wrap: wrap; }
    .attempt .hdr .nid { font-weight:600; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .attempt .sub { display:flex; gap:8px; align-items:center; font-size:12px; color:#8c8c8c; margin-top:4px; flex-wrap: wrap; }
    .attempt .hdr .st { padding:2px 6px; border-radius:6px; border:1px solid #e5e7eb; }
    .attempt .hdr .st.success { color:#0f5132; background:#d1e7dd; border-color:#badbcc; }
    .attempt .hdr .st.error { color:#842029; background:#f8d7da; border-color:#f5c2c7; }
    .attempt .hdr .dur { margin-left:auto; color:#8c8c8c; white-space: nowrap; }
    .attempt .hdr .when { color:#8c8c8c; white-space: nowrap; }
    .attempt .hdr .toggle { margin-left:8px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; font-size:12px; cursor:pointer; }
    .attempt .sub .dur { white-space: nowrap; }
    .attempt .sub .when { white-space: nowrap; }
    .attempt .sub .toggle { margin-left:auto; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; font-size:12px; cursor:pointer; }
    .backend-attempt .hdr .st { margin-left:auto; }
    .attempt .io { display:grid; grid-template-columns: 1fr; gap:8px; margin-top:6px; }
    .attempt .io .k { font-size:12px; color:#8c8c8c; margin-bottom:4px; }
    pre { background:#fafafa; border:1px solid #eee; border-radius:6px; padding:6px; font-size:11px; overflow:auto; }
    .viewer { position: relative; height:100%; min-height: 0; overflow: hidden; padding-bottom: 0 !important; }
    .viewer-layout { display:grid; grid-template-columns: 1fr 0; height:100%; min-height: 0; transition: grid-template-columns .25s ease; }
    .viewer-layout.show-details { grid-template-columns: 1fr 320px; }
    .viewer-canvas-wrap { height:100%; min-height: 0; }
    .viewer-canvas { height: 100%; display:block; }
    .details-panel { border-left:1px solid #e5e7eb; background:#fff; height:100%; overflow:auto; padding:12px; min-width: 0; }
    .details-panel .panel-heading { display:flex; align-items:center; gap:8px; margin: 0 0 8px; padding-bottom:8px; border-bottom:1px solid #E2E1E4; }
    .details-panel .panel-heading .spacer { flex:1 1 auto; }
    .details-panel .panel-heading .status-tag { text-transform: lowercase; }
    .details-panel .run-meta { display:flex; flex-wrap: wrap; gap:6px; margin-bottom:10px; color:#6b7280; font-size:12px; }
    .details-panel h6 { margin: 12px 0 6px; }
    .loading-overlay { position:absolute; inset:0; background: rgba(255,255,255,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index: 10; }
    .loading-overlay .spinner { width:28px; height:28px; border:3px solid #e5e7eb; border-top-color:#111827; border-radius:50%; animation: spin .8s linear infinite; }
    .loading-overlay .text { margin-top:10px; color:#374151; font-weight:500; }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* Floating panel toggle buttons (match builder) */
    .panel-toggle-fab { position: absolute; right: 12px; top: 12px; width: 40px; height: 40px; border-radius: 12px; padding: 0; display:none; align-items:center; justify-content:center; background:#fff; border:1px solid #e5e7eb; box-shadow: 0 8px 20px rgba(0,0,0,0.12); z-index: 25; }
    .panel-toggle-fab.left { left: 12px; right: auto; }
    /* Mobile: hide desktop side panels and show drawers */
    @media (max-width: 1280px) {
      .flow-exec { display: block; }
      .panel-toggle-fab { display: inline-flex; }
      .side.executions, section.viewer .details-panel { display: none; }
      /* Keep single column; drawer handles details */
      .viewer-layout.show-details { grid-template-columns: 1fr 0 !important; }
    }
    @media (max-width: 768px) {
      .flow-exec .viewer { padding-bottom: 0 !important; }
    }
    /* Ensure nz-drawer host does not take layout space */
    nz-drawer { display: contents; }
  `]
})
export class FlowExecutionComponent {
  leftDrawer = false;
  rightDrawer = false;
  private mq?: MediaQueryList;
  private mqHandler?: (e: MediaQueryListEvent) => void;
  isTabletOrBelow = false;
  rightPanelOpen = false;
  @ViewChild('viewer', { static: false }) viewer?: FlowViewerComponent;
  private pendingCenter = false;
  private centerTries = 0;
  private centerMaxTries = 60; // ~60 frames ≈ 1s; wait longer for render + layout
  mode: ExecutionMode = 'test';
  runs: ExecutionRun[] = [];
  visibleRuns: ExecutionRun[] = [];
  counters = { launched: 0, completed: 0 };
  flowStats: any = { total: 0, running: 0, success: 0, error: 0, cancelled: 0, timed_out: 0, avgDurationMs: null };
  selectedRun: ExecutionRun | null = null;

  currentFlowId: string | null = null;
  hasFlowParam = false;
  loadingFlowDoc = false;
  private loadingGraphReq = false;

  constructor(
    private runner: FlowRunService,
    private shared: FlowSharedStateService,
    private route: ActivatedRoute,
    private router: Router,
    private catalog: CatalogService,
    private cdr: ChangeDetectorRef,
    private runsApi: RunsBackendService,
    private ui: UiMessageService,
    private acl: AccessControlService,
    private zone: NgZone,
    private pathSvc: FlowPathHighlightService,
    private modal: NzModalService,
  ) {
    this.runner.runs$.subscribe(rs => { this.runs = rs; this.updateVisibleRuns(); });
    this.runner.counters$.subscribe(c => this.counters = c);
    this.shared.getGraph$().subscribe(g => {
      if (g && !this.currentFlowId) {
        this.currentGraph = g; this.updateVisibleRuns();
        try { this.cdr.detectChanges(); } catch {}
      }
    });
    // React to query param changes to load flow graph proactively
    try {
      this.route.queryParamMap.subscribe(qp => {
        const flowId = qp.get('flow');
        this.hasFlowParam = !!flowId;
        if (flowId && flowId !== this.currentFlowId && !this.loadingGraphReq) {
          try { console.log('[exec] query change flow=', flowId); } catch {}
          this.currentFlowId = flowId;
          this.currentGraph = null;
          this.loadingFlowDoc = true;
          this.loadingGraphReq = true;
          this.catalog.getFlow(flowId).subscribe({
            next: (doc) => this.zone.run(() => {
              try { console.log('[exec] loaded flow doc (router)'); } catch {}
              if (doc) {
                const rawMeta: any = (doc as any).meta || {};
                const { ui: _ignoredUi, ...metaNoUi } = rawMeta;
                this.currentGraph = { id: doc.id, name: doc.name, description: doc.description, nodes: doc.nodes || [], edges: doc.edges || [], meta: metaNoUi };
                try { console.log('[exec] stripped UI from meta (router)'); } catch {}
                this.enrichGraphTemplates();
              }
              this.updateVisibleRuns();
              this.loadBackendRuns(flowId);
              this.loadingFlowDoc = false;
              this.loadingGraphReq = false;
              try { this.cdr.detectChanges(); } catch {}
            }),
            error: () => this.zone.run(() => { this.loadingFlowDoc = false; this.loadingGraphReq = false; try { this.cdr.detectChanges(); } catch {} }),
            complete: () => this.zone.run(() => {  this.loadingFlowDoc = false; this.loadingGraphReq = false; try { this.cdr.detectChanges(); } catch {} })
          });
        }
      });
    } catch {}
    // Load workspace runs initially even if no ?flow param (recent runs)
    try { setTimeout(() => { try { console.log('[exec] initial backend runs load'); } catch {}; this.loadBackendRuns(); }, 0); } catch {}
    try { this.catalog.listNodeTemplates().subscribe(list => this.zone.run(() => { (list || []).forEach(t => this.templatesMap.set(t.id, t)); this.enrichGraphTemplates(); try { this.cdr.detectChanges(); } catch {} })); } catch {}
    try {
      this.mq = window.matchMedia('(max-width: 1280px)');
      this.isTabletOrBelow = !!this.mq.matches;
      this.mqHandler = (e: MediaQueryListEvent) => { this.isTabletOrBelow = !!e.matches; try { this.cdr.detectChanges(); } catch {} };
      // Safari fallback
      if (this.mq.addEventListener) this.mq.addEventListener('change', this.mqHandler);
      else if ((this.mq as any).addListener) (this.mq as any).addListener(this.mqHandler);
    } catch {}
  }
  ngOnDestroy() {
    try {
      if (this.mq && this.mqHandler) {
        if (this.mq.removeEventListener) this.mq.removeEventListener('change', this.mqHandler);
        else if ((this.mq as any).removeListener) (this.mq as any).removeListener(this.mqHandler);
      }
    } catch {}
  }
  onLeftDrawerClose() { this.leftDrawer = false; }
  onRightDrawerClose() { this.rightDrawer = false; }
  onRightFabClick() {
    // Do not auto-open panels; user opens with FAB (mobile -> drawer, desktop -> rightPanelOpen)
    if (this.isTabletOrBelow) { this.rightDrawer = true; }
    else { this.rightPanelOpen = !this.rightPanelOpen; try { this.cdr.detectChanges(); } catch {} }
  }
  private templatesMap = new Map<string, any>();
  // Match builder visuals
  flowBackground: any = { type: 'dots', gap: 25, color: '#D4D8E0', size: 1.6, backgroundColor: '#F5F7FA' };
  get portOrientation(): 'vertical'|'horizontal' {
    try {
      const ori = String(this.currentGraph?.meta?.ui?.portOrientation || '').toLowerCase();
      return (ori === 'horizontal' || ori === 'vertical') ? ori as any : 'horizontal';
    } catch { return 'horizontal'; }
  }
  currentGraph: any = null;
  exampleGraph = {
    nodes: [
      {
        id: 'node_send',
        point: { x: 380, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_send',
            name: 'SendMail',
            template: 'tmpl_sendmail',
            templateObj: {
              id: 'tmpl_sendmail',
              name: 'SendMail',
              type: 'function',
              icon: 'fa-solid fa-envelope',
              title: 'Send mail',
              subtitle: 'Exemple',
              output: [],
              args: {}
            },
            context: {},
            invalid: false
          }
        }
      },
      {
        id: 'node_fn2',
        point: { x: 180, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_fn2',
            name: 'Function2',
            template: 'tmpl_fn2',
            templateObj: {
              id: 'tmpl_fn2',
              name: 'Function2',
              type: 'function',
              icon: 'fa-solid fa-bolt',
              title: 'Function 2 outputs',
              subtitle: 'Demo',
              output: ['Oui','Non'],
              args: {}
            },
            context: {}
          }
        }
      },
      {
        id: 'node_cond',
        point: { x: 600, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_cond',
            name: 'Condition',
            template: 'tmpl_condition',
            templateObj: {
              id: 'tmpl_condition',
              name: 'Condition',
              type: 'condition',
              icon: 'fa-solid fa-code-branch',
              title: 'Condition',
              subtitle: 'Multi-branch',
              args: {},
              output_array_field: 'items'
            },
            context: { items: ['A','B','C'] }
          }
        }
      }
    ],
    edges: []
  };

  onRun() {
    const graph = this.currentGraph || this.exampleGraph;
    const flowId = (this.currentGraph && (this.currentGraph as any).id) || this.route.snapshot.queryParamMap.get('flow') || 'adhoc';
    const run = this.runner.run(graph, this.mode, { hello: 'world' }, flowId);
    this.selectedRun = run;
    try { this.computeDecorations(); } catch {}
  }

  // Backend runs (history + start/cancel)
  backendFlowRuns: BackendRun[] = [];
  backendWsRuns: BackendRun[] = [];
  selectedBackendRun: BackendRun | null = null;
  backendEvents: any[] = [];
  backendAttempts: Array<{ nodeId: string; exec?: number; status?: string; durationMs?: number; startedAt?: string; finishedAt?: string; input?: any; argsPre?: any; argsPost?: any; result?: any; msgIn?: any; msgOut?: any }> = [];
  expanded: boolean[] = [];
  private currentStream?: { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void };
  private backendLastNodeId: string | null = null;
  private backendPairs = new Set<string>();
  @ViewChild('detailsPanel', { static: false }) detailsPanel?: ElementRef<HTMLElement>;
  // Pagination state for backendFlowRuns
  private flowRunsPage = 1;
  private flowRunsLimit = 20;
  // Cached decorated graph used by the viewer (avoid getters that recreate arrays on each CD)
  viewNodes: any[] = [];
  viewEdges: any[] = [];
  private flowRunsLoading = false;
  private flowRunsHasMore = true;
  trackBackendRun(index: number, b: BackendRun) { return b && (b as any).id; }
  private loadBackendRuns(flowId?: string, append: boolean = false) {
    const fid = flowId || this.currentFlowId || undefined;
    const wsId = this.acl.currentWorkspaceId() || undefined;
    if (!environment.useBackend) return;
    const sort = 'startedAt:desc';
    const offset = append ? (this.flowRunsPage - 1) * this.flowRunsLimit : 0;
    this.flowRunsLoading = true;
    if (fid) {
      this.runsApi.listByFlow(fid, { limit: this.flowRunsLimit, offset, sort } as any).subscribe({ next: l => {
        this.zone.run(() => {
          const arr = l || [];
          this.flowRunsHasMore = arr.length === this.flowRunsLimit;
          this.backendFlowRuns = append ? [...this.backendFlowRuns, ...arr] : arr;
          this.flowRunsLoading = false;
          try { this.cdr.detectChanges(); } catch {}
        });
      }, error: () => { this.flowRunsLoading = false; } });
      // Load stats KPIs for this flow
      try {
        this.runsApi.statsByFlow(fid).subscribe(stats => {
          this.zone.run(() => { this.flowStats = stats || {}; try { this.cdr.detectChanges(); } catch {} });
        });
      } catch {}
    } else if (wsId) {
      this.runsApi.listByWorkspace(wsId, { limit: this.flowRunsLimit, offset, sort } as any).subscribe({ next: l => {
        this.zone.run(() => {
          const arr = l || [];
          this.flowRunsHasMore = arr.length === this.flowRunsLimit;
          this.backendFlowRuns = append ? [...this.backendFlowRuns, ...arr] : arr;
          this.flowRunsLoading = false;
          try { this.cdr.detectChanges(); } catch {}
        });
      }, error: () => { this.flowRunsLoading = false; } });
    }
  }

  attemptsLen(v: any): number {
    try { return Array.isArray(v) ? v.length : 0; } catch { return 0; }
  }
  runBackend() {
    const fid = this.currentFlowId || (this.currentGraph && (this.currentGraph as any).id) || null;
    if (!fid) { this.ui.error('Aucun flow associé'); try { console.warn('[frontend][exec] runBackend: missing flowId'); } catch {} return; }
    // Detect Start Form at head and prompt for payload if empty
    try {
      const graph = this.currentGraph || { nodes: [], edges: [] };
      const nodes: any[] = Array.isArray(graph.nodes) ? graph.nodes : [];
      const edges: any[] = Array.isArray(graph.edges) ? graph.edges : [];
      const incoming = (id: string) => edges.some((e: any) => String(e.target) === String(id));
      const tyOf = (m: any) => String(m?.templateObj?.type || '').toLowerCase();
      const isStartForm = (m: any) => {
        try {
          const t = tyOf(m);
          if (t === 'start_form') return true;
          const tplId = String(m?.templateObj?.id || m?.template || '').toLowerCase();
          const tplName = String(m?.templateObj?.name || '').toLowerCase();
          return (tplId === 'start_form' || tplName === 'startform');
        } catch { return false; }
      };
      const startHead = nodes.find((n: any) => isStartForm(n?.data?.model) && !incoming(String(n.id)));
      if (startHead) {
        const m = startHead.data?.model || {};
        const ctx = m?.context; const schema = (ctx && (Array.isArray(ctx.fields) || Array.isArray(ctx.steps))) ? ctx : (m?.startFormSchema || m?.templateObj?.args || { title: 'Formulaire', fields: [] });
        // Open a lightweight modal to capture payload then start
        import('./start-form-modal.component').then(mod => {
          const ref = this.modal.create({ nzTitle: 'Remplir le formulaire de démarrage', nzContent: mod.StartFormModalComponent as any, nzFooter: null, nzWidth: 780 });
          const inst: any = ref.getContentComponent();
          try { inst.schema = schema; inst.value = {}; } catch {}
          const sub = inst.submitted.subscribe((val: any) => {
            try { sub.unsubscribe(); } catch {}
            ref.close();
            this.runsApi.start(fid, val || {}).subscribe({
              next: (resp: any) => {
                this.ui.success('Exécution démarrée');
                try { console.log('[frontend][exec] run started with payload', resp); } catch {}
                this.loadBackendRuns(fid);
                try {
                  const runId = resp?.id || resp?.data?.id || resp?.runId;
                  if (runId) {
                    this.selectedBackendRun = { id: runId, flowId: fid, status: 'running' } as any;
                    // Update URL with ?run= without reloading
                    try {
                      const qp = this.route.snapshot.queryParamMap;
                      const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any), run: runId };
                      this.router.navigate([], { queryParams: q, replaceUrl: true });
                    } catch {}
                    this.openBackendStream(runId);
                  }
                } catch {}
              },
              error: (e) => { try { console.error('[frontend][exec] run start error', e); } catch {} this.ui.error('Échec du démarrage'); },
            });
          });
        });
        return;
      }
    } catch {}
    this.runsApi.start(fid, { hello: 'world' }).subscribe({
      next: (resp: any) => {
        this.ui.success('Exécution démarrée');
        try { console.log('[frontend][exec] run started', resp); } catch {}
        this.loadBackendRuns(fid);
        try {
          const runId = resp?.id || resp?.data?.id || resp?.runId;
          if (runId) {
            // Decharge l'ancien run (visuels) et sélectionne le nouveau
            this.backendPairs.clear();
            this.backendAttempts = [];
            this.backendEvents = [];
            this.selectedBackendRun = { id: runId, flowId: this.currentFlowId || '', status: 'running' } as BackendRun;
            try {
              const qp = this.route.snapshot.queryParamMap;
              const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any), run: runId };
              this.router.navigate([], { queryParams: q, replaceUrl: true });
            } catch {}
            this.openBackendStream(runId);
          }
        } catch {}
      },
      error: (e) => { try { console.error('[frontend][exec] run start error', e); } catch {} this.ui.error('Échec du démarrage'); },
    });
  }
  cancelBackend(runId: string) {
    this.runsApi.cancel(runId).subscribe({ next: () => { this.ui.success('Annulation demandée'); this.loadBackendRuns(this.currentFlowId || undefined); }, error: () => this.ui.error('Échec de l\'annulation') });
  }

  selectRun(r: ExecutionRun) { this.selectedRun = r; }

  selectBackendRun(b: BackendRun) {
    try { console.log('[exec] selectBackendRun', { runId: b?.id, status: b?.status, flowId: b?.flowId }); } catch {}
    if (this.selectedBackendRun && this.selectedBackendRun.id === b.id) {
      this.selectedBackendRun = null;
      try { this.currentStream?.close(); } catch {}
      // Clear visuals when no run is selected
      this.backendPairs.clear();
      this.backendAttempts = [];
      this.backendEvents = [];
      // Hide graph entirely until a run is selected
      this.viewNodes = [];
      this.viewEdges = [];
      // Desktop: ensure right panel is closed when deselecting
      if (!this.isTabletOrBelow) { this.rightPanelOpen = false; try { this.cdr.detectChanges(); } catch {} }
      try { this.cdr.detectChanges(); } catch {}
      return;
    }
    this.selectedBackendRun = b;
    // On selection: close left drawer on mobile/tablet; keep as-is when deselecting
    if (this.isTabletOrBelow) { this.leftDrawer = false; }
    // Center after graph + attempts/events loaded
    this.pendingCenter = true;
    // Desktop: auto-open right panel on selection; Mobile: do not auto-open drawer
    if (!this.isTabletOrBelow) { this.rightPanelOpen = true; try { this.cdr.detectChanges(); } catch {} }
    const fid = b?.flowId || null;
    if (fid && (!this.currentGraph || String(this.currentGraph.id) !== String(fid))) {
      this.loadingFlowDoc = true;
      this.catalog.getFlow(fid).subscribe({
        next: (doc) => {
          // IMPORTANT: strip UI from flow doc so execution viewer doesn't inherit orientation from the editor graph
          const rawMeta: any = (doc as any)?.meta || {};
          const { ui: _ignoredUi, ...metaNoUi } = rawMeta;
          this.currentGraph = doc ? { id: doc.id, name: doc.name, description: doc.description, nodes: doc.nodes || [], edges: doc.edges || [], meta: metaNoUi } : null;
          try { console.log('[exec] loaded flow doc; stripped UI from meta'); } catch {}
          this.enrichGraphTemplates(); this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {};
          if (b && b.id) this.prepareRunDetail(b);
        },
        error: () => { this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {}; if (b && b.id) this.prepareRunDetail(b); }
      });
    } else if (b && b.id) {
      this.prepareRunDetail(b);
    }
  }
  private prepareRunDetail(runOrId: BackendRun | string){
    const runId = typeof runOrId === 'string' ? runOrId : runOrId.id;
    const status = typeof runOrId === 'string' ? (this.selectedBackendRun?.status || 'running') : (runOrId.status || 'running');
    // 1) Preload core run to fetch meta.ui (orientation) and graph snapshot
    try {
      this.runsApi.getWith(runId, ['meta','graph']).subscribe({ next: (r) => {
        try { console.log('[exec] run.get (prefetch)', { runId, hasGraph: !!(r as any)?.graph, hasMeta: !!(r as any)?.meta, runUi: (r as any)?.meta?.ui || (r as any)?.ui }); } catch {}
        const g: any = (r as any)?.graph;
        const runOri = String(((r as any)?.ui?.portOrientation) || ((r as any)?.meta?.ui?.portOrientation) || ((r as any)?.settings?.ui?.portOrientation) || '').toLowerCase();
        if (g && (Array.isArray(g.nodes) || Array.isArray(g.edges))) {
          // Prefer run orientation; fallback to graph snapshot orientation
          const graphMeta = { ...(g?.meta || {}), ...(g?.settings || {}) } as any;
          const graphOri = String((g?.ui?.portOrientation) || (graphMeta?.ui?.portOrientation) || '').toLowerCase();
          const chosen = (runOri === 'horizontal' || runOri === 'vertical') ? runOri : ((graphOri === 'horizontal' || graphOri === 'vertical') ? graphOri : undefined);
          // Build meta without inheriting all graph UI details; only set chosen orientation
          const { ui: _ignoredGraphUi, ...graphMetaNoUi } = graphMeta || {};
          const baseMeta = { ...(graphMetaNoUi || {}) } as any;
          if (chosen) {
            baseMeta.ui = { ...(baseMeta.ui || {}), portOrientation: chosen };
            try { console.log('[exec] apply orientation (prefetch)', { runOri, graphOri, chosen }); } catch {}
          }
          this.currentGraph = {
            id: (g.id || this.currentGraph?.id || null),
            name: (g.name || this.currentGraph?.name || ''),
            description: (g.description || this.currentGraph?.description || ''),
            nodes: g.nodes || [],
            edges: g.edges || [],
            meta: baseMeta,
          } as any;
          this.enrichGraphTemplates();
          try { console.log('[exec] currentGraph set (prefetch)', { ui: (this.currentGraph as any)?.meta?.ui, portOrientation: this.portOrientation }); } catch {}
          try { this.computeDecorations(); } catch {}
          try { this.cdr.detectChanges(); } catch {}
        } else if (runOri === 'horizontal' || runOri === 'vertical') {
          // No graph snapshot; still record orientation at meta
          const prev = (this.currentGraph as any) || {};
          const meta = { ...((prev as any)?.meta || {}) } as any;
          (meta as any).ui = { ...((meta as any).ui || {}), portOrientation: runOri };
          this.currentGraph = { ...(prev as any), meta };
          try { console.log('[exec] set orientation on existing graph (prefetch)', { runOri }); } catch {}
          try { this.computeDecorations(); } catch {}
          try { this.cdr.detectChanges(); } catch {}
        }
      }, error: () => {} });
    } catch {}
    // 2) Load attempts + events + meta snapshot so historic runs render with exact path
    this.runsApi.getWith(runId, ['attempts','events','meta']).subscribe({ next: (r) => {
      try { console.log('[exec] run.getWith', { runId, hasGraph: !!(r as any)?.graph, hasMeta: !!(r as any)?.meta, metaUi: (r as any)?.meta?.ui }); } catch {}
      const attempts = (r as any)?.attempts || [];
      const events = (r as any)?.events || [];
      // If backend provides a graph/meta snapshot for the run, prefer it
      try {
        const g: any = (r as any)?.graph || (r as any)?.flow || (r as any)?.flowSnapshot;
        if (g && (Array.isArray(g.nodes) || Array.isArray(g.edges))) {
          // Merge meta/settings; prefer RUN orientation, fallback to GRAPH snapshot orientation
          const runMeta = { ...(r as any)?.meta, ...(r as any)?.settings } as any;
          const graphMeta = { ...(g?.meta || {}), ...(g?.settings || {}) } as any;
          const mergedMeta = { ...(graphMeta || {}), ...(runMeta || {}) } as any;
          try {
            const runOri = String(((r as any)?.ui?.portOrientation) || ((r as any)?.meta?.ui?.portOrientation) || ((r as any)?.settings?.ui?.portOrientation) || '').toLowerCase();
            const graphOri = String((g?.ui?.portOrientation) || (graphMeta?.ui?.portOrientation) || '').toLowerCase();
            const hadExisting = !!((this.currentGraph as any)?.meta?.ui?.portOrientation);
            mergedMeta.ui = { ...(mergedMeta.ui || {}) };
            const chosen = (runOri === 'horizontal' || runOri === 'vertical') ? runOri : ((graphOri === 'horizontal' || graphOri === 'vertical') ? graphOri : (hadExisting ? (this.currentGraph as any)?.meta?.ui?.portOrientation : undefined));
            if (chosen) mergedMeta.ui.portOrientation = chosen as any; else if ('portOrientation' in (mergedMeta.ui || {})) delete (mergedMeta.ui as any).portOrientation;
            console.log('[exec] resolve orientation (RUN+SNAPSHOT)', { runOri, graphOri, hadExisting, chosen });
          } catch {}
          try { console.log('[exec] merge metas (graph snapshot present)', { finalUi: mergedMeta?.ui }); } catch {}
          this.currentGraph = {
            id: (g.id || this.currentGraph?.id || null),
            name: (g.name || this.currentGraph?.name || ''),
            description: (g.description || this.currentGraph?.description || ''),
            nodes: g.nodes || [],
            edges: g.edges || [],
            meta: mergedMeta,
          } as any;
          try { console.log('[exec] currentGraph set (snapshot)', { nodes: (g.nodes||[]).length, edges: (g.edges||[]).length, ui: (this.currentGraph as any)?.meta?.ui, portOrientation: this.portOrientation }); } catch {}
        } else if ((r as any)?.meta) {
          // Merge run-level meta/settings over currentGraph.meta, but set orientation strictly from RUN only
          const prev = (this.currentGraph as any)?.meta || {};
          const merged = { ...prev, ...(r as any).settings, ...(r as any).meta } as any;
          try {
            const runOri = String(((r as any)?.ui?.portOrientation) || ((r as any)?.meta?.ui?.portOrientation) || ((r as any)?.settings?.ui?.portOrientation) || '').toLowerCase();
            const hadExisting = !!((this.currentGraph as any)?.meta?.ui?.portOrientation);
            merged.ui = { ...(merged.ui || {}) };
            if (runOri === 'horizontal' || runOri === 'vertical') {
              merged.ui.portOrientation = runOri;
              console.log('[exec] resolve orientation (RUN ONLY, meta only)', { runOri });
            } else {
              if (!hadExisting && 'portOrientation' in (merged.ui || {})) delete (merged.ui as any).portOrientation;
              console.log('[exec] resolve orientation (RUN ONLY, meta only) — none in run; keep existing?', { hadExisting });
            }
          } catch {}
          this.currentGraph = { ...(this.currentGraph || {}), meta: merged };
          this.enrichGraphTemplates();
          try { console.log('[exec] currentGraph set (run meta only)', { ui: (this.currentGraph as any)?.meta?.ui, portOrientation: this.portOrientation }); } catch {}
        }
      } catch {}
      this.backendAttempts = attempts.map((a: any) => ({ nodeId: a.nodeId, exec: a.attempt, status: a.status, durationMs: a.durationMs, startedAt: a.startedAt, finishedAt: a.finishedAt, input: a.input, argsPre: a.argsPre, argsPost: a.argsPost, result: a.result, msgIn: a.msgIn, msgOut: a.msgOut }));
      this.backendEvents = events;
      this.expanded = this.backendAttempts.map(() => false);
      this.computeDecorations();
      try { this.cdr.detectChanges(); } catch {}
    }, complete: () => {
      if (status === 'running') this.openBackendStream(runId);
    } });
  }
  private enrichGraphTemplates() {
    try {
      const nodes = (this.currentGraph?.nodes || []);
      if (!nodes.length || this.templatesMap.size === 0) return;
      this.currentGraph = {
        ...(this.currentGraph || {}),
        nodes: nodes.map((n: any) => {
          try {
            const m = n?.data?.model || n?.data || n?.model || null;
            const tplId = String(m?.template || m?.templateObj?.id || '').trim();
            const curTpl = m?.templateObj || {};
            const full = this.templatesMap.get(tplId);
            if (full && (!curTpl || !curTpl.type || !curTpl.icon || !curTpl.title)) {
              return { ...n, data: { ...n.data, model: { ...m, templateObj: full } } };
            }
          } catch {}
          return n;
        })
      };
    } catch {}
  }
  onViewRunClick(b: BackendRun) {
    this.selectBackendRun(b);
    if (!this.isTabletOrBelow && this.rightPanelOpen) this.scrollToDetails();
  }
  openInEditor(b: BackendRun) {
    try { this.router.navigate(['/flow-builder'], { queryParams: { flow: b.flowId, run: b.id } }); } catch {}
  }
  private scrollToDetails() {
    try { setTimeout(() => { const el = this.detailsPanel?.nativeElement; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); } catch {}
  }

  private updateVisibleRuns() {
    const fid = this.currentFlowId;
    if (fid) this.visibleRuns = (this.runs || []).filter(r => String(r.flowVersionId) === String(fid));
    else this.visibleRuns = this.runs || [];
    try { this.computeDecorations(); } catch {}
  }

  toggleAttempt(i: number) {
    try { this.expanded[i] = !this.expanded[i]; } catch {}
  }
  expandAllAttempts() {
    try { this.expanded = (this.backendAttempts || []).map(() => true); } catch {}
  }
  collapseAllAttempts() {
    try { this.expanded = (this.backendAttempts || []).map(() => false); } catch {}
  }

  // Decorate nodes/edges for selected run: add status per node and highlight taken edges
  private computeDecorations() {
    try {
      try { console.log('[exec] computeDecorations', { portOrientation: this.portOrientation, nodes: (this.currentGraph?.nodes||[]).length, edges: (this.currentGraph?.edges||[]).length }); } catch {}
      // If no run is selected (local or backend), do not render any nodes/edges
      if (!this.selectedBackendRun && !this.selectedRun) {
        this.viewNodes = [];
        this.viewEdges = [];
        return;
      }
      const baseNodes = (this.currentGraph?.nodes || []) as any[];
      const smap = new Map<string, string>();
      const counts = new Map<string, number>();
      if (this.selectedBackendRun) {
        for (const a of this.backendAttempts) {
          const nid = String(a.nodeId);
          smap.set(nid, a.status || 'success');
          counts.set(nid, (counts.get(nid) || 0) + 1);
        }
      } else {
        const atts = this.selectedRun?.attempts || [];
        for (const a of atts) { const nid = String(a.nodeId); smap.set(nid, a.status); counts.set(nid, (counts.get(nid) || 0) + 1); }
      }
      this.viewNodes = baseNodes.map((n: any) => ({ ...n, data: { ...n.data, execStatus: smap.get(String(n.id)), execCount: counts.get(String(n.id)) || 0 } }));
      const baseEdges = (this.currentGraph?.edges || []) as any[];
      const pairs = this.pathSvc.buildPairs({ explicitPairs: this.backendPairs, events: this.backendEvents, attempts: this.backendAttempts });
      const decorated = this.pathSvc.decorateEdges(baseEdges, pairs);
      this.viewEdges = (decorated || []).map(e => ({ ...e, curve: (backAwareCurve as any) }));
    } catch {}
    // Center once, after items are rendered (wait for DOM)
    if (this.pendingCenter) {
      this.centerAfterRender();
    }
  }

  private centerAfterRender() {
    try {
      const viewer = this.viewer as any;
      const host: HTMLElement | null = viewer?.flowHost?.nativeElement || null;
      let prevW = -1;
      let stableCount = 0;
      const ready = () => {
        if (!host) return false;
        // 1) Ensure DOM items rendered
        const nodesRendered = host.querySelectorAll('.node-card').length;
        const edgesRendered = host.querySelectorAll('svg path').length;
        const nodesExpected = (this.viewNodes || []).length;
        const edgesExpected = (this.viewEdges || []).length;
        const nodesOk = nodesExpected === 0 ? nodesRendered > 0 : nodesRendered >= nodesExpected;
        const edgesOk = edgesExpected === 0 ? true : edgesRendered > 0;
        if (!(nodesOk && edgesOk)) return false;
        // 2) Ensure container width is stable (accounts for right panel opening on desktop)
        const w = host.getBoundingClientRect().width;
        if (w !== prevW) { prevW = w; stableCount = 0; return false; }
        stableCount += 1;
        return stableCount >= 2; // two consecutive stable frames
      };
      const tick = () => {
        if (ready()) {
          this.pendingCenter = false;
          this.centerTries = 0;
          try { this.viewer?.onCenterFlow(); } catch {}
          return;
        }
        this.centerTries += 1;
        if (this.centerTries >= this.centerMaxTries) {
          // Fallback: still try to center once
          this.pendingCenter = false;
          this.centerTries = 0;
          try { this.viewer?.onCenterFlow(); } catch {}
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch { this.pendingCenter = false; this.centerTries = 0; }
  }

  private openBackendStream(runId: string) {
    // Close previous stream
    try { this.currentStream?.close(); } catch {}
    this.backendEvents = [];
    this.backendAttempts = [];
    this.expanded = [];
    this.backendPairs.clear();
    this.backendLastNodeId = null;
    const s = this.runsApi.stream(runId);
    this.currentStream = s;
    s.on((ev) => {
      const t = ev?.type as string;
      if (!t) return;
      if (t === 'run.status') {
        const st = ev?.run?.status || ev?.data?.status;
        if (this.selectedBackendRun) this.selectedBackendRun.status = st || this.selectedBackendRun.status;
        // Also reflect in history list item if present
        try {
          const idx = this.backendFlowRuns.findIndex(x => String(x.id) === String(runId));
          if (idx >= 0 && st) this.backendFlowRuns[idx] = { ...this.backendFlowRuns[idx], status: st } as any;
        } catch {}
        // Seed start node to allow prev->current fallback path coloring
        if (st === 'running') {
          this.backendLastNodeId = this.findStartNodeId();
        }
        // Close stream on terminal state to avoid EventSource auto-reconnect loop
        if (st === 'success' || st === 'error' || st === 'cancelled' || st === 'timed_out') {
          try { s.close(); } catch {}
        }
      }
      if (t === 'node.status') {
        const nodeId = String(ev.nodeId || ev.data?.nodeId || '');
        const exec = (ev as any)?.exec ?? ev?.data?.exec;
        const status = ev?.data?.status || 'running';
        const startedAt = ev?.data?.startedAt;
        const finishedAt = ev?.data?.finishedAt;
        const durationMs = ev?.data?.durationMs;
        if (status === 'running') {
          const existing = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
          if (existing) {
            existing.startedAt = existing.startedAt || startedAt;
            existing.status = 'running';
          } else {
            this.backendAttempts.push({ nodeId, exec, status, startedAt } as any);
            this.expanded.push(false);
          }
          const prev = this.backendLastNodeId;
          if (prev && nodeId && prev !== nodeId) this.backendPairs.add(`${prev}->${nodeId}`);
          this.backendLastNodeId = nodeId || this.backendLastNodeId;
        } else {
          const cur = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
          if (cur) {
            cur.status = status;
            cur.finishedAt = finishedAt ?? cur.finishedAt;
            cur.durationMs = durationMs ?? cur.durationMs;
          } else {
            this.backendAttempts.push({ nodeId, exec, status, startedAt, finishedAt, durationMs } as any);
            this.expanded.push(false);
          }
        }
        this.computeDecorations();
      }
      if (t === 'edge.taken') {
        const s = String(ev?.data?.sourceId || ev?.sourceId || '');
        const d = String(ev?.data?.targetId || ev?.targetId || '');
        if (s && d && s !== d) this.backendPairs.add(`${s}->${d}`);
        this.computeDecorations();
      }
      if (t === 'node.result') {
        const nodeId = String(ev.nodeId || '');
        const exec = (ev as any)?.exec ?? ev?.data?.exec;
        const result = (ev?.data?.result ?? (ev as any)?.result) as any;
        const explicitStatus = String((ev as any)?.data?.status || (ev as any)?.status || '').toLowerCase();
        const nextStatus = explicitStatus === 'error'
          ? 'error'
          : (explicitStatus === 'success'
            ? 'success'
            : (result && typeof result === 'object' && (result.ok === false || result.error != null)) ? 'error' : 'success');
        const cur = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
        if (cur) {
          if (!cur.status || cur.status === 'running') cur.status = nextStatus;
          cur.input = ev.data?.input ?? cur.input;
          cur.argsPre = ev.data?.argsPre ?? cur.argsPre;
          cur.result = (ev.result ?? ev.data?.result) ?? cur.result;
          cur.argsPost = ev.data?.argsPost ?? cur.argsPost;
          cur.msgIn = ev.data?.msgIn ?? cur.msgIn;
          cur.msgOut = ev.data?.msgOut ?? cur.msgOut;
          cur.durationMs = ev.data?.durationMs ?? cur.durationMs;
          cur.startedAt = ev.data?.startedAt ?? cur.startedAt;
          cur.finishedAt = ev.data?.finishedAt ?? cur.finishedAt;
        } else {
          this.backendAttempts.push({ nodeId, exec, status: nextStatus, input: ev.data?.input, argsPre: ev.data?.argsPre, argsPost: ev.data?.argsPost, result: ev.result ?? ev.data?.result, msgIn: ev.data?.msgIn, msgOut: ev.data?.msgOut, durationMs: ev.data?.durationMs, startedAt: ev.data?.startedAt, finishedAt: ev.data?.finishedAt } as any);
          this.expanded.push(false);
        }
        this.computeDecorations();
      }
      if (!this.selectedBackendRun) this.selectedBackendRun = { id: runId, flowId: this.currentFlowId || '', status: 'running' } as BackendRun;
      try { this.cdr.detectChanges(); } catch {}
    });
  }

  private findStartNodeId(): string | null {
    try {
      const nodes = (this.currentGraph?.nodes || []) as any[];
      for (const n of nodes) {
        const t = n?.data?.model?.templateObj || {};
        const ty = String(t?.type || '').toLowerCase();
        if (ty === 'start') return String(n.id);
      }
      for (const n of nodes) { if (String(n.id).toLowerCase().includes('start')) return String(n.id); }
    } catch {}
    return null;
  }
  onListScroll(ev: Event) {
    try {
      const el = ev.target as HTMLElement;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
      if (nearBottom && !this.flowRunsLoading && this.flowRunsHasMore) {
        this.flowRunsPage += 1;
        this.loadBackendRuns(undefined, true);
      }
    } catch {}
  }

}
