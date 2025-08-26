import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { CatalogService, AppProvider } from '../../services/catalog.service';
import { AccessControlService } from '../../services/access-control.service';

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule, NzTagModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Applications</h1>
          <p>Catalogue des apps / providers (icônes, couleurs, tags).</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" placeholder="Rechercher (nom, tags)" class="search"/>
          <button nz-button class="icon-only search-action" (click)="doSearch()" aria-label="Rechercher">
            <i class="fa-solid fa-search"></i>
          </button>
          <button nz-button nzType="primary" class="primary with-text" (click)="create()" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i> Nouvelle app
          </button>
          <button nz-button nzType="primary" class="primary icon-only" (click)="create()" aria-label="Nouvelle app" [disabled]="!isAdmin" title="Admin uniquement">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="grid">
        <div class="card" *ngFor="let a of filtered" (click)="view(a)">
          <div class="leading">
            <div class="app-icon" [style.background]="a.color || defaultColor">
              <ng-container *ngIf="a.iconUrl; else iconFromClassOrCdn">
                <img [src]="a.iconUrl" alt="icon" />
              </ng-container>
              <ng-template #iconFromClassOrCdn>
                <i *ngIf="a.iconClass" [class]="a.iconClass" [style.color]="fgColor(a.color)"></i>
                <img *ngIf="!a.iconClass" [src]="simpleIconUrlWithColor(a.id, fgColor(a.color))" alt="icon" />
              </ng-template>
            </div>
          </div>
          <div class="content">
            <div class="title-row"><div class="name">{{ a.title || a.name }}</div>
              <span class="chip id">{{ a.id }}</span>
            </div>
            <div class="desc" *ngIf="a.tags?.length">{{ (a.tags || []).join(', ') }}</div>
          </div>
          <div class="trailing">
            <button class="icon-btn" (click)="view(a); $event.stopPropagation()" title="Voir">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="icon-btn" (click)="edit(a); $event.stopPropagation()" title="Éditer" [disabled]="!isAdmin">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="icon-btn" (click)="remove(a); $event.stopPropagation()" title="Supprimer" [disabled]="!isAdmin">
              <i class="fa-regular fa-trash-can"></i>
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
    .page-header .actions { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .page-header .actions .search { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; }
    .page-header .actions .primary { background:#111; border-color:#111; }
    .page-header .actions .primary[disabled] { background:#f3f4f6; border-color:#e5e7eb; color:#9ca3af; }
    /* Icon-only buttons: hide by default, except explicit search-action */
    .page-header .actions .icon-only { display:none; align-items:center; justify-content:center; padding: 6px 10px; }
    .page-header .actions .icon-only i { font-size: 14px; line-height: 1; }
    .page-header .actions .icon-only.search-action { display:inline-flex; }
    @media (max-width: 640px) {
      /* Stack header blocks; place actions on the next line as a single row */
      .page-header { flex-direction: column; align-items: stretch; }
      .page-header .actions { width: 100%; display:flex; flex-wrap: nowrap; }
      .page-header .actions .search { flex: 1 1 auto; width: auto; }
      .page-header .actions .with-text { display:none; }
      .page-header .actions .primary.icon-only { display:inline-flex; }
    }
    .page-header .actions .primary { background:#111; border-color:#111; }
    .grid { display:grid; gap:16px; grid-template-columns: 1fr; }
    @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    .card { display:flex; align-items:center; gap:14px; padding:14px 14px; border-radius:14px; cursor:pointer; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border: 1px solid #ececec; box-shadow: 0 8px 24px rgba(0,0,0,0.04); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color:#e5e7eb; }
    .leading .app-icon { width:40px; height:40px; border-radius:12px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid #e5e7eb; }
    .leading .app-icon img { width:24px; height:24px; object-fit:contain; display:block; }
    .content { flex:1; min-width:0; }
    .title-row { display:flex; align-items:center; gap:8px; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip { background:#f5f5f5; border:1px solid #eaeaea; color:#444; border-radius:999px; padding:2px 8px; font-size:11px; }
    .desc { color:#6b7280; font-size: 12.5px; margin-top:4px; overflow: hidden; text-overflow: ellipsis; display:-webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:12px; cursor:pointer; transition: background-color .15s ease, box-shadow .15s ease, border-color .15s ease, transform .02s ease; }
    .icon-btn i { font-size:16px; }
    .icon-btn:hover { border-color:#d1d5db; background-image: var(--hp-menu-hover-bg); background-color: transparent; }
    .icon-btn:active { transform: translateY(0.5px); }
    .icon-btn[disabled] { opacity: .55; cursor: not-allowed; filter: grayscale(1); background:#f5f5f5; color:#9ca3af; border-color:#e5e7eb; }
  `]
})
export class AppProviderListComponent implements OnInit {
  apps: AppProvider[] = [];
  q = '';
  defaultColor = '#1677ff';
  loading = true;
  error: string | null = null;
  get isAdmin() { return (this.acl.currentUser()?.role || 'member') === 'admin'; }
  get filtered() {
    const s = (this.q || '').trim().toLowerCase();
    if (!s) return this.apps;
    return this.apps.filter(a => (a.name || '').toLowerCase().includes(s) || (a.title || '').toLowerCase().includes(s) || ((a.tags || []).some(t => (t || '').toLowerCase().includes(s))));
  }
  constructor(private catalog: CatalogService, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef, private acl: AccessControlService) {}
  ngOnInit(): void {
    this.loading = true; this.error = null;
    this.catalog.listApps().subscribe({
      next: list => this.zone.run(() => { this.apps = list || []; }),
      error: () => this.zone.run(() => { this.error = "Impossible de charger les apps."; }),
      complete: () => this.zone.run(() => { this.loading = false; try { this.cdr.detectChanges(); } catch {} })
    });
  }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
  fgColor(bg?: string | null): string {
    const b = String(bg || this.defaultColor);
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  simpleIconUrlWithColor(id: string, color?: string) {
    const hex = (color || '#111').replace('#','');
    return `https://cdn.simpleicons.org/${encodeURIComponent(id)}/${hex}`;
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let s = hex.trim(); if (s.startsWith('#')) s = s.slice(1); if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const num = parseInt(s, 16); const r = (num >> 16) & 255; const g = (num >> 8) & 255; const b = num & 255; return { r, g, b };
  }
  create() { this.router.navigate(['/apps/editor']); }
  edit(a: AppProvider) { this.router.navigate(['/apps/editor'], { queryParams: { id: a.id } }); }
  view(a: AppProvider) { this.router.navigate(['/apps/viewer'], { queryParams: { id: a.id } }); }
  remove(a: AppProvider) {
    if (!confirm(`Supprimer ${a.name || a.id} ?`)) return;
    this.catalog.deleteApp(a.id).subscribe(() => this.catalog.listApps().subscribe(list => this.zone.run(() => { this.apps = list || []; try { this.cdr.detectChanges(); } catch {} })));
  }
  doSearch() { this.q = (this.q || '').trim(); }
}
