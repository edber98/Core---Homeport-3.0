import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import { PluginReposBackendService } from '../../services/plugin-repos-backend.service';

@Component({
  selector: 'plugin-repo-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzSelectModule, NzFormModule],
  template: `
  <div class="editor">
    <div class="header">
      <div class="left">
        <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left"><span class="t">Repo</span><span class="s">{{ name || 'Nouveau' }}</span></div>
      </div>
      <div class="actions"><button nz-button class="apple-btn" (click)="back()"><span class="label">Retour</span></button><button nz-button class="apple-btn" nzType="primary" (click)="save()" [disabled]="!canSave()"><i class="fa-regular fa-floppy-disk"></i><span class="label">Enregistrer</span></button></div>
    </div>
    <form nz-form nzLayout="vertical">
      <div class="grid">
        <nz-form-item>
          <nz-form-label>Nom</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="name" name="name"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Type</nz-form-label>
          <nz-form-control>
            <nz-select [(ngModel)]="type" name="type">
              <nz-option nzLabel="local" nzValue="local"></nz-option>
              <nz-option nzLabel="git" nzValue="git"></nz-option>
              <nz-option nzLabel="http" nzValue="http"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="type==='local'">
          <nz-form-label>Chemin local</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="path" name="path" placeholder="backend/src/plugins/local"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="type!=='local'">
          <nz-form-label>URL</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="url" name="url" placeholder="https://...git"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="type!=='local'">
          <nz-form-label>Branche</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="branch" name="branch" placeholder="main"/></nz-form-control>
        </nz-form-item>
      </div>

      <div class="grid" *ngIf="type!=='local'" style="margin-top:10px;">
        <nz-form-item>
          <nz-form-label>Méthode d'authentification</nz-form-label>
          <nz-form-control>
            <nz-select [(ngModel)]="gitAuth" name="gitAuth">
              <nz-option nzLabel="HTTP Basic" nzValue="basic"></nz-option>
              <nz-option nzLabel="Token" nzValue="token"></nz-option>
              <nz-option nzLabel="SSH" nzValue="ssh"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <div></div>
        <nz-form-item *ngIf="gitAuth==='basic' || gitAuth==='token'">
          <nz-form-label>Username</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="gitUsername" name="gitUsername"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="gitAuth==='basic'">
          <nz-form-label>Password</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="gitPassword" name="gitPassword" type="password"/></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="gitAuth==='token'">
          <nz-form-label>Token</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="gitToken" name="gitToken"/></nz-form-control>
        </nz-form-item>
        <nz-form-item class="span-2" *ngIf="gitAuth==='ssh'">
          <nz-form-label>Clé privée (PEM)</nz-form-label>
          <nz-form-control><textarea nz-input [(ngModel)]="sshPrivateKey" name="sshPrivateKey" rows="4"></textarea></nz-form-control>
        </nz-form-item>
        <nz-form-item *ngIf="gitAuth==='ssh'">
          <nz-form-label>Passphrase</nz-form-label>
          <nz-form-control><input nz-input [(ngModel)]="sshPassphrase" name="sshPassphrase" type="password"/></nz-form-control>
        </nz-form-item>
      </div>
    </form>
  </div>
  `,
  styles: [`.editor{ max-width:840px; margin:0 auto; padding:12px; } .header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; } .header .left{ display:flex; align-items:left; gap:0px; } .icon-btn.back{ width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; } .actions{ display:flex; gap:8px; } .apple-btn[disabled]{ opacity:.55; filter:grayscale(1); cursor:not-allowed; } @media (max-width:640px){ .apple-btn .label{ display:none; } } .card-title{ display:flex; flex-direction:column; } .card-title .t{ font-weight:600; font-size:14px; } .card-title .s{ font-size:12px; color:#64748b; } .grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; } .grid .span-2{ grid-column: span 2; } label{ display:flex; flex-direction:column; gap:6px; }`]
})
export class PluginRepoEditorComponent implements OnInit {
  id: string | null = null;
  name = '';
  type: 'local'|'git'|'http' = 'git';
  path = '';
  url = '';
  branch = '';
  gitAuth: 'basic'|'token'|'ssh' = 'token';
  gitUsername = '';
  gitPassword = '';
  gitToken = '';
  sshPrivateKey = '';
  sshPassphrase = '';
  constructor(private route: ActivatedRoute, private router: Router, private api: PluginReposBackendService, private msg: NzMessageService, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    this.id = this.route.snapshot.queryParamMap.get('id');
  }
  canSave(){ if (!this.name.trim()) return false; if (this.type==='local') return !!this.path.trim(); else return !!this.url.trim(); }
  save(){
    const body: any = { name: this.name.trim(), type: this.type, path: this.type==='local' ? (this.path||'').trim() : undefined, url: this.type!=='local' ? (this.url||'').trim() : undefined, branch: this.type!=='local' ? (this.branch||'').trim() : undefined };
    if (this.type!=='local') {
      body.gitAuth = this.gitAuth; body.gitUsername = this.gitUsername || undefined; body.gitPassword = this.gitAuth==='basic' ? (this.gitPassword||undefined) : undefined; body.gitToken = this.gitAuth==='token' ? (this.gitToken||undefined) : undefined; body.sshPrivateKey = this.gitAuth==='ssh' ? (this.sshPrivateKey||undefined) : undefined; body.sshPassphrase = this.gitAuth==='ssh' ? (this.sshPassphrase||undefined) : undefined;
    }
    this.api.create(body).subscribe({ next: () => this.zone.run(()=>{ this.msg.success('Enregistré'); this.router.navigate(['/plugin-repos']); }), error: () => this.zone.run(()=> this.msg.error('Échec')) });
  }
  back(){ history.back(); }
}
