import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService, FlowSummary } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subscription, Subject, fromEvent } from 'rxjs';
import { auditTime, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UiMessageService } from '../../services/ui-message.service';
import { TriggersBackendService, TriggerStatus } from '../../services/triggers-backend.service';
import { environment } from '../../../environments/environment';

type FlowItem = { id: string; name: string; description?: string };

@Component({
  selector: 'flow-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzInputModule, NzFormModule, NzSelectModule, NzSwitchModule, NzSpinModule, NzToolTipModule, NzPopconfirmModule, NzDropDownModule, NzMenuModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>{{ title }}</h1>
          <p>Ouvrez un flow en Éditeur ou Exécutions, ou créez-en un nouveau.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" (ngModelChange)="onQueryInput($event)" placeholder="Rechercher un flow (nom, desc)" class="search"/>
          <button nz-button nzType="primary" class="primary with-text" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nouveau flow
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="openCreate()" aria-label="Nouveau flow">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      <div class="loading" *ngIf="loading && flows.length===0">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4,5,6]"></div>
        </div>
      </div>
      <div class="error" *ngIf="!loading && error">{{ error }}</div>

      <div class="empty" *ngIf="!loading && !error && flows.length===0">Aucun élément trouvé.</div>
      <div class="grid" *ngIf="!loading && !error && flows.length>0">
        <div class="card" *ngFor="let it of flows" [ngClass]="{ invalid: it.invalid }" (click)="openEditor(it)">
          <div class="leading">
            <div class="icon-badge" aria-hidden="true"><i [class]="getIcon(it)"></i></div>
          </div>
          <div class="content">
            <div class="title-row">
              <div class="name">{{ it.name }}</div>
              <i *ngIf="it.invalid" class="fa-solid fa-triangle-exclamation warn"
                 nz-tooltip [nzTooltipTitle]="errorTooltip(it)" aria-label="Flow invalide"></i>
            </div>
            <div class="desc" *ngIf="it.description">{{ it.description }}</div>
          </div>
          <div class="status-col">
            <div class="mobile-dots" [attr.title]="statusLabel(it.status) + (it.enabled ? ' • activé' : ' • désactivé')">
              <span class="dot" [ngClass]="statusClass(it.status)"></span>
              <span class="dot" [ngClass]="it.enabled ? 'on' : 'off'"></span>
            </div>
            <span class="chip" *ngIf="it.status"
                  [ngClass]="statusClass(it.status)"
                  nz-dropdown
                  [nzDropdownMenu]="statusMenu"
                  nzTrigger="click"
                  [nzDisabled]="updatingIds.has(it.id)"
                  (click)="$event.stopPropagation()">
              <span class="live-dot" *ngIf="isLive(it)"></span>
              {{ statusLabel(it.status) }}
            </span>
            <span class="chip trigger-chip" *ngIf="isLive(it)">
              <i class="fa-solid fa-tower-broadcast"></i>
              {{ triggerInfo(it)?.eventCount || 0 }} exéc.
            </span>
            <nz-dropdown-menu #statusMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="setStatus(it, 'draft'); $event.stopPropagation()">Brouillon</li>
                <li nz-menu-item (click)="setStatus(it, 'test'); $event.stopPropagation()">Test</li>
                <li nz-menu-item (click)="setStatus(it, 'production'); $event.stopPropagation()">Production</li>
              </ul>
            </nz-dropdown-menu>
            <span class="chip" [ngClass]="it.enabled ? 'on' : 'off'"
                  nz-dropdown
                  [nzDropdownMenu]="enabledMenu"
                  nzTrigger="click"
                  [nzDisabled]="updatingIds.has(it.id)"
                  (click)="$event.stopPropagation()">
              {{ it.enabled ? 'Activé' : 'Désactivé' }}
            </span>
            <nz-dropdown-menu #enabledMenu="nzDropdownMenu">
              <ul nz-menu>
                <li nz-menu-item (click)="setEnabled(it, true); $event.stopPropagation()">Activé</li>
                <li nz-menu-item (click)="setEnabled(it, false); $event.stopPropagation()">Désactivé</li>
              </ul>
            </nz-dropdown-menu>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="openEditor(it); $event.stopPropagation()" title="Éditeur">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="icon-btn" (click)="openExecutions(it); $event.stopPropagation()" title="Exécutions">
              <i class="fa-solid fa-circle-play"></i>
            </button>
            <button class="icon-btn danger"
                    nz-popconfirm
                    [nzPopconfirmTitle]="'Supprimer ' + it.name + ' ?'"
                    nzOkText="Supprimer"
                    nzCancelText="Annuler"
                    nzPopconfirmPlacement="topLeft"
                    (nzOnConfirm)="removeFlow(it)"
                    (click)="$event.stopPropagation()"
                    title="Supprimer">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="list-loading-more" *ngIf="!loading && !error && loadingMore" role="status" aria-live="polite">
        <nz-spin nzSimple nzSize="small"></nz-spin>
        <span>Chargement des workflows suivants…</span>
      </div>
      <div class="list-bottom-space" *ngIf="!loading && !error && flows.length>0" aria-hidden="true"></div>
    </div>

    <!-- Create modal -->
    <nz-modal [(nzVisible)]="createVisible" nzTitle="Nouveau flow" nzWrapClassName="create-flow-modal" (nzOnCancel)="closeCreate()" [nzFooter]="null">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" (ngSubmit)="createFlow()">
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
              <nz-form-label>Activer ce flow</nz-form-label>
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
            <button nz-button type="button" (click)="closeCreate()">Annuler</button>
            <button nz-button type="submit" nzType="primary" [disabled]="!canCreate() || creating">Créer</button>
          </div>
          <div class="error" *ngIf="createError">{{ createError }}</div>
        </form>
      </ng-container>
    </nz-modal>
  </div>
  `,
  styles: [`
    :host { display: block; }

    .list-page { padding: 24px; }
    .container { max-width: 1080px; margin: 0 auto; }

    /* ── Header ── */
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: #1a1a1a; }
    .page-header p { margin: 4px 0 0; color:#8b8b8b; font-size: 13px; }
    .actions { display:flex; align-items:center; gap:8px; flex-wrap: wrap; }
    .actions .search {
      width: 240px; max-width: 100%;
      border: none; border-radius: 14px; padding: 8px 14px;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      outline: none; font-size: 13px; color: #1a1a1a;
      transition: box-shadow 0.15s;
    }
    .actions .search:focus { box-shadow: 0 0 0 2px rgba(230,25,130,0.12), 0 2px 8px rgba(0,0,0,0.04); }
    .actions .search::placeholder { color: #c4c4c4; }
    .actions .primary { background: #e61982; border-color: #e61982; border-radius: 14px; font-weight: 600; box-shadow: 0 2px 8px rgba(230,25,130,0.2); }
    .actions .primary:hover { background: #d0167a; border-color: #d0167a; }
    .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .actions .icon-only i { font-size: 14px; line-height: 1; }
    .actions .with-text i { margin-right: 6px; }

    @media (max-width: 640px) {
      .list-page { padding: 14px; }
      .page-header { flex-direction: column; align-items: stretch; }
      .page-header h1 { font-size: 20px; }
      .actions { width:100%; flex-wrap: nowrap; }
      .actions .search { flex:1 1 auto; width:auto; }
      .actions .with-text { display:none; }
      .actions .primary.icon-only { display:inline-flex; }
    }

    /* ── Skeleton ── */
    .loading .skeleton-grid { display:grid; grid-template-columns: 1fr; gap:12px; }
    .skeleton-card { height: 80px; border-radius: 16px; background: #fff; position: relative; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, transparent 0%, rgba(230,25,130,0.03) 50%, transparent 100%); animation: shimmer 1.4s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    .list-loading-more { display:flex; align-items:center; justify-content:center; gap:8px; color:#8b8b8b; font-size:12px; font-weight:500; padding: 14px 12px; }
    .list-bottom-space { height: 84px; }

    .error { color:#b42318; background:#fef2f2; padding:10px 14px; border-radius:14px; font-size: 13px; }
    .empty { color:#b0b0b0; font-size: 14px; text-align: center; padding: 48px 16px; }

    /* ── Grid ── */
    .grid { display:grid; grid-template-columns: minmax(0, 1fr); gap:10px; }

    .card {
      display:flex; align-items:center; gap:14px; padding:14px 16px;
      border-radius:16px; cursor:pointer; min-width: 0;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
      transition: all .15s ease;
    }
    .card:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(230,25,130,0.08); }
    .card.invalid { box-shadow: 0 0 0 1px #fecaca inset, 0 1px 3px rgba(0,0,0,0.04); }
    .card.invalid:hover { box-shadow: 0 0 0 1px #f87171 inset, 0 6px 24px rgba(239,68,68,0.08); }

    .leading .icon-badge {
      width:42px; height:42px; border-radius: 12px;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
      color: #e61982;
    }
    .leading .icon-badge i { font-size: 17px; }

    .content { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; justify-content:center; }
    .title-row { display:flex; align-items:center; gap:8px; min-width: 0; overflow: hidden; }
    .title-row .warn { color:#ef4444; font-size: 13px; }
    .title-row .name { flex: 1 1 auto; min-width: 0; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
    .desc { color:#8b8b8b; font-size: 12px; margin-top:3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Status chips ── */
    .status-col { display:flex; align-items:center; gap:6px; flex: 0 0 auto; }
    .chip { background:#f5f5f5; color:#888; border-radius:999px; padding:3px 10px; font-size:11px; font-weight: 500; border: none; cursor: pointer; transition: all 0.12s; }
    .chip:hover { opacity: 0.85; }
    .chip.on { background:#ecfdf5; color:#166534; }
    .chip.off { background:#fef2f2; color:#991b1b; }
    .chip.status-draft { background:#f5f3ff; color:#5b21b6; }
    .chip.status-test { background:#eff6ff; color:#1e3a8a; }
    .chip.status-production { background:#ecfdf5; color:#065f46; }
    .chip .live-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:#22c55e; margin-right:4px; animation: pulse-dot 1.5s ease infinite; }
    @keyframes pulse-dot { 0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(34,197,94,0.4); } 50% { opacity:0.7; box-shadow:0 0 0 4px rgba(34,197,94,0); } }
    .chip.trigger-chip { background:#ecfdf5; color:#065f46; display:inline-flex; align-items:center; gap:4px; }
    .chip.trigger-chip i { font-size:10px; }

    /* Mobile dots */
    .mobile-dots { display:none; align-items:center; gap:5px; margin-left: 4px; }
    .mobile-dots .dot { width:7px; height:7px; border-radius:50%; background:#c0c0c0; flex: 0 0 auto; }
    .mobile-dots .dot.status-draft { background:#5b21b6; }
    .mobile-dots .dot.status-test { background:#1e3a8a; }
    .mobile-dots .dot.status-production { background:#065f46; }
    .mobile-dots .dot.on { background:#166534; }
    .mobile-dots .dot.off { background:#991b1b; }
    @media (max-width: 640px) {
      .status-col .chip { display: none; }
      .mobile-dots { display: inline-flex; }
    }

    /* ── Action buttons ── */
    .trailing { display:flex; align-items:center; gap:6px; flex: 0 0 auto; }
    .icon-btn {
      width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center;
      background: transparent; color:#b0b0b0; border: none; border-radius:10px;
      cursor:pointer; transition: all .12s ease;
    }
    .icon-btn i { font-size:15px; }
    .icon-btn:hover:not([disabled]) { background: #fdf2f8; color:#e61982; }
    .icon-btn.danger:hover:not([disabled]) { background:#fef2f2; color:#ef4444; }
    .icon-btn:active { transform: translateY(0.5px); }

    /* ── Modal ── */
    .grid2 { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
    :host ::ng-deep .ant-modal .ant-modal-content { border-radius: 20px; }
    :host ::ng-deep .ant-modal .ant-input:focus,
    :host ::ng-deep .ant-modal .ant-input-focused { border-color:#e61982 !important; box-shadow: 0 0 0 2px rgba(230,25,130,0.1) !important; }
    :host ::ng-deep .ant-modal .ant-btn-primary { background:#e61982; border-color:#e61982; }
    :host ::ng-deep .ant-modal .ant-btn-primary:hover { background:#d0167a; border-color:#d0167a; }
    :host ::ng-deep .ant-modal .ant-btn:hover:not([disabled]):not(.ant-btn-primary) { border-color:#e61982 !important; color:#e61982 !important; }
  `]
})
export class FlowListComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'Flows';

  flows: FlowSummary[] = [];
  loading = true;
  loadingMore = false;
  hasMore = false;
  error: string | null = null;
  q = '';
  private readonly pageSize = 15;
  private readonly queryDebounceMs = 350;
  private currentPage = 0;
  private currentQuery = '';
  private loadTicket = 0;
  private queryInput$ = new Subject<string>();
  // Helpers d'affichage statut
  statusLabel(s: any): string {
    const v = String(s || '').toLowerCase();
    if (v === 'draft') return 'Brouillon';
    if (v === 'test') return 'Test';
    if (v === 'production') return 'Production';
    return s || '';
  }
  statusClass(s: any): string {
    const v = String(s || '').toLowerCase();
    if (v === 'draft') return 'status-draft';
    if (v === 'test') return 'status-test';
    if (v === 'production') return 'status-production';
    return '';
  }
  // create dialog state
  createVisible = false;
  creating = false;
  createError: string | null = null;
  draft: { name: string; description?: string; status?: 'draft'|'test'|'production'; enabled?: boolean } = { name: '', description: '', status: 'draft', enabled: false };
  updatingIds = new Set<string>();

  private changesSub?: Subscription;
  private querySub?: Subscription;
  private scrollSub?: Subscription;
  private scrollContainer?: HTMLElement | null;
  activeTriggers = new Map<string, TriggerStatus>();
  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService, private ui: UiMessageService, private triggersApi: TriggersBackendService, private elRef: ElementRef<HTMLElement>) { }

  private autoOpened = false;
  ngOnInit() {
    this.querySub = this.queryInput$
      .pipe(debounceTime(this.queryDebounceMs), distinctUntilChanged())
      .subscribe((value) => {
        this.currentQuery = String(value || '').trim();
        this.load(false);
      });
    this.load(false);
    // React to workspace changes
    this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load(false));
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
  ngAfterViewInit(): void {
    setTimeout(() => this.attachScrollContainer(), 0);
  }

  ngOnDestroy(): void {
    try { this.changesSub?.unsubscribe(); } catch {}
    try { this.querySub?.unsubscribe(); } catch {}
    try { this.scrollSub?.unsubscribe(); } catch {}
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.checkLoadMore();
  }

  onQueryInput(value: string) {
    this.q = value || '';
    this.queryInput$.next(this.q);
  }

  load(append = false) {
    if (append && (this.loading || this.loadingMore || !this.hasMore || !!this.error)) return;
    const ticket = ++this.loadTicket;
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) {
      if (!append) {
        this.loading = false;
        this.loadingMore = false;
        this.hasMore = false;
        this.currentPage = 0;
        this.flows = [];
      }
      return;
    }

    const page = append ? (this.currentPage + 1) : 1;
    if (append) {
      this.loadingMore = true;
      this.error = null;
      try { this.cdr.detectChanges(); } catch {}
    } else {
      this.loading = true;
      this.loadingMore = false;
      this.error = null;
      this.hasMore = false;
      this.currentPage = 0;
      this.flows = [];
      this.loadActiveTriggers(wsId);
    }

    this.catalog.listFlowsPage(wsId, {
      page,
      limit: this.pageSize,
      q: this.currentQuery || undefined,
    }).subscribe({
      next: items => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          const list = items || [];
          this.flows = append ? this.mergeFlows(this.flows, list) : list;
          this.currentPage = page;
          this.hasMore = list.length === this.pageSize;
          try { this.cdr.detectChanges(); } catch {}
          setTimeout(() => this.checkLoadMore(), 0);
        });
      },
      error: () => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          if (!append) this.flows = [];
          this.hasMore = false;
          this.error = 'Impossible de charger les flows.';
          try { this.cdr.detectChanges(); } catch {}
        });
      },
      complete: () => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          this.loading = false;
          this.loadingMore = false;
          setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
        });
      }
    });
  }

  private mergeFlows(current: FlowSummary[], incoming: FlowSummary[]): FlowSummary[] {
    const seen = new Set((current || []).map(f => String(f?.id || '')));
    const merged = [...(current || [])];
    for (const item of (incoming || [])) {
      const id = String(item?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(item);
    }
    return merged;
  }

  private loadActiveTriggers(wsId: string) {
    try {
      this.triggersApi.listActive(wsId).subscribe({
        next: (triggers) => {
          this.zone.run(() => {
            this.activeTriggers.clear();
            for (const t of (triggers || [])) {
              if (t && (t as any).flowId) this.activeTriggers.set((t as any).flowId, t);
            }
            try { this.cdr.detectChanges(); } catch {}
          });
        },
        error: () => {}
      });
    } catch {}
  }

  private attachScrollContainer(): void {
    const host = this.elRef?.nativeElement || null;
    this.scrollContainer = host?.closest('.inner-content') as HTMLElement | null;
    try { this.scrollSub?.unsubscribe(); } catch {}
    if (!this.scrollContainer) return;
    this.scrollSub = fromEvent(this.scrollContainer, 'scroll')
      .pipe(auditTime(50))
      .subscribe(() => this.checkLoadMore(this.scrollContainer));
    this.checkLoadMore(this.scrollContainer);
  }

  private checkLoadMore(container?: HTMLElement | null): void {
    if (this.loading || this.loadingMore || !this.hasMore || !!this.error) return;
    const target = container || this.scrollContainer;
    if (target) {
      const remaining = target.scrollHeight - (target.scrollTop + target.clientHeight);
      if (remaining <= 220) {
        this.load(true);
      }
      return;
    }
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const documentHeight = Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
    );
    if ((documentHeight - (scrollTop + viewportHeight)) <= 220) {
      this.load(true);
    }
  }

  getIcon(_item: FlowSummary): string {
    return 'fa-solid fa-diagram-project';
  }

  errorTooltip(it: any): string {
    try {
      const errs = Array.isArray(it?.validationErrors) ? it.validationErrors : [];
      if (!errs.length) return 'Flow invalide';
      const map = (e: any) => {
        const c = e?.code || 'error';
        const m = e?.message ? `: ${e.message}` : '';
        const n = e?.details?.nodeId ? ` (nœud ${e.details.nodeId})` : '';
        return `• ${c}${m}${n}`;
      };
      return errs.map(map).join('\n');
    } catch { return 'Flow invalide'; }
  }

  openEditor(item: FlowSummary) { this.router.navigate(['/flow-builder', 'editor'], { queryParams: { demo: '1', flow: item.id, center: '1' } }); }
  openExecutions(item: FlowSummary) { this.router.navigate(['/flow-builder', 'executions'], { queryParams: { demo: '1', flow: item.id } }); }
  setStatus(item: FlowSummary, status: string) {
    const prev = { status: item.status, enabled: item.enabled };
    if (prev.status === status) return;
    item.status = status as any;
    this.updateFlowMeta(item, prev);
  }
  setEnabled(item: FlowSummary, enabled: boolean) {
    const prev = { status: item.status, enabled: item.enabled };
    if (prev.enabled === enabled) return;
    item.enabled = !!enabled;
    this.updateFlowMeta(item, prev);
  }
  private updateFlowMeta(item: FlowSummary, prev: { status: any; enabled: any }) {
    if (this.updatingIds.has(item.id)) return;
    this.updatingIds.add(item.id);
    this.catalog.getFlow(item.id).subscribe({
      next: (doc) => {
        const updated: any = { ...doc, status: item.status, enabled: item.enabled };
        this.catalog.saveFlow(updated).subscribe({
          next: () => {
            this.updatingIds.delete(item.id);
            try { this.ui.success('Flow mis à jour'); } catch {}
          },
          error: () => {
            item.status = prev.status;
            item.enabled = prev.enabled;
            this.updatingIds.delete(item.id);
            this.ui.error('Échec de la mise à jour');
          }
        });
      },
      error: () => {
        item.status = prev.status;
        item.enabled = prev.enabled;
        this.updatingIds.delete(item.id);
        this.ui.error('Échec de la mise à jour');
      }
    });
  }
  removeFlow(item: FlowSummary) {
    this.catalog.deleteFlow(item.id).subscribe({
      next: () => { this.ui.success('Flow supprimé'); this.load(); },
      error: () => { this.ui.error('Échec de la suppression'); }
    });
  }

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
    const obs = environment.useBackend
      ? this.catalog.createFlow(wsId, name, status, enabled, [], [], (this.draft.description || '').trim())
      : this.catalog.saveFlow({ id: localId, name, description: (this.draft.description || '').trim(), status, enabled, nodes: [], edges: [], meta: { ui: { portOrientation: 'horizontal', alignmentHelper: { tolerance: 35, lineColor: '#D1D5DB' } } } } as any);
    obs.subscribe({
      next: (doc) => {
        this.zone.run(() => {
          const ws = this.acl.currentWorkspaceId();
          const newId = (doc && (doc as any).id) ? String((doc as any).id) : localId;
          try { this.acl.setResourceWorkspace('flow', newId, ws); } catch {}
          this.creating = false; this.createVisible = false; this.ui.success('Flow créé');
          this.load(); this.openEditor({ id: newId, name: doc?.name || name, description: (doc as any)?.description || (this.draft.description || '').trim() });
          setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
        });
      },
      error: () => { this.zone.run(() => { this.creating = false; this.createError = 'Échec de la création.'; this.ui.error('Échec de la création du flow'); }); }
    });
  }
  isLive(it: FlowSummary): boolean {
    return this.activeTriggers.has(it.id);
  }
  triggerInfo(it: FlowSummary): TriggerStatus | undefined {
    return this.activeTriggers.get(it.id);
  }
  // Change handling moved to ngOnInit with throttle and cleanup
}
