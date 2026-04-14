import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiPermissionGrant } from '../ai.service';

@Component({
  selector: 'ai-active-permissions',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NzTableModule, NzEmptyModule, NzPopconfirmModule],
  template: `
    <div class="perms-wrap">
      <div class="perms-empty" *ngIf="!loading && !grants.length">
        <nz-empty nzNotFoundContent="Aucune permission active"></nz-empty>
      </div>
      <nz-table *ngIf="grants.length" #t [nzData]="grants" nzSize="small" [nzShowPagination]="false">
        <thead>
          <tr>
            <th>Outil</th>
            <th>Pattern</th>
            <th>Scope</th>
            <th>Niveau</th>
            <th>Expire</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let g of t.data">
            <td><code>{{ g.toolName }}</code></td>
            <td>{{ g.pathPattern || '—' }}</td>
            <td><nz-tag>{{ scopeLabel(g.scope) }}</nz-tag></td>
            <td><nz-tag [nzColor]="riskColor(g.riskLevel)">{{ g.riskLevel }}</nz-tag></td>
            <td>{{ g.expiresAt ? (g.expiresAt | date:'short') : 'Permanent' }}</td>
            <td>
              <button nz-button nzType="text" nzSize="small" nzDanger
                nz-popconfirm nzPopconfirmTitle="Révoquer cette permission ?"
                (nzOnConfirm)="revoke(g)">
                <span nz-icon nzType="delete" nzTheme="outline"></span>
              </button>
            </td>
          </tr>
        </tbody>
      </nz-table>
    </div>
  `,
  styles: [`
    .perms-wrap { padding: 8px; }
    .perms-empty { padding: 30px 12px; }
    code { background: #fafafa; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
  `],
})
export class AiActivePermissionsComponent implements OnInit {
  @Input() threadId?: string;
  public ai = inject(AiService);
  private nzMsg = inject(NzMessageService);

  grants: AiPermissionGrant[] = [];
  loading = false;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const obs = this.threadId ? this.ai.listPermissions(this.threadId) : this.ai.listWorkspacePermissions();
    obs.subscribe({
      next: (list: any) => { this.grants = list?.data || list || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  revoke(g: AiPermissionGrant) {
    const threadId = this.threadId || g.threadId;
    this.ai.revokePermission(threadId, g.id).subscribe({
      next: () => { this.nzMsg.success('Permission révoquée'); this.load(); },
      error: (e) => this.nzMsg.error(e?.message || 'Erreur'),
    });
  }

  scopeLabel(s: string) {
    const map: Record<string, string> = {
      tool: 'Outil',
      'tool+path': 'Outil + chemin',
      'tool+pattern': 'Outil + motif',
      'tool+workspace': 'Workspace',
    };
    return map[s] || s;
  }

  riskColor(r: string) {
    if (r === 'safe') return 'green';
    if (r === 'write') return 'orange';
    if (r === 'destructive') return 'red';
    if (r === 'elevated') return 'purple';
    return 'default';
  }
}
