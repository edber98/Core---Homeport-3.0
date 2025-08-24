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
          <button nz-button class="icon-only search-action" (click)="noop()" aria-label="Rechercher">
            <i class="fa-solid fa-search"></i>
          </button>
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
            <div class="avatar">{{ (s.name || s.slug) | slice:0:1 }}</div>
          </div>
          <div class="content">
            <div class="title-row">
              <div class="name">{{ s.name }}</div>
              <span class="chip">{{ s.status }}</span>
              <span class="chip" *ngFor="let t of s.tags || []">{{ t }}</span>
            </div>
            <div class="desc">/{{ s.slug }} · {{ s.routes?.length || 0 }} routes</div>
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
    .list-page { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; outline: none; }
    .actions .search:focus { border-color:#d1d5db; }
    .actions .primary { background:#111; border-color:#111; }
    .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .actions .icon-only.search-action { display:inline-flex; }
    .actions .icon-only i { font-size: 14px; line-height: 1; }
    @media (max-width: 640px) {
      .page-header { flex-direction: column; align-items: stretch; }
      .actions { width:100%; flex-wrap: nowrap; }
      .actions .search { flex:1 1 auto; width:auto; }
      .actions .with-text { display:none; }
      .actions .primary.icon-only { display:inline-flex; }
    }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .avatar { width:40px; height:40px; border-radius: 12px; display:flex; align-items:center; justify-content:center; font-weight:600; color:#111; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border: 1px solid #e5e7eb; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .desc { color:#6b7280; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; }
    .icon-btn i { font-size:16px; }
  `]
})
export class WebsiteListComponent implements OnInit, OnDestroy {
  q = '';
  items: Website[] = [];
  private changesSub?: Subscription;
  constructor(private svc: WebsiteService, private router: Router, private acl: AccessControlService) {}
  ngOnInit() {
    this.load();
    // Single, throttled subscription to workspace/user changes
    this.changesSub = this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.load());
  }
  ngOnDestroy(): void { try { this.changesSub?.unsubscribe(); } catch {} }
  private load() {
    this.svc.list().subscribe(l => {
      const list = l || [];
      // ensure mapping and filter by ACL
      const activeWs = this.acl.currentWorkspaceId();
      this.items = list.filter(s => {
        const ws = this.acl.ensureResourceWorkspace('website', s.id);
        return ws === activeWs && this.acl.canAccessWorkspace(ws);
      });
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
  noop() {}
}
