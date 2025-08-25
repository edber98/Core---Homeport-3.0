import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../services/auth.service';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { AccessControlService, Role, User, Workspace } from '../../services/access-control.service';
import { UsersBackendService } from '../../services/users-backend.service';
import { WorkspaceBackendService } from '../../services/workspace-backend.service';
import { environment } from '../../../environments/environment';
import { AuthTokenService } from '../../services/auth-token.service';

@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzSelectModule, NzInputModule, NzToolTipModule, NzPopconfirmModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Users</h1>
          <p>Créer des utilisateurs et leur attribuer des droits (role, workspaces).</p>
        </div>
      </div>

      <div class="editor" *ngIf="!useBackend || (useBackend && canCreateBackend())">
        <div class="row">
          <input [(ngModel)]="draftName" [placeholder]="useBackend ? 'Email utilisateur' : 'Nom utilisateur'" class="text"/>
          <input [(ngModel)]="draftPassword" placeholder="Mot de passe (optionnel)" class="text"/>
          <nz-select [(ngModel)]="draftRole" class="select" nzPlaceHolder="Role">
            <nz-option nzLabel="Admin" nzValue="admin"></nz-option>
            <nz-option nzLabel="Member" nzValue="member"></nz-option>
          </nz-select>
          <nz-select [(ngModel)]="draftWorkspaces" class="select" nzMode="multiple" nzPlaceHolder="Workspaces" [nzDisabled]="draftRole==='admin'" [nzMaxTagCount]="2">
            <nz-option *ngFor="let w of workspaces" [nzLabel]="w.name" [nzValue]="w.id"></nz-option>
          </nz-select>
          <button nz-button nzType="primary" class="primary" (click)="add()" [disabled]="!canAdd()">Ajouter</button>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <div class="skeleton-grid">
          <div class="skeleton-card" *ngFor="let _ of [1,2,3,4]"></div>
        </div>
      </div>
      <div class="error" *ngIf="!loading && error">{{ error }}</div>
      <div class="grid" *ngIf="!loading && !error">
        <div class="card" *ngFor="let u of users">
          <div class="leading"><div class="avatar">{{ initials(u.name) }}</div></div>
          <div class="content">
            <div class="name">{{ u.name }}</div>
            <div class="desc" [title]="u.id + ' · ' + u.role + (u.role!=='admin' ? ' · ' + ((u.workspaces||[]).join(', ') || '—') : '')">
              {{ u.id }} · <strong>{{ u.role }}</strong> <span *ngIf="u.role!=='admin'">· {{ (u.workspaces||[]).join(', ') || '—' }}</span>
            </div>
          </div>
          <div class="trailing">
            <nz-select [(ngModel)]="u.role" (ngModelChange)="save(u)" class="select small" [nzDisabled]="!canEdit(u)">
              <nz-option nzLabel="admin" nzValue="admin"></nz-option>
              <nz-option nzLabel="member" nzValue="member"></nz-option>
            </nz-select>
            <nz-select [(ngModel)]="u.workspaces" (ngModelChange)="save(u)" class="select small" nzMode="multiple" [nzDisabled]="u.role==='admin' || !canEdit(u)" [nzMaxTagCount]="1">
              <nz-option *ngFor="let w of workspaces" [nzLabel]="w.name" [nzValue]="w.id"></nz-option>
            </nz-select>
            <button
              nz-button
              nzType="default"
              class="icon-btn"
              nz-tooltip
              nzTooltipTitle="Envoyer un lien de réinitialisation"
              nz-popconfirm
              [nzPopconfirmTitle]="'Envoyer un mail de reset à ' + u.name + ' ?'"
              nzPopconfirmPlacement="bottomRight"
              (nzOnConfirm)="reset(u)"
            >
              <i class="fa-regular fa-envelope"></i>
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
    .editor { background:#fff; border:1px solid #ececec; border-radius:14px; padding:12px; margin-bottom: 16px; }
    .row { display:flex; gap:10px; align-items:center; flex-wrap: wrap; }
    .row .text { width: 220px; max-width: 100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; }
    .row .select { min-width: 160px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:14px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .card { display:flex; align-items:center; gap:10px; padding:12px; border-radius:12px; background:linear-gradient(180deg,#fff,#fafafa); border:1px solid #ececec; }
    .avatar { width:36px; height:36px; border-radius:12px; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; font-weight:600; }
    .content { flex:1; min-width:0; }
    .name { font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .desc { color:#6b7280; font-size:12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .trailing { display:flex; align-items:center; gap:8px; }
    .small { min-width: 120px; }
    .loading .skeleton-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:14px; }
    @media (max-width: 768px) { .loading .skeleton-grid { grid-template-columns: 1fr; } }
    .skeleton-card { height: 72px; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%); border:1px solid #ececec; position: relative; overflow: hidden; }
    .skeleton-card:after { content:''; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.05) 50%, rgba(255,255,255,0) 100%); animation: shimmer 1.2s infinite; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    .error { color:#b42318; background:#fee4e2; border:1px solid #fecaca; padding:10px 12px; border-radius:10px; display:inline-block; }
  `]
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  workspaces: Workspace[] = [];
  loading = false;
  error: string | null = null;
  useBackend = environment.useBackend;
  private currentUserId: string | null = null;

  draftName = '';
  draftRole: Role = 'member';
  draftWorkspaces: string[] = [];
  draftPassword = '';

  constructor(private acl: AccessControlService, private auth: AuthService, private msg: NzMessageService, private usersApi: UsersBackendService, private wsApi: WorkspaceBackendService, private tokens: AuthTokenService, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    try { this.currentUserId = String(this.tokens.user?.id || ''); } catch { this.currentUserId = null; }
    this.loading = true; this.error = null;
    if (this.useBackend) {
      this.wsApi.list({ page: 1, limit: 100 }).subscribe({
        next: (ws) => this.zone.run(() => {
          this.workspaces = (ws || []).map(w => ({ id: String((w as any).id), name: w.name })) as any;
          try { this.cdr.detectChanges(); } catch {}
        })
      });
      this.usersApi.list().subscribe({
        next: list => this.zone.run(() => { this.users = (list || []).map(u => ({ id: u.id, name: u.name, role: u.role as Role, workspaces: u.workspaces })) as any; }),
        error: () => this.zone.run(() => { this.error = 'Chargement des utilisateurs échoué'; }),
        complete: () => this.zone.run(() => { this.loading = false; try { this.cdr.detectChanges(); } catch {} })
      });
    } else {
      this.acl.listUsers().subscribe(u => this.users = u || []);
      this.acl.listWorkspaces().subscribe(ws => this.workspaces = ws || []);
      this.loading = false;
    }
  }

  canAdd() { return (this.draftName || '').trim().length >= 2; }
  canCreateBackend(): boolean { try { return this.useBackend && (String(this.tokens.user?.role || '').toLowerCase() === 'admin'); } catch { return false; } }
  add() {
    if (this.useBackend) {
      const email = (this.draftName || '').trim();
      const role = this.draftRole === 'admin' ? 'admin' : 'member';
      const workspaces = role === 'admin' ? [] : this.draftWorkspaces.slice();
      this.loading = true; this.error = null;
      this.usersApi.create({ email, password: (this.draftPassword || '').trim() || undefined, role, workspaces }).subscribe({
        next: () => this.zone.run(() => { this.msg.success('Utilisateur créé'); this.draftName=''; this.draftPassword=''; this.draftRole='member'; this.draftWorkspaces=[]; }),
        error: () => this.zone.run(() => { this.error = 'Création utilisateur échouée'; }),
        complete: () => this.zone.run(() => { this.loading = false; this.reloadUsers(); try { this.cdr.detectChanges(); } catch {} })
      });
      return;
    }
    const name = (this.draftName || '').trim();
    this.acl.addUser({ name, role: this.draftRole, workspaces: this.draftRole === 'admin' ? [] : this.draftWorkspaces }).subscribe(u => {
      this.users = [...this.users, u];
      if ((this.draftPassword || '').trim()) {
        this.auth.setPasswordAdmin(u.id, this.draftPassword.trim()).subscribe(() => this.msg.success('Mot de passe défini'));
      }
      this.draftName = '';
      this.draftRole = 'member';
      this.draftWorkspaces = [];
      this.draftPassword = '';
    });
  }
  save(u: User) {
    if (this.useBackend) {
      if (!this.canEdit(u)) return;
      const role = u.role === 'admin' ? 'admin' : 'member';
      const workspaces = role === 'admin' ? [] : (u.workspaces || []);
      this.loading = true; this.error = null;
      this.usersApi.update(u.id, { role, workspaces }).subscribe({
        next: () => this.zone.run(() => { this.msg.success('Utilisateur mis à jour'); }),
        error: () => this.zone.run(() => { this.error = 'Mise à jour échouée'; }),
        complete: () => this.zone.run(() => { this.loading = false; this.reloadUsers(); try { this.cdr.detectChanges(); } catch {} })
      });
      return;
    }
    const payload: User = {
      id: u.id,
      name: u.name,
      role: u.role,
      workspaces: Array.isArray(u.workspaces) ? [...u.workspaces] : [],
    };
    this.acl.updateUser(payload).subscribe(nu => {
      // Refresh local array reference to keep UI in sync without flicker
      this.users = this.users.map(x => x.id === nu.id ? nu : x);
    });
  }
  private reloadUsers(){
    if (!this.useBackend) return;
    this.usersApi.list().subscribe({
      next: list => this.zone.run(() => { this.users = (list || []).map(u => ({ id: u.id, name: u.name, role: u.role as Role, workspaces: u.workspaces })) as any; }),
      complete: () => this.zone.run(() => { try { this.cdr.detectChanges(); } catch {} })
    });
  }
  canEdit(u: User): boolean {
    const isAdmin = (this.tokens.user?.role || '').toLowerCase() === 'admin';
    return !!(this.useBackend && isAdmin && u && u.id && this.currentUserId && String(u.id) !== String(this.currentUserId));
  }
  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.slice(0,2) || 'U')).toUpperCase();
  }
  reset(u: User) {
    this.auth.requestPasswordReset(u.id).subscribe({
      next: (token) => this.msg.info(`Lien de reset (demo): /reset-password?token=${token}`),
      error: (e) => this.msg.error(e?.message || 'Échec')
    });
  }
}
