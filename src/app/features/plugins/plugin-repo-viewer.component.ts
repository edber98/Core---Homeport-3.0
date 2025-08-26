import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { PluginReposBackendService, PluginRepoDto } from '../../services/plugin-repos-backend.service';

@Component({
  selector: 'plugin-repo-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzModalModule],
  template: `
  <div class="viewer">
    <div class="header" *ngIf="repo as r">
      <div class="left">
        <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left"><span class="t">Repo</span><span class="s">{{ r.name }}</span></div>
      </div>
      <div class="actions">
        <button nz-button class="apple-btn" (click)="edit()"><i class="fa-regular fa-pen-to-square"></i><span class="label">Éditer</span></button>
        <button nz-button class="apple-btn" nzType="default" (click)="reloadPlugins()"><i class="fa-solid fa-rotate"></i><span class="label">Recharger</span></button>
      </div>
    </div>
    <div *ngIf="repo as r" class="grid">
      <div><span class="k">Nom</span><span class="v">{{ r.name }}</span></div>
      <div><span class="k">Type</span><span class="v">{{ r.type }}</span></div>
      <div><span class="k">Chemin</span><span class="v">{{ relPath(r.path) }}</span></div>
      <div><span class="k">URL</span><span class="v">{{ r.url || '—' }}</span></div>
      <div><span class="k">Branche</span><span class="v">{{ r.branch || '—' }}</span></div>
      <div><span class="k">Status</span><span class="v">{{ r.status || '—' }}</span></div>
      <div><span class="k">Dernière sync</span><span class="v">{{ r.lastSyncAt || '—' }}</span></div>
    </div>
    <div class="sync-card" *ngIf="repo as r">
      <div class="card-title"><span class="t">Synchronisation</span><span class="s">Git/HTTP — identifiants optionnels</span></div>
      <div *ngIf="r.type!=='local'; else localRepoNotice">
        <div class="row creds-display">
          <div><span class="k">Auth</span><span class="v">{{ r.gitAuth || '—' }}</span></div>
          <div><span class="k">Username</span><span class="v">{{ r.gitUsername || '—' }}</span></div>
          <div><span class="k">Secret</span><span class="v">••••</span></div>
        </div>
        <div class="row">
          <label>Username<input nz-input [(ngModel)]="gitUser" /></label>
          <label>Password<input nz-input [(ngModel)]="gitPass" type="password" /></label>
          <label>Token<input nz-input [(ngModel)]="gitToken" /></label>
        </div>
        <div class="row actions">
          <button nz-button (click)="sync(false)">Synchroniser</button>
          <button nz-button nzType="primary" (click)="sync(true)">Forcer la mise à jour</button>
        </div>
      </div>
      <ng-template #localRepoNotice>
        <div class="muted">Repo local intégré — aucune crédential requise.</div>
      </ng-template>
      <div class="error" *ngIf="error">{{ error }}</div>
      <div class="impact" *ngIf="impacted?.length">
        <div class="card-title" style="margin-top:8px;"><span class="t">Flows impactés</span><span class="s">{{ impacted.length }} élément(s)</span></div>
        <div class="list">
          <div class="item" *ngFor="let it of impacted">{{ it.name || it.flowId }} · erreurs: {{ it.errors?.length || 0 }}</div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`.viewer{ max-width:840px; margin:0 auto; padding:12px; } .header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; } .header .left{ display:flex; align-items:left; gap:0px; } .icon-btn.back{ width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; } .actions{ display:flex; gap:8px; } .apple-btn[disabled]{ opacity:.55; filter:grayscale(1); cursor:not-allowed; } @media (max-width:640px){ .apple-btn .label{ display:none; } } .card-title{ display:flex; flex-direction:column; } .card-title .t{ font-weight:600; font-size:14px; } .card-title .s{ font-size:12px; color:#64748b; } .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; } .k{ color:#6b7280; margin-right:8px; } .v{} .sync-card{ border:1px solid #ececec; border-radius:12px; padding:10px; margin-top:12px; background:#fff; } .row{ display:flex; gap:10px; margin-top:8px; } .row label{ display:flex; flex-direction:column; gap:6px; } .row.actions{ justify-content:flex-end; } .error{ color:#b42318; background:#fee4e2; border:1px solid #fecaca; padding:6px 8px; border-radius:8px; display:inline-block; } .impact .item{ padding:6px 8px; border:1px solid #f00f0; border-radius:8px; margin-top:6px; } .muted{ color:#6b7280; } .creds-display{ display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; }`]
})
export class PluginRepoViewerComponent implements OnInit {
  repo: (PluginRepoDto & { id: string }) | null = null;
  gitUser = ''; gitPass = ''; gitToken = '';
  error: string | null = null; impacted: Array<{ flowId: string; name?: string; errors?: any[] }> = [];
  constructor(private route: ActivatedRoute, private api: PluginReposBackendService, private zone: NgZone, private cdr: ChangeDetectorRef, private modal: NzModalService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    this.api.list({ page:1, limit:200 }).subscribe(list => { this.zone.run(()=>{
      const items = (list||[]).map((r:any)=>({ ...r, id: String(r.id || r._id || '') }));
      this.repo = items.find(x => x.id === id) || null; try{ this.cdr.detectChanges(); }catch{}
    }); });
  }
  reloadPlugins(){ this.api.reload().subscribe(); }
  back(){ history.back(); }
  edit(){ if (this.repo) { this.zone.run(()=> location.href = '/plugin-repos/editor?id=' + encodeURIComponent(this.repo!.id)); } }
  relPath(p?: string|null): string { try { if (!p) return '—'; const s = String(p).replace(/\\/g,'/'); const i = s.indexOf('/backend/'); return i>=0 ? s.slice(i+1) : (s.includes('backend/src/plugins/local') ? 'backend/src/plugins/local' : s); } catch { return String(p||'—'); } }
  sync(force: boolean){
    if (!this.repo) return; this.error = null; this.impacted = [];
    const id = this.repo.id; const credentials = { username: this.gitUser || undefined, password: this.gitPass || undefined, token: this.gitToken || undefined };
    this.api.sync(id, { force, credentials }).subscribe({
      next: (r) => { this.zone.run(()=>{ this.error=null; this.impacted = r?.impacted || []; try{ this.cdr.detectChanges(); }catch{} }); },
      error: (e) => {
        this.zone.run(()=>{
          this.error = e?.message || 'Sync échouée';
          const details = (e?.details||{});
          this.impacted = Array.isArray(details?.impacted) ? details.impacted : [];
          try{ this.cdr.detectChanges(); }catch{}
        });
        if (!force && (e?.code || '').includes('invalid')) {
          const list = (this.impacted || []).map(x => `• ${x.name || x.flowId}`).join('<br/>');
          this.modal.confirm({
            nzTitle: 'Flows impactés',
            nzContent: `Des flows deviendront invalides (${this.impacted.length}).<br/>${list || ''}<br/><br/>Forcer la synchronisation, désactiver les flows impactés et créer des notifications ?`,
            nzOkText: 'Forcer', nzOkDanger: true, nzCancelText: 'Annuler',
            nzOnOk: () => this.sync(true)
          });
        }
      }
    });
  }
}
