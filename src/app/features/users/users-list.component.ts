import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AccessControlService, Role, User, Workspace } from '../../services/access-control.service';

@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzSelectModule],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Users</h1>
          <p>Créer des utilisateurs et leur attribuer des droits (role, workspaces).</p>
        </div>
      </div>

      <div class="editor">
        <div class="row">
          <input [(ngModel)]="draftName" placeholder="Nom de l'utilisateur" class="text"/>
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

      <div class="grid">
        <div class="card" *ngFor="let u of users">
          <div class="leading"><div class="avatar">{{ initials(u.name) }}</div></div>
          <div class="content">
            <div class="name">{{ u.name }}</div>
            <div class="desc" [title]="u.id + ' · ' + u.role + (u.role!=='admin' ? ' · ' + ((u.workspaces||[]).join(', ') || '—') : '')">
              {{ u.id }} · <strong>{{ u.role }}</strong> <span *ngIf="u.role!=='admin'">· {{ (u.workspaces||[]).join(', ') || '—' }}</span>
            </div>
          </div>
          <div class="trailing">
            <nz-select [(ngModel)]="u.role" (ngModelChange)="save(u)" class="select small">
              <nz-option nzLabel="admin" nzValue="admin"></nz-option>
              <nz-option nzLabel="member" nzValue="member"></nz-option>
            </nz-select>
            <nz-select [(ngModel)]="u.workspaces" (ngModelChange)="save(u)" class="select small" nzMode="multiple" [nzDisabled]="u.role==='admin'" [nzMaxTagCount]="2">
              <nz-option *ngFor="let w of workspaces" [nzLabel]="w.name" [nzValue]="w.id"></nz-option>
            </nz-select>
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
  `]
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  workspaces: Workspace[] = [];

  draftName = '';
  draftRole: Role = 'member';
  draftWorkspaces: string[] = [];

  constructor(private acl: AccessControlService) {}
  ngOnInit(): void {
    this.acl.listUsers().subscribe(u => this.users = u || []);
    this.acl.listWorkspaces().subscribe(ws => this.workspaces = ws || []);
  }

  canAdd() { return (this.draftName || '').trim().length >= 2; }
  add() {
    const name = (this.draftName || '').trim();
    this.acl.addUser({ name, role: this.draftRole, workspaces: this.draftRole === 'admin' ? [] : this.draftWorkspaces }).subscribe(u => {
      this.users = [...this.users, u];
      this.draftName = '';
      this.draftRole = 'member';
      this.draftWorkspaces = [];
    });
  }
  save(u: User) {
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
  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.slice(0,2) || 'U')).toUpperCase();
  }
}
