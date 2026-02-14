import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AccessControlService, Workspace } from '../../services/access-control.service';

@Component({
  selector: 'workspace-picker',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
  <div class="picker-page">
    <div class="container">
      <div class="header">
        <h1>Choisissez votre workspace</h1>
        <p>Sélectionnez le workspace dans lequel vous souhaitez travailler. Vous pourrez changer à tout moment depuis le menu.</p>
      </div>
      <div class="grid">
        <div
          class="card"
          *ngFor="let w of workspaces"
          (click)="pick(w)"
          [class.default]="w.isDefault">
          <div class="avatar">{{ (w.name || '?') | slice:0:1 | uppercase }}</div>
          <div class="info">
            <div class="name">{{ w.name }}</div>
            <div class="badge" *ngIf="w.isDefault">Par défaut</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .picker-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f7f8fa; padding: 20px; }
    .container { max-width: 600px; width: 100%; }
    .header { text-align: center; margin-bottom: 32px; }
    .header h1 { font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
    .header p { color: #6b7280; margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .card { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 14px; background: #fff; border: 1px solid #e5e7eb; cursor: pointer; transition: transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,.08); border-color: #1677ff; }
    .card.default { border-color: #1677ff; background: linear-gradient(180deg, #f0f5ff 0%, #fff 100%); }
    .avatar { width: 44px; height: 44px; border-radius: 12px; background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }
    .info { flex: 1; }
    .name { font-weight: 600; font-size: 16px; }
    .badge { display: inline-block; margin-top: 4px; font-size: 11px; background: #e6f4ff; color: #1677ff; padding: 1px 8px; border-radius: 999px; }
  `]
})
export class WorkspacePickerComponent implements OnInit {
  workspaces: Workspace[] = [];

  constructor(private acl: AccessControlService, private router: Router) {}

  ngOnInit() {
    this.acl.listCompanyWorkspaces().subscribe(ws => {
      this.workspaces = ws || [];
      // If only one workspace, auto-select and skip
      if (this.workspaces.length === 1) {
        this.pick(this.workspaces[0]);
      }
    });
  }

  pick(w: Workspace) {
    this.acl.setCurrentWorkspace(w.id);
    this.router.navigateByUrl('/dashboard');
  }
}
