import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RadarBackendService } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';

// Reset Radar (admin) — purge des données du workspace pour repartir à zéro
// (tests). Confirmation forte : retaper le nom du workspace.

const GROUPS: { key: string; label: string; hint: string }[] = [
  { key: 'observations', label: 'Observations', hint: 'snapshots + changements détectés' },
  { key: 'signaux', label: 'Signaux', hint: 'événements jugés signifiants' },
  { key: 'missions', label: 'Missions & rappels', hint: 'missions de fond + réveils programmés' },
  { key: 'board', label: 'Board', hint: 'cards du dashboard' },
  { key: 'chat', label: 'Conversations', hint: 'messages du chat radar' },
  { key: 'memoire', label: 'Mémoire entreprise', hint: 'ce que le radar a appris (savoir)' },
  { key: 'procedures', label: 'Procédures', hint: 'playbooks' },
  { key: 'connecteurs', label: 'Connecteurs', hint: 'les connexions aux logiciels (à recréer ensuite)' },
];

@Component({
  selector: 'radar-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzModalModule, NzCheckboxModule, NzInputModule, NzIconModule],
  template: `
  <div class="card" *ngIf="isAdmin">
    <div class="title">Radar — réinitialisation</div>
    <p>Efface les données du Radar pour ce workspace (utile pour repartir d'une base propre lors des tests).</p>
    <div class="actions">
      <button nz-button nzDanger (click)="open()">
        <span nz-icon nzType="delete"></span> Réinitialiser le Radar
      </button>
    </div>
  </div>

  <nz-modal [(nzVisible)]="visible" nzTitle="Réinitialiser le Radar" [nzWidth]="560" [nzFooter]="null" (nzOnCancel)="visible = false">
    <ng-container *nzModalContent>
      <p class="warn">Cette action est <strong>irréversible</strong>. Sélectionnez ce que vous voulez effacer pour
        <strong>{{ wsName }}</strong>.</p>

      <div class="grp" *ngFor="let g of groups">
        <label nz-checkbox [(ngModel)]="selected[g.key]">
          <span class="grp-label">{{ g.label }}</span>
          <span class="grp-count" *ngIf="counts">{{ counts[g.key] ?? 0 }}</span>
        </label>
        <span class="grp-hint">{{ g.hint }}</span>
      </div>

      <div class="select-all">
        <button nz-button nzSize="small" (click)="setAll(true)">Tout cocher</button>
        <button nz-button nzSize="small" (click)="setAll(false)">Tout décocher</button>
      </div>

      <div class="confirm">
        <label>Pour confirmer, retapez le nom du workspace : <strong>{{ wsName }}</strong></label>
        <input nz-input [(ngModel)]="confirm" [placeholder]="wsName" />
      </div>

      <div class="modal-actions">
        <button nz-button (click)="visible = false">Annuler</button>
        <button nz-button nzDanger [disabled]="!canReset" [nzLoading]="loading" (click)="doReset()">
          Effacer définitivement
        </button>
      </div>
    </ng-container>
  </nz-modal>
  `,
  styles: [`
    .warn { color: #cf1322; font-size: 13px; }
    .grp { display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px dashed #f0f0f0; }
    .grp-label { font-weight: 500; }
    .grp-count { display: inline-block; margin-left: 8px; background: #f5f5f5; border-radius: 10px; padding: 0 8px; font-size: 11px; color: #595959; }
    .grp-hint { color: #8c8c8c; font-size: 12px; margin-left: 24px; }
    .select-all { display: flex; gap: 8px; margin: 10px 0; }
    .confirm { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .confirm label { font-size: 13px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class RadarResetComponent implements OnInit {
  groups = GROUPS;
  selected: Record<string, boolean> = {};
  counts: Record<string, number> | null = null;
  confirm = '';
  visible = false;
  loading = false;

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private msg: UiMessageService) {}

  ngOnInit(): void {}

  get isAdmin(): boolean { return (this.acl.currentUser()?.role || '') === 'admin'; }
  get wsName(): string { return this.acl.currentWorkspace()?.name || ''; }
  get canReset(): boolean { return this.confirm.trim() === this.wsName && Object.values(this.selected).some(v => v); }

  open(): void {
    this.confirm = '';
    this.visible = true;
    const wsId = this.acl.currentWorkspaceId();
    if (wsId) this.radar.getResetCounts(wsId).subscribe({ next: (r) => this.counts = r.counts, error: () => {} });
  }

  setAll(v: boolean): void { for (const g of this.groups) this.selected[g.key] = v; }

  doReset(): void {
    const wsId = this.acl.currentWorkspaceId();
    if (!wsId || !this.canReset) return;
    const groups = this.groups.map(g => g.key).filter(k => this.selected[k]);
    this.loading = true;
    this.radar.resetRadar(wsId, { groups, confirm: this.confirm.trim() }).subscribe({
      next: (r) => {
        this.loading = false; this.visible = false;
        const total = Object.values(r.deleted).reduce((a, b) => a + b, 0);
        this.msg.success(`Radar réinitialisé — ${total} élément(s) effacé(s)`);
      },
      error: (e) => { this.loading = false; this.msg.error(e?.error?.message || 'Réinitialisation impossible'); },
    });
  }
}
