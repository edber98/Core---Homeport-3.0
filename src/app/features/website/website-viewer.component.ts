import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Website, WebsiteRoute, WebsiteService } from './website.service';

@Component({
  selector: 'website-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule],
  template: `
  <div class="viewer">
    <div class="container" *ngIf="site">
      <div class="page-header">
        <div>
          <h1>{{site?.name}}</h1>
          <p>/{{site!.slug}} · {{site!.status}} · {{site!.routes?.length || 0}} routes</p>
        </div>
        <div class="actions">
          <button nz-button (click)="edit()"><i class="fa-regular fa-pen-to-square"></i> Éditer</button>
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
          <div class="status chip muted">—</div>
          <div class="actions">
            <button nz-button class="icon primary" (click)="addRoute()" nz-tooltip nzTooltipTitle="Ajouter"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <div class="row" *ngFor="let r of site!.routes; let i=index">
          <div class="path" title="{{r.path}}">{{ r.path }}</div>
          <div class="title" title="{{r.title}}">{{ r.title }}</div>
          <div class="status chip">{{ r.status || 'empty' }}</div>
          <div class="actions">
            <button nz-button class="icon" (click)="openBuilder(r)" nz-tooltip nzTooltipTitle="Ouvrir dans UI Builder"><i class="fa-solid fa-up-right-from-square"></i></button>
            <button nz-button class="icon danger" (click)="removeRoute(i)" nz-tooltip nzTooltipTitle="Supprimer"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .viewer { padding: 20px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .page-header .actions button i { margin-right: 6px; }
    .routes { display:flex; flex-direction:column; gap:8px; }
    .routes .row { display:grid; grid-template-columns: minmax(220px, 1.2fr) minmax(200px, 1fr) 120px 120px; gap:10px; align-items:center; padding:10px 12px; border-radius:12px; border:1px solid #ececec; background:#fff; }
    .routes .row.header { font-size:12px; color:#6b7280; background:transparent; border:none; padding:0 2px; }
    .routes .row.add { background:#fafafa; border:1px dashed #e5e7eb; }
    .routes .row .inp { border:1px solid #e5e7eb; border-radius:8px; padding:4px 8px; font-size:12px; height:32px; }
    .status.chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; display:inline-block; text-align:center; }
    .status.chip.muted { color:#9ca3af; border-color:#ededed; background:#fafafa; }
    .actions { display:flex; gap:6px; justify-content:flex-end; }
    .icon { display:inline-flex; align-items:center; justify-content:center; }
    .icon.danger { color:#b42318; }
    .icon.primary { color:#111; }
    .path, .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 640px) {
      .routes .row, .routes .row.header { grid-template-columns: 1fr; gap:6px; }
      .routes .row.header { display:none; }
      .routes .row { padding:8px 10px; }
      .actions { justify-content:flex-start; }
    }
  `]
})
export class WebsiteViewerComponent implements OnInit {
  site: Website | undefined;
  newPath = '';
  newTitle = '';
  constructor(private route: ActivatedRoute, private router: Router, private svc: WebsiteService) {}
  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) this.svc.getById(id).subscribe(s => this.site = s);
  }
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
  edit() { if (this.site) this.router.navigate(['/websites/editor'], { queryParams: { id: this.site.id } }); }
}
