import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PluginReposBackendService, PluginRepoDto } from '../../services/plugin-repos-backend.service';

@Component({
  selector: 'plugin-repo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzSwitchModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Plugins — Repos</h1>
          <p>Ajouter des dépôts (local/git/http) et recharger les plugins.</p>
        </div>
        <div class="actions">
          <input [(ngModel)]="q" (keyup.enter)="reload()" placeholder="Rechercher" class="search"/>
          <button nz-button class="primary" (click)="reloadRepos()">Recharger</button>
          <button nz-button nzType="primary" class="primary" (click)="create()">Nouveau</button>
        </div>
      </div>
      <div class="loading" *ngIf="loading">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4]"></div>
        </div>
      </div>
      <div class="grid" *ngIf="!loading">
        <div class="card" *ngFor="let r of repos" (click)="open(r)">
          <div class="content">
            <div class="name">{{ r.name }} <span class="badge" [class.ok]="r.status==='synced'" [class.warn]="r.status==='syncing'" [class.err]="r.status==='sync_failed'">{{ r.status || '—' }}</span></div>
            <div class="desc">{{ r.type }} · {{ r.path || r.url || '—' }} <span class="muted" *ngIf="r.lastSyncAt">· {{ r.lastSyncAt | date:'short' }}</span></div>
          </div>
          <div class="trailing">
            <nz-switch [(ngModel)]="r.enabled" (ngModelChange)="toggle(r, $event)" nz-tooltip nzTooltipTitle="Activer/Désactiver"></nz-switch>
            <button nz-button nzType="default" class="icon-btn" (click)="edit(r); $event.stopPropagation()"><i class="fa-regular fa-pen-to-square"></i></button>
            <button nz-button nzType="default" class="icon-btn" (click)="del(r); $event.stopPropagation()" [disabled]="isBuiltin(r)" nz-tooltip nzTooltipTitle="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
        <div class="empty" *ngIf="!repos.length">Aucun dépôt.</div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1024px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin:0; font-size:22px; font-weight:650; letter-spacing:-0.02em; }
    .page-header p { margin:4px 0 0; color:#6b7280; }
    .search { width: 220px; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; }
    .page-header .actions{ display:flex; align-items:center; gap:8px; }
    .grid { display:grid; grid-template-columns: 1fr; gap:10px; }
    .card { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:#fff; border:1px solid #ececec; cursor:pointer; }
    .content { flex:1; min-width:0; }
    .name { font-weight:600; display:flex; align-items:center; gap:8px; }
    .muted{ color:#9ca3af; }
    .badge{ display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid #e5e7eb; background:#f5f5f5; color:#374151; }
    .badge.ok{ background:#ecfdf5; color:#065f46; border-color:#d1fae5; }
    .badge.warn{ background:#fffbeb; color:#92400e; border-color:#fde68a; }
    .badge.err{ background:#fef2f2; color:#991b1b; border-color:#fecaca; }
    .desc { color:#6b7280; font-size:12px; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .icon-btn { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
    .empty { color:#9ca3af; }
    .skeleton-grid { display:grid; grid-template-columns: 1fr; gap:10px; }
    .skeleton-card { height:56px; border-radius:12px; border:1px solid #ececec; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); position:relative; overflow:hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
  `]
})
export class PluginRepoListComponent implements OnInit {
  repos: (PluginRepoDto & { id: string })[] = [];
  loading = false;
  q = '';
  constructor(private api: PluginReposBackendService, private router: Router, private msg: NzMessageService, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void { this.reload(); }
  reload(){ this.loading = true; this.api.list({ page: 1, limit: 100, q: this.q || undefined, sort: 'createdAt:desc' }).subscribe({ next: list => this.zone.run(()=>{ this.repos = (list||[]).map((r:any)=>({ ...r, id: String(r.id || r._id || '') })); }), complete: () => this.zone.run(()=>{ this.loading=false; try{ this.cdr.detectChanges(); }catch{} }) }); }
  isBuiltin(r: PluginRepoDto){ return r.type === 'local' && String(r.path || '').includes('/plugins/local'); }
  create(){ this.router.navigate(['/plugin-repos/editor']); }
  edit(r: PluginRepoDto){ this.router.navigate(['/plugin-repos/editor'], { queryParams: { id: (r as any).id || (r as any)._id } }); }
  open(r: PluginRepoDto){ this.router.navigate(['/plugin-repos/viewer'], { queryParams: { id: (r as any).id || (r as any)._id } }); }
  del(r: PluginRepoDto){ if (this.isBuiltin(r)) return; const id = String((r as any).id || (r as any)._id || ''); this.api.delete(id).subscribe({ next: () => { this.msg.success('Supprimé'); this.reload(); }, error: () => this.msg.error('Échec suppression') }); }
  toggle(r: any, val: boolean){ const id = String(r.id || r._id || ''); this.api.update(id, { enabled: val }).subscribe({ next: () => this.msg.success(val ? 'Activé' : 'Désactivé'), error: () => this.msg.error('Échec maj') }); }
  reloadRepos(){ this.loading = true; this.api.reload().subscribe({ next: () => this.msg.success('Plugins rechargés'), error: () => this.msg.error('Échec rechargement'), complete: () => this.loading=false }); }
}
