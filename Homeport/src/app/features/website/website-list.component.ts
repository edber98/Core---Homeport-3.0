import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Website, WebsiteService } from './website.service';
import { Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { AccessControlService } from '../../services/access-control.service';

@Component({
  selector: 'website-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Sites web</h1>
          <p>Gestion des sites (liste, status, routes). Données fictives en mémoire.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" placeholder="Rechercher (nom, slug, tags)" class="search"/>
          <button nz-button nzType="primary" class="primary with-text" (click)="createNew()">
            <i class="fa-solid fa-plus"></i> Nouveau site
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="createNew()" aria-label="Nouveau site">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="grid">
        <div class="card" *ngFor="let s of filtered" (click)="view(s)">
          <div class="leading">
            <div class="avatar">{{ (s.name || s.slug || '').charAt(0) | uppercase }}</div>
          </div>
          <div class="content">
            <div class="title-row">
              <div class="name">{{ s.name }}</div>
              <span class="chip">{{ s.status }}</span>
              <span class="chip" *ngFor="let t of s.tags || []">{{ t }}</span>
            </div>
            <div class="desc">/{{ s.slug }} · {{ s.routes.length || 0 }} routes</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="edit(s); $event.stopPropagation()" title="Éditer">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
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

    /* ── Grid — 1 item per row ── */
    .grid { display:grid; grid-template-columns: minmax(0, 1fr); gap:10px; }

    .card {
      display:flex; align-items:center; gap:14px; padding:14px 16px;
      border-radius:16px; cursor:pointer; min-width: 0;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);
      transition: all .15s ease;
    }
    .card:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(230,25,130,0.08); }

    .leading .avatar {
      width:42px; height:42px; border-radius: 12px;
      display:flex; align-items:center; justify-content:center;
      font-weight:700;
      background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
      color: #e61982;
    }

    .content { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; justify-content:center; }
    .title-row { display:flex; align-items:center; gap:8px; min-width: 0; overflow: hidden; }
    .name { flex: 1 1 auto; min-width: 0; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
    .chip { background:#f5f5f5; color:#888; border-radius:999px; padding:3px 10px; font-size:11px; font-weight: 500; border: none; }
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
    .icon-btn:active { transform: translateY(0.5px); }

    .error { color:#b42318; background:#fef2f2; padding:10px 14px; border-radius:14px; font-size: 13px; }
  `]
})
export class WebsiteListComponent implements OnInit, OnDestroy {
  q = '';
  items: Website[] = [];
  loading = false;
  error: string | null = null;
  private changesSub?: Subscription;
  constructor(private svc: WebsiteService, private router: Router, private acl: AccessControlService) {}
  ngOnInit() {
    this.load();
    // Single, throttled subscription to workspace/user changes
    this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load());
  }
  ngOnDestroy(): void { try { this.changesSub?.unsubscribe(); } catch {} }
  private load() {
    this.loading = true; this.error = null;
    this.svc.list().subscribe({
      next: l => {
        const list = l || [];
        const activeWs = this.acl.currentWorkspaceId();
        this.items = list.filter(s => {
          const ws = this.acl.ensureResourceWorkspace('website', s.id);
          return ws === activeWs && this.acl.canAccessWorkspace(ws);
        });
      },
      error: () => { this.error = 'Chargement des sites échoué'; },
      complete: () => { this.loading = false; }
    });
  }
  get filtered() {
    const s = (this.q || '').toLowerCase().trim();
    if (!s) return this.items;
    return this.items.filter(x => (x.name||'').toLowerCase().includes(s) || (x.slug||'').toLowerCase().includes(s) || (x.tags||[]).join(' ').toLowerCase().includes(s));
  }
  createNew() { this.router.navigate(['/websites/editor']); }
  view(s: Website) { this.router.navigate(['/websites/viewer'], { queryParams: { id: s.id } }); }
  edit(s: Website) { this.router.navigate(['/websites/editor'], { queryParams: { id: s.id } }); }
}
