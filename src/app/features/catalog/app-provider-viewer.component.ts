import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CatalogService, AppProvider } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';

@Component({
  selector: 'app-provider-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule],
  template: `
  <div class="viewer" *ngIf="app as a">
    <div class="header">
      <div class="left">
        <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left"><span class="t">App</span><span class="s">{{ a.name }}</span></div>
      </div>
      <div class="actions">
        <button nz-button class="apple-btn" *ngIf="app?.id" (click)="edit()" [disabled]="!isAdmin"><i class="fa-regular fa-pen-to-square"></i><span class="label">Édition</span></button>
        <button nz-button class="apple-btn" *ngIf="app?.id" (click)="duplicate()" [disabled]="!isAdmin"><i class="fa-regular fa-copy"></i><span class="label">Dupliquer</span></button>
      </div>
    </div>
    <div class="content">
      <div class="icon" [style.background]="a.color || '#f3f4f6'">
        <i *ngIf="a.iconClass" [class]="a.iconClass"></i>
        <img *ngIf="!a.iconClass && a.iconUrl" [src]="a.iconUrl" alt="icon"/>
        <img *ngIf="!a.iconClass && !a.iconUrl" [src]="simpleIconUrl(a.id)" alt="icon"/>
      </div>
      <div class="kv">
        <div><span class="k">ID</span><span class="v">{{ a.id }}</span></div>
        <div><span class="k">Nom</span><span class="v">{{ a.name }}</span></div>
        <div *ngIf="a.title"><span class="k">Titre</span><span class="v">{{ a.title }}</span></div>
        <div *ngIf="a.tags?.length"><span class="k">Tags</span><span class="v tags"><nz-tag *ngFor="let t of a.tags">{{ t }}</nz-tag></span></div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .viewer { padding: 12px; max-width: 720px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .header .left { display:flex; align-items:left; gap:0px; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .actions { display:flex; gap:8px; }
    .apple-btn[disabled] { opacity: .55; filter: grayscale(1); cursor: not-allowed; }
    @media (max-width: 640px) { .apple-btn .label { display:none; } }
    .card-title { display:flex; flex-direction:column; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .content { display:flex; gap:12px; align-items:center; }
    .icon { width:64px; height:64px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .icon img { width: 36px; height: 36px; object-fit: contain; }
    .kv { display:flex; flex-direction:column; gap:6px; }
    .kv .k { color:#6b7280; width:120px; display:inline-block; }
    .kv .v { color:#111; }
    .kv .v.tags { display:inline-flex; gap:6px; flex-wrap:wrap; }
  `]
})
export class AppProviderViewerComponent implements OnInit {
  app?: AppProvider;
  constructor(private catalog: CatalogService, private route: ActivatedRoute, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService) {}
  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id') || '';
    if (id) this.catalog.getApp(id).subscribe(a => this.zone.run(() => { this.app = a; try { this.cdr.detectChanges(); } catch {} }));
  }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
  back() { history.back(); }
  edit() { if (this.app?.id) this.router.navigate(['/apps/editor'], { queryParams: { id: this.app.id } }); }
  duplicate() { if (this.app?.id) this.router.navigate(['/apps/editor'], { queryParams: { duplicateFrom: this.app.id } }); }
}
