import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { RadarBackendService, RadarPlaybook } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';

// Procédures (playbooks) — les méthodes de l'entreprise : comment le radar
// doit gérer chaque type de situation. Écrites par vous, ou proposées par le
// radar (et alors soumises à votre approbation).

@Component({
  selector: 'radar-playbooks',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzTagModule, NzIconModule, NzInputModule, NzSelectModule,
    NzEmptyModule, NzSpinModule, NzPopconfirmModule, NzSwitchModule, NzToolTipModule, NzAlertModule,
  ],
  template: `
  <p class="intro">Les méthodes de votre entreprise, en français : « quand il arrive X, fais Y ». Le radar les suit en priorité. Il peut aussi en proposer — elles attendent alors votre approbation.</p>

  <!-- Suggestions du radar en attente -->
  <div class="pending-zone" *ngIf="pending.length">
    <nz-alert nzType="info" nzShowIcon
              [nzMessage]="pending.length + ' procédure(s) proposée(s) par le radar — à approuver'"
              class="pending-alert"></nz-alert>
    <div class="pb pb-pending" *ngFor="let p of pending">
      <div class="pb-head">
        <span class="pb-name">{{ p.name }}</span>
        <nz-tag nzColor="gold">Proposition du radar</nz-tag>
      </div>
      <div class="pb-trigger" *ngIf="p.triggerDescription">Quand : {{ p.triggerDescription }}</div>
      <pre class="pb-proc">{{ p.procedure }}</pre>
      <div class="pb-actions">
        <button nz-button nzType="primary" class="primary" nzSize="small" (click)="approve(p)"><span nz-icon nzType="check"></span> Approuver</button>
        <button nz-button nzSize="small" nzDanger nz-popconfirm nzPopconfirmTitle="Refuser cette proposition ?" (nzOnConfirm)="remove(p)">Refuser</button>
      </div>
    </div>
  </div>

  <!-- Création -->
  <div class="create-zone">
    <button nz-button nzType="dashed" *ngIf="!creating" (click)="creating = true">
      <span nz-icon nzType="plus"></span> Créer une procédure
    </button>
    <div class="create-form" *ngIf="creating">
      <input nz-input [(ngModel)]="draft.name" placeholder="Nom (ex: Client mécontent)" />
      <input nz-input [(ngModel)]="draft.triggerDescription" placeholder="Quand s'applique-t-elle ? (ex: un client se plaint par mail)" />
      <textarea nz-input rows="4" [(ngModel)]="draft.procedure"
                placeholder="Les étapes, en français :&#10;1. Me prévenir immédiatement&#10;2. Préparer un brouillon de réponse d'excuse&#10;3. Créer une tâche de rappel à 24h"></textarea>
      <div class="create-row">
        <nz-select [(ngModel)]="draft.autonomy" style="min-width: 260px">
          <nz-option nzValue="propose" nzLabel="Me proposer avant d'agir (recommandé)"></nz-option>
          <nz-option nzValue="auto_with_report" nzLabel="Agir seul puis me rendre compte"></nz-option>
          <nz-option nzValue="full_auto" nzLabel="Agir seul en silence"></nz-option>
        </nz-select>
        <button nz-button nzType="primary" class="primary" [disabled]="!draft.name?.trim() || !draft.procedure?.trim()" [nzLoading]="saving" (click)="create()">Enregistrer</button>
        <button nz-button (click)="creating = false">Annuler</button>
      </div>
    </div>
  </div>

  <nz-spin [nzSpinning]="loading">
    <nz-empty *ngIf="!active.length && !pending.length && !loading" nzNotFoundContent="Aucune procédure — créez-en une ou laissez le radar en proposer quand vous corrigez ses actions."></nz-empty>
    <div class="pb" *ngFor="let p of active">
      <div class="pb-head">
        <span class="pb-name">{{ p.name }}</span>
        <nz-tag [nzColor]="autonomyColor(p.autonomy)">{{ autonomyLabel(p.autonomy) }}</nz-tag>
        <nz-tag *ngIf="p.source === 'suggested_by_radar'" nzColor="purple">Apprise du radar</nz-tag>
        <span class="pb-stats" *ngIf="p.stats?.timesUsed">utilisée {{ p.stats?.timesUsed }} fois</span>
        <span class="spacer"></span>
        <nz-switch [ngModel]="p.enabled" nzSize="small" (ngModelChange)="toggle(p, $event)"
                   nz-tooltip [nzTooltipTitle]="p.enabled ? 'Active' : 'Désactivée'"></nz-switch>
        <button nz-button nzSize="small" (click)="editing = editing === p.id ? null : p.id"><span nz-icon nzType="edit"></span></button>
        <button nz-button nzSize="small" nzDanger nz-popconfirm nzPopconfirmTitle="Supprimer cette procédure ?" (nzOnConfirm)="remove(p)"><span nz-icon nzType="delete"></span></button>
      </div>
      <div class="pb-trigger" *ngIf="p.triggerDescription">Quand : {{ p.triggerDescription }}</div>
      <pre class="pb-proc" *ngIf="editing !== p.id">{{ p.procedure }}</pre>
      <div class="pb-edit" *ngIf="editing === p.id">
        <textarea nz-input rows="5" [(ngModel)]="p.procedure"></textarea>
        <button nz-button nzType="primary" class="primary" nzSize="small" (click)="saveEdit(p)">Enregistrer</button>
      </div>
    </div>
  </nz-spin>
  `,
  styles: [`
    :host { display: block; }
    .intro { color: #595959; font-size: 13px; margin-bottom: 14px; }
    .pending-alert { margin-bottom: 10px; }
    .create-zone { margin-bottom: 16px; }
    .create-form { display: flex; flex-direction: column; gap: 8px; border: 1px dashed #d9d9d9; border-radius: 10px; padding: 14px; background: #fafafa; }
    .create-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .primary { background:#e61982; border-color:#e61982; color:#fff; }
    .pb { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; background: #fff; }
    .pb-pending { border-left: 4px solid #faad14; }
    .pb-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pb-name { font-weight: 600; }
    .pb-stats { color: #8c8c8c; font-size: 12px; }
    .spacer { flex: 1; }
    .pb-trigger { color: #595959; font-size: 12.5px; margin-top: 4px; font-style: italic; }
    .pb-proc { background: #fafafa; border-radius: 6px; padding: 8px 10px; font-size: 12.5px; margin: 8px 0 0; white-space: pre-wrap; font-family: inherit; color: #444; }
    .pb-edit { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; align-items: flex-start; }
    .pb-edit textarea { width: 100%; }
    .pb-actions { display: flex; gap: 8px; margin-top: 8px; }
  `],
})
export class RadarPlaybooksComponent implements OnInit {
  playbooks: RadarPlaybook[] = [];
  loading = false;
  saving = false;
  creating = false;
  editing: string | null = null;
  draft: Partial<RadarPlaybook> = { autonomy: 'propose' };

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private msg: UiMessageService) {}

  get wsId(): string { return this.acl.currentWorkspaceId(); }
  // Jamais de getters retournant de nouveaux tableaux dans un *ngFor (boucle CD)
  pending: RadarPlaybook[] = [];
  active: RadarPlaybook[] = [];

  private regroup(): void {
    this.pending = this.playbooks.filter(p => p.pendingApproval);
    this.active = this.playbooks.filter(p => !p.pendingApproval);
  }

  ngOnInit(): void { this.reload(); }

  reload(): void {
    if (!this.wsId) return;
    this.loading = true;
    this.radar.listPlaybooks(this.wsId).subscribe({
      next: (l) => { this.playbooks = l; this.regroup(); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  create(): void {
    this.saving = true;
    this.radar.createPlaybook(this.wsId, {
      name: this.draft.name!.trim(),
      triggerDescription: this.draft.triggerDescription || '',
      procedure: this.draft.procedure!.trim(),
      autonomy: this.draft.autonomy as any,
    }).subscribe({
      next: () => { this.saving = false; this.creating = false; this.draft = { autonomy: 'propose' }; this.msg.success('Procédure enregistrée — le radar la suivra'); this.reload(); },
      error: (e) => { this.saving = false; this.msg.error(e?.error?.message || 'Enregistrement impossible'); },
    });
  }

  approve(p: RadarPlaybook): void {
    this.radar.updatePlaybook(this.wsId, p.id, { pendingApproval: false, enabled: true }).subscribe({
      next: () => { this.msg.success(`Procédure « ${p.name} » approuvée`); this.reload(); },
      error: () => this.msg.error('Approbation impossible'),
    });
  }

  toggle(p: RadarPlaybook, enabled: boolean): void {
    this.radar.updatePlaybook(this.wsId, p.id, { enabled }).subscribe({
      next: () => { p.enabled = enabled; this.msg.success(enabled ? 'Procédure activée' : 'Procédure désactivée'); },
      error: () => this.msg.error('Modification impossible'),
    });
  }

  saveEdit(p: RadarPlaybook): void {
    this.radar.updatePlaybook(this.wsId, p.id, { procedure: p.procedure }).subscribe({
      next: () => { this.editing = null; this.msg.success('Procédure mise à jour'); },
      error: () => this.msg.error('Mise à jour impossible'),
    });
  }

  remove(p: RadarPlaybook): void {
    this.radar.deletePlaybook(this.wsId, p.id).subscribe({
      next: () => { this.playbooks = this.playbooks.filter(x => x.id !== p.id); this.regroup(); this.msg.success('Procédure supprimée'); },
      error: () => this.msg.error('Suppression impossible'),
    });
  }

  autonomyLabel(a: string): string {
    return ({ propose: 'Propose avant d\'agir', auto_with_report: 'Agit puis rend compte', full_auto: 'Autonome' } as any)[a] || a;
  }
  autonomyColor(a: string): string {
    return ({ propose: 'blue', auto_with_report: 'orange', full_auto: 'red' } as any)[a] || 'default';
  }
}
