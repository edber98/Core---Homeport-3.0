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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { RadarBackendService, RadarKnowledgeEntry } from '../../services/radar-backend.service';
import { AccessControlService } from '../../services/access-control.service';
import { UiMessageService } from '../../services/ui-message.service';

// « Ce que le radar sait de l'entreprise » — mémoire factuelle transparente :
// arborescences, contacts, conventions, règles. Éditable et corrigible.

const TOPICS = [
  { value: 'file_structure', label: 'Arborescence fichiers' },
  { value: 'contacts', label: 'Contacts clés' },
  { value: 'conventions', label: 'Conventions' },
  { value: 'processes', label: 'Processus' },
  { value: 'business_rules', label: 'Règles métier' },
  { value: 'custom', label: 'Autre' },
];

@Component({
  selector: 'radar-knowledge',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzTagModule, NzIconModule, NzInputModule, NzSelectModule,
    NzEmptyModule, NzSpinModule, NzPopconfirmModule, NzToolTipModule,
  ],
  template: `
  <p class="intro">La mémoire du radar sur votre entreprise. Il s'en sert dans toutes ses missions — corrigez ou complétez librement, il en tiendra compte immédiatement.</p>

  <div class="add-form">
    <nz-select [(ngModel)]="draft.topic" style="min-width: 170px">
      <nz-option *ngFor="let t of topics" [nzValue]="t.value" [nzLabel]="t.label"></nz-option>
    </nz-select>
    <input nz-input [(ngModel)]="draft.key" placeholder="Sujet (ex: arborescence factures fournisseurs)" style="max-width: 300px" />
    <input nz-input [(ngModel)]="draft.value" placeholder="Le fait (ex: /Compta/Fournisseurs/{ANNEE}/{MOIS})" style="flex: 1; min-width: 220px" />
    <button nz-button nzType="primary" class="primary" [disabled]="!draft.key?.trim() || !draft.value?.trim()" [nzLoading]="saving" (click)="add()">
      <span nz-icon nzType="plus"></span> Apprendre au radar
    </button>
  </div>

  <nz-spin [nzSpinning]="loading">
    <nz-empty *ngIf="!entries.length && !loading" nzNotFoundContent="Le radar n'a encore rien appris — répondez à ses questions ou ajoutez des faits ici."></nz-empty>
    <div class="topic-group" *ngFor="let g of grouped">
      <h3 class="zone-title">{{ topicLabel(g.topic) }}</h3>
      <div class="entry" *ngFor="let e of g.items">
        <div class="entry-main">
          <span class="entry-key">{{ e.key }}</span>
          <ng-container *ngIf="editing !== e.id">
            <span class="entry-value">{{ e.value }}</span>
          </ng-container>
          <textarea *ngIf="editing === e.id" nz-input rows="2" [(ngModel)]="editValue"></textarea>
        </div>
        <div class="entry-side">
          <nz-tag *ngIf="e.confidence === 'inferred'" nzColor="gold" nz-tooltip nzTooltipTitle="Déduit par le radar — à confirmer">Déduit</nz-tag>
          <nz-tag class="src-tag">{{ sourceLabel(e.source) }}</nz-tag>
          <ng-container *ngIf="editing !== e.id">
            <button nz-button nzSize="small" (click)="startEdit(e)"><span nz-icon nzType="edit"></span></button>
            <button nz-button nzSize="small" *ngIf="e.confidence === 'inferred'" nz-tooltip nzTooltipTitle="Confirmer ce fait" (click)="confirm(e)"><span nz-icon nzType="check"></span></button>
            <button nz-button nzSize="small" nzDanger nz-popconfirm nzPopconfirmTitle="Oublier ce fait ?" (nzOnConfirm)="remove(e)"><span nz-icon nzType="delete"></span></button>
          </ng-container>
          <ng-container *ngIf="editing === e.id">
            <button nz-button nzSize="small" nzType="primary" class="primary" (click)="saveEdit(e)">OK</button>
            <button nz-button nzSize="small" (click)="editing = null">Annuler</button>
          </ng-container>
        </div>
      </div>
    </div>
  </nz-spin>
  `,
  styles: [`
    :host { display: block; }
    .intro { color: #595959; font-size: 13px; margin-bottom: 14px; }
    .add-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
    .primary { background:#e61982; border-color:#e61982; color:#fff; }
    .zone-title { margin: 16px 0 8px; font-size: 14px; font-weight: 600; }
    .entry { display: flex; gap: 10px; align-items: flex-start; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; background: #fff; }
    .entry-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .entry-key { font-weight: 600; font-size: 13px; }
    .entry-value { color: #595959; font-size: 13px; white-space: pre-wrap; }
    .entry-side { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .src-tag { font-size: 11px; }
  `],
})
export class RadarKnowledgeComponent implements OnInit {
  topics = TOPICS;
  entries: RadarKnowledgeEntry[] = [];
  loading = false;
  saving = false;
  editing: string | null = null;
  editValue = '';
  draft: { topic: string; key?: string; value?: string } = { topic: 'custom' };

  constructor(private radar: RadarBackendService, private acl: AccessControlService, private msg: UiMessageService) {}

  get wsId(): string { return this.acl.currentWorkspaceId(); }

  ngOnInit(): void { this.reload(); }

  // Recalculé UNIQUEMENT quand les données changent — jamais en getter :
  // un getter retournant de nouveaux objets à chaque cycle de détection +
  // *ngFor = recréation infinie des vues (navigateur figé).
  grouped: { topic: string; items: RadarKnowledgeEntry[] }[] = [];

  private regroup(): void {
    const map = new Map<string, RadarKnowledgeEntry[]>();
    for (const e of this.entries) {
      if (!map.has(e.topic)) map.set(e.topic, []);
      map.get(e.topic)!.push(e);
    }
    this.grouped = [...map.entries()].map(([topic, items]) => ({ topic, items }));
  }

  reload(): void {
    if (!this.wsId) return;
    this.loading = true;
    this.radar.listKnowledge(this.wsId).subscribe({
      next: (l) => { this.entries = l; this.regroup(); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  add(): void {
    this.saving = true;
    this.radar.saveKnowledge(this.wsId, { topic: this.draft.topic, key: this.draft.key!.trim(), value: this.draft.value!.trim() }).subscribe({
      next: () => { this.saving = false; this.draft = { topic: this.draft.topic }; this.msg.success('Le radar a mémorisé ce fait'); this.reload(); },
      error: (e) => { this.saving = false; this.msg.error(e?.error?.message || 'Enregistrement impossible'); },
    });
  }

  startEdit(e: RadarKnowledgeEntry): void { this.editing = e.id; this.editValue = e.value; }

  saveEdit(e: RadarKnowledgeEntry): void {
    this.radar.updateKnowledge(this.wsId, e.id, { value: this.editValue }).subscribe({
      next: () => { this.editing = null; this.msg.success('Fait mis à jour'); this.reload(); },
      error: () => this.msg.error('Mise à jour impossible'),
    });
  }

  confirm(e: RadarKnowledgeEntry): void {
    this.radar.updateKnowledge(this.wsId, e.id, { confidence: 'confirmed' }).subscribe({
      next: () => { this.msg.success('Fait confirmé'); this.reload(); },
      error: () => this.msg.error('Confirmation impossible'),
    });
  }

  remove(e: RadarKnowledgeEntry): void {
    this.radar.deleteKnowledge(this.wsId, e.id).subscribe({
      next: () => { this.entries = this.entries.filter(x => x.id !== e.id); this.regroup(); this.msg.success('Fait oublié'); },
      error: () => this.msg.error('Suppression impossible'),
    });
  }

  topicLabel(t: string): string { return TOPICS.find(x => x.value === t)?.label || t; }
  sourceLabel(s: string): string {
    return ({ wizard: 'Configuration', user_answer: 'Votre réponse', radar_discovery: 'Découverte', user_spontaneous: 'Ajout manuel', supervisor: 'Radar' } as any)[s] || s;
  }
}
