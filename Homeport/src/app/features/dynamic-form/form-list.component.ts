import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService, FormSummary } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, Subscription, fromEvent } from 'rxjs';
import { auditTime, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UiMessageService } from '../../services/ui-message.service';

type FormItem = { id: string; name: string; description?: string };

@Component({
  selector: 'form-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzInputModule, NzFormModule, NzSpinModule, NzPopconfirmModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>{{ title }}</h1>
          <p>Ouvrez un formulaire en Builder ou Viewer, ou créez-en un nouveau.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" (ngModelChange)="onQueryInput($event)" placeholder="Rechercher un formulaire (nom, desc)" class="search"/>
          <button nz-button nzType="primary" class="primary with-text" (click)="openCreate()">
            <i class="fa-solid fa-plus"></i> Nouveau formulaire
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="openCreate()" aria-label="Nouveau formulaire">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="loading" *ngIf="loading && forms.length===0">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4,5,6]"></div>
        </div>
      </div>
      <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="empty" *ngIf="!loading && !error && forms.length===0">Aucun élément trouvé.</div>
      <div class="grid" *ngIf="!loading && !error && forms.length>0">
        <div class="card" *ngFor="let it of forms" (click)="openBuilder(it)">
          <div class="leading"><div class="icon-badge"><i class="fa-regular fa-rectangle-list"></i></div></div>
          <div class="content">
            <div class="title-row"><div class="name">{{ it.name }}</div></div>
            <div class="desc" *ngIf="it.description">{{ it.description }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="openBuilder(it); $event.stopPropagation()" title="Builder">
              <i class="fa-solid fa-screwdriver-wrench"></i>
            </button>
            <button class="icon-btn" (click)="openViewer(it); $event.stopPropagation()" title="Viewer">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="icon-btn danger"
                    nz-popconfirm
                    [nzPopconfirmTitle]="'Supprimer ' + it.name + ' ?'"
                    nzOkText="Supprimer"
                    nzCancelText="Annuler"
                    nzPopconfirmPlacement="topLeft"
                    (nzOnConfirm)="removeForm(it)"
                    (click)="$event.stopPropagation()"
                    title="Supprimer">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="list-loading-more" *ngIf="!loading && !error && loadingMore" role="status" aria-live="polite">
        <nz-spin nzSimple nzSize="small"></nz-spin>
        <span>Chargement des formulaires suivants…</span>
      </div>
      <div class="list-bottom-space" *ngIf="!loading && !error && forms.length>0" aria-hidden="true"></div>
    </div>
    <!-- Create modal -->
    <nz-modal [(nzVisible)]="createVisible" nzTitle="Nouveau formulaire" nzWrapClassName="create-form-modal" (nzOnCancel)="closeCreate()" [nzFooter]="null">
      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" (ngSubmit)="createForm()">
          <nz-form-item>
            <nz-form-label>Titre</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="Titre du formulaire" [(ngModel)]="draft.name" name="form_name" />
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Description (optionnel)</nz-form-label>
            <nz-form-control>
              <input nz-input placeholder="Brève description" [(ngModel)]="draft.description" name="form_desc" />
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

    .leading .icon-badge {
      width:42px; height:42px; border-radius: 12px;
      display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
      color: #e61982;
    }
    .leading .icon-badge i { font-size: 17px; }

    .content { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; justify-content:center; }
    .title-row { display:flex; align-items:center; gap:8px; min-width: 0; overflow: hidden; }
    .title-row .name { flex: 1 1 auto; min-width: 0; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
    .desc { color:#8b8b8b; font-size: 12px; margin-top:3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
    .modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
    :host ::ng-deep .ant-modal .ant-modal-content { border-radius: 20px; }
    :host ::ng-deep .ant-modal .ant-input:focus,
    :host ::ng-deep .ant-modal .ant-input-focused { border-color:#e61982 !important; box-shadow: 0 0 0 2px rgba(230,25,130,0.1) !important; }
    :host ::ng-deep .ant-modal .ant-btn-primary { background:#e61982; border-color:#e61982; }
    :host ::ng-deep .ant-modal .ant-btn-primary:hover { background:#d0167a; border-color:#d0167a; }
    :host ::ng-deep .ant-modal .ant-btn:hover:not([disabled]):not(.ant-btn-primary) { border-color:#e61982 !important; color:#e61982 !important; }
  `]
})
export class FormListComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'Formulaires';

  forms: FormSummary[] = [];
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
  // create modal state
  createVisible = false;
  creating = false;
  createError: string | null = null;
  draft: { name: string; description?: string } = { name: '', description: '' };

  private changesSub?: Subscription;
  private querySub?: Subscription;
  private scrollSub?: Subscription;
  private scrollContainer?: HTMLElement | null;
  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService, private ui: UiMessageService, private elRef: ElementRef<HTMLElement>) {}

  private autoOpened = false;
  ngOnInit() {
    this.querySub = this.queryInput$
      .pipe(debounceTime(this.queryDebounceMs), distinctUntilChanged())
      .subscribe((value) => {
        this.currentQuery = String(value || '').trim();
        this.load(false);
      });
    this.load(false);
    this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load(false));
    // Auto-open create dialog when on forms/builder, optionally prefill via query
    try {
      const path = this.route.routeConfig?.path || '';
      if (path === 'forms/builder' && !this.autoOpened) {
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
  ngAfterViewInit() {
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
        this.forms = [];
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
      this.forms = [];
    }

    if (environment.useBackend) {
      this.catalog.listFormsPage(wsId, {
        page,
        limit: this.pageSize,
        q: this.currentQuery || undefined,
      }).subscribe({
        next: (items) => {
          if (ticket !== this.loadTicket) return;
          this.zone.run(() => {
            const list = items || [];
            this.forms = append ? this.mergeForms(this.forms, list) : list;
            this.currentPage = page;
            this.hasMore = list.length === this.pageSize;
            try { this.cdr.detectChanges(); } catch {}
            setTimeout(() => this.checkLoadMore(), 0);
          });
        },
        error: () => {
          if (ticket !== this.loadTicket) return;
          this.zone.run(() => {
            if (!append) this.forms = [];
            this.hasMore = false;
            this.error = 'Impossible de charger les formulaires.';
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
      return;
    }

    this.catalog.listForms(wsId).subscribe({
      next: items => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          const list = (items || []).filter(f => {
            const ws = this.acl.ensureResourceWorkspace('form', f.id);
            return ws === wsId && this.acl.canAccessWorkspace(ws);
          });
          const q = this.currentQuery.toLowerCase();
          const filtered = q
            ? list.filter(f => `${String(f?.name || '')} ${String(f?.description || '')}`.toLowerCase().includes(q))
            : list;
          const start = (page - 1) * this.pageSize;
          const slice = filtered.slice(start, start + this.pageSize);
          this.forms = append ? this.mergeForms(this.forms, slice) : slice;
          this.currentPage = page;
          this.hasMore = (start + slice.length) < filtered.length;
          try { this.cdr.detectChanges(); } catch {}
          setTimeout(() => this.checkLoadMore(), 0);
        });
      },
      error: () => {
        if (ticket !== this.loadTicket) return;
        this.zone.run(() => {
          if (!append) this.forms = [];
          this.hasMore = false;
          this.error = 'Impossible de charger les formulaires.';
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

  private mergeForms(current: FormSummary[], incoming: FormSummary[]): FormSummary[] {
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
      document.documentElement?.scrollHeight || 0
    );
    if ((documentHeight - (scrollTop + viewportHeight)) <= 220) {
      this.load(true);
    }
  }

  openBuilder(item: FormSummary) { this.router.navigate(['/dynamic-form'], { queryParams: { id: item.id } }); }
  openViewer(item: FormSummary) { this.router.navigate(['/dynamic-form'], { queryParams: { id: item.id, preview: '1' } }); }
  removeForm(item: FormSummary) {
    this.catalog.deleteForm(item.id).subscribe({
      next: () => { this.ui.success('Formulaire supprimé'); this.load(false); },
      error: () => { this.ui.error('Échec de la suppression'); }
    });
  }
  openCreate() { this.createVisible = true; this.createError = null; this.draft = { name: '', description: '' }; }
  closeCreate() { if (!this.creating) this.createVisible = false; }
  canCreate() { return !!(this.draft.name && this.draft.name.trim().length >= 2); }
  private makeIdFromName(name: string): string {
    const s = (name || '').trim().toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const base = s || 'form';
    return base + '-' + Date.now().toString(36);
  }
  createForm() {
    if (!this.canCreate()) return;
    this.creating = true; this.createError = null;
    const title = (this.draft.name || '').trim();
    const uiDescription = (this.draft.description || '').trim();
    const schema = { title, description: uiDescription || undefined, fields: [] };
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) { this.creating = false; this.createError = 'Workspace introuvable.'; return; }
    const localDoc = { id: this.makeIdFromName(this.draft.name), name: title, description: uiDescription, schema };
    const create$ = environment.useBackend
      ? this.catalog.createForm(wsId, title, uiDescription, schema)
      : this.catalog.saveForm(localDoc);
    create$.subscribe({
      next: (created: any) => {
        this.zone.run(() => {
          // Attach to currently selected workspace
          const ws = this.acl.currentWorkspaceId();
          const createdDoc = environment.useBackend ? (created as FormSummary) : (localDoc as FormSummary);
          if (!environment.useBackend) this.acl.setResourceWorkspace('form', createdDoc.id, ws);
          this.creating = false; this.createVisible = false; this.load(false);
          this.openBuilder({ id: createdDoc.id, name: createdDoc.name, description: createdDoc.description });
          setTimeout(() => { try { this.cdr.detectChanges(); } catch {} }, 0);
        });
      },
      error: () => { this.zone.run(() => { this.creating = false; this.createError = 'Échec de la création.'; }); }
    });
  }
}
