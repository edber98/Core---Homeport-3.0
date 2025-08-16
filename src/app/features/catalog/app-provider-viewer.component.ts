import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CatalogService, AppProvider } from '../../services/catalog.service';

@Component({
  selector: 'app-provider-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule],
  template: `
  <div class="viewer" *ngIf="app as a">
    <div class="header">
      <div class="card-title left"><span class="t">App</span><span class="s">{{ a.name }}</span></div>
      <div class="actions">
        <button nz-button class="apple-btn" (click)="back()"><i nz-icon nzType="arrow-left"></i><span class="label">Retour</span></button>
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
  constructor(private catalog: CatalogService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id') || '';
    if (id) this.catalog.getApp(id).subscribe(a => this.app = a);
  }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
  back() { history.back(); }
}

