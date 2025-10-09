import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Website, WebsiteRoute, WebsiteService } from './website.service';

@Component({
  selector: 'website-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzToolTipModule],
  template: `
  <div class="viewer">
    <div class="container" *ngIf="site">
      <div class="page-header">
        <div>
          <h1>{{site!.name}}</h1>
          <p>/{{site!.slug}} · {{site!.status}} · {{ (site!.routes || []).length }} routes</p>
        </div>
        <div class="actions">
          <button nz-button class="apple-btn" (click)="edit()"><i class="fa-regular fa-pen-to-square"></i><span class="label"> Éditer</span></button>
          <button nz-button class="apple-btn" (click)="duplicate()"><i class="fa-regular fa-copy"></i><span class="label"> Dupliquer</span></button>
        </div>
      </div>

      <div class="routes">
        <div class="row header">
          <div>Route</div>
          <div>Titre</div>
          <div>Statut</div>
          <div>Actions</div>
        </div>
        <div class="row add">
          <input [(ngModel)]="newPath" placeholder="/nouvelle-route" class="inp"/>
          <input [(ngModel)]="newTitle" placeholder="Titre" class="inp"/>
          <div class="status inline">
            <span class="dot muted" nz-tooltip [nzTooltipTitle]="isResponsive ? '—' : null"></span>
          </div>
          <div class="actions">
            <button nz-button class="icon primary" (click)="addRoute()" nz-tooltip nzTooltipTitle="Ajouter"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <div class="row item" *ngFor="let r of site!.routes; let i=index" (click)="openPage(r)">
          <div class="path"><code class="code-path" nz-tooltip [nzTooltipTitle]="isResponsive ? (r.title || r.path) : null">{{ r.path }}</code></div>
          <div class="title hide-sm" title="{{r.title}}">{{ r.title }}</div>
          <div class="status inline">
            <span class="dot" nz-tooltip [nzTooltipTitle]="isResponsive ? (r.status || 'empty') : null" [class.done]="r.status==='done'" [class.progress]="r.status==='in_progress'" [class.error]="r.status==='error'" (click)="openPage(r); $event.stopPropagation()"></span>
          </div>
          <div class="actions">
            <button nz-button class="icon" (click)="openBuilder(r); $event.stopPropagation()" nz-tooltip nzTooltipTitle="Ouvrir dans UI Builder"><i class="fa-solid fa-up-right-from-square"></i></button>
            <button nz-button class="icon danger" (click)="removeRoute(i); $event.stopPropagation()" nz-tooltip nzTooltipTitle="Supprimer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .viewer { padding: 20px; }
    /* On iPhone, keep extra space at bottom so last row is not clipped */
    @media (max-width: 768px) {
      .viewer { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
    }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions { display:flex; gap:8px; }
    .page-header .actions button i { margin-right: 6px; }
    .routes { display:flex; flex-direction:column; gap:8px; }
    .routes .row { display:grid; grid-template-columns: minmax(220px, 1.2fr) minmax(200px, 1fr) 100px 120px; gap:10px; align-items:center; padding:10px 12px; border-radius:12px; border:1px solid #ececec; background:#fff; transition: background 160ms ease; }
    .routes .row:not(.header):hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
    .routes .row.header { font-size:12px; color:#6b7280; background:transparent; border:none; padding:0 2px; }
    .routes .row.add { background:#fafafa; border:1px dashed #e5e7eb; }
    .routes .row .inp { border:1px solid #e5e7eb; border-radius:8px; padding:4px 8px; font-size:12px; height:32px; max-width: 100%; }
    .status.inline { display:flex; align-items:center; gap:8px; }
    .dot { width:10px; height:10px; border-radius:50%; background:#d1d5db; cursor:pointer; display:inline-block; }
    .dot.progress { background:#f59e0b; }
    .dot.done { background:#16a34a; }
    .dot.error { background:#b42318; }
    .actions { display:flex; gap:6px; justify-content:flex-end; }
    .icon { display:inline-flex; align-items:center; justify-content:center; }
    .icon.danger { color:#b42318; }
    .icon.primary { color:#111; }
    .path, .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .code-path { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size:12px; color:#111; background:#f8fafc; border:1px solid #eef2f7; border-radius:6px; padding:2px 6px; cursor: pointer; }
    @media (max-width: 640px) {
      .routes .row, .routes .row.header { grid-template-columns: 1fr auto auto; gap:6px; }
      .routes .row.header { display:none; }
      .routes .row { padding:8px 10px; }
      .title.hide-sm { display:none; }
      .actions { justify-content:flex-end; }
      .apple-btn .label { display:none; }
    }
  `]
})
export class WebsiteViewerComponent implements OnInit {
  site: Website | undefined;
  newPath = '';
  newTitle = '';
  isResponsive = false;
  constructor(private route: ActivatedRoute, private router: Router, private svc: WebsiteService) {}
  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) this.svc.getById(id).subscribe(s => this.site = s);
    this.onResize();
  }
  @HostListener('window:resize') onResize() { try { this.isResponsive = window.innerWidth < 640; } catch { this.isResponsive = false; } }
  addRoute() {
    if (!this.site) return;
    const path = (this.newPath||'').trim(); if (!path) return;
    const title = (this.newTitle||'').trim();
    const r: WebsiteRoute = { path, title, status: 'empty' };
    this.site.routes = [...(this.site.routes||[]), r];
    this.svc.upsert(this.site).subscribe(() => { this.newPath=''; this.newTitle=''; });
  }
  removeRoute(i: number) {
    if (!this.site) return;
    const copy = [...(this.site.routes||[])]; copy.splice(i,1); this.site.routes = copy; this.svc.upsert(this.site).subscribe();
  }
  openBuilder(r: WebsiteRoute) { this.router.navigate(['/ui-builder'], { queryParams: { route: r.path, site: this.site?.id } }); }
  openPage(r: WebsiteRoute) { this.router.navigate(['/websites/page'], { queryParams: { site: this.site?.id, route: r.path } }); }
  edit() { if (this.site) this.router.navigate(['/websites/editor'], { queryParams: { id: this.site.id } }); }
  duplicate() { if (this.site) this.router.navigate(['/websites/editor'], { queryParams: { duplicateFrom: this.site.id } }); }
}
