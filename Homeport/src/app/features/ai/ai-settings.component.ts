import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AiService, AiAvailableAgent } from './ai.service';

@Component({
  selector: 'ai-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzInputModule, NzButtonModule, NzIconModule, NzEmptyModule, NzPopconfirmModule, NzToolTipModule, NzSpinModule, NzDividerModule, NzTagModule, NzAvatarModule],
  template: `
    <div class="settings-container" *ngIf="!loading; else loadingTpl">
      <!-- Section 1: Agent actif (pour le thread courant) -->
      <div class="settings-section">
        <div class="section-title">Agent actif</div>
        <div class="section-desc">Choisir l'agent pour les nouvelles conversations</div>
        <nz-select
          [(ngModel)]="selectedAgentId"
          (ngModelChange)="onAgentChange($event)"
          nzPlaceHolder="Choisir un agent"
          nzShowSearch
          style="width: 100%"
          [nzOptionHeightPx]="40">
          <nz-option-group *ngIf="systemAgents.length" nzLabel="Agents système">
            <nz-option *ngFor="let a of systemAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
              <div class="agent-option">
                <img *ngIf="a.icon" [src]="a.icon" class="agent-icon-img" />
                <span *ngIf="!a.icon" nz-icon nzType="robot" nzTheme="outline" class="agent-icon"></span>
                <div class="agent-option-text">
                  <span class="agent-name">{{ a.name }}</span>
                  <span class="agent-desc">{{ a.description }}</span>
                </div>
              </div>
            </nz-option>
          </nz-option-group>
          <nz-option-group *ngIf="customAgents.length" nzLabel="Agents personnalisés">
            <nz-option *ngFor="let a of customAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
              <div class="agent-option">
                <span nz-icon nzType="user" nzTheme="outline" class="agent-icon custom"></span>
                <div class="agent-option-text">
                  <span class="agent-name">{{ a.name }}</span>
                  <span class="agent-desc">{{ a.description }}</span>
                </div>
              </div>
            </nz-option>
          </nz-option-group>
        </nz-select>
      </div>

      <nz-divider></nz-divider>

      <!-- Section 2: Agents personnalisés -->
      <div class="settings-section">
        <div class="section-title">Agents personnalisés</div>
        <div class="section-desc">Créer des agents avec des instructions spécifiques</div>

        <div class="custom-agent-list" *ngIf="customAgents.length">
          <div class="custom-agent-item" *ngFor="let a of customAgents">
            <div class="ca-header">
              <span class="ca-name">{{ a.name }}</span>
              <div class="ca-actions">
                <button nz-button nzType="text" nzSize="small"
                  (click)="toggleEditAgent(a)"
                  nz-tooltip [nzTooltipTitle]="editingAgentId === a.id ? 'Fermer' : 'Modifier'">
                  <span nz-icon [nzType]="editingAgentId === a.id ? 'up' : 'edit'" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" nzDanger
                  nz-popconfirm nzPopconfirmTitle="Supprimer cet agent ?"
                  (nzOnConfirm)="deleteCustomAgent(a.id)">
                  <span nz-icon nzType="delete" nzTheme="outline"></span>
                </button>
              </div>
            </div>
            <div class="ca-desc">{{ a.description }}</div>
            <!-- Edit form -->
            <div class="ca-edit" *ngIf="editingAgentId === a.id">
              <label class="ca-label">Nom</label>
              <input nz-input [(ngModel)]="editName" nzSize="small" />
              <label class="ca-label">Description</label>
              <input nz-input [(ngModel)]="editDescription" nzSize="small" />
              <label class="ca-label">Instructions système</label>
              <textarea nz-input [(ngModel)]="editSystemPrompt" [nzAutosize]="{ minRows: 2, maxRows: 8 }" nzSize="small"></textarea>
              <button nz-button nzType="primary" nzSize="small" (click)="saveEditAgent(a.id)" style="margin-top: 6px">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        <!-- Create new agent -->
        <div class="create-agent" *ngIf="!showCreateForm">
          <button nz-button nzType="dashed" (click)="showCreateForm = true" nzBlock>
            <span nz-icon nzType="plus" nzTheme="outline"></span> Créer un agent
          </button>
        </div>
        <div class="create-agent-form" *ngIf="showCreateForm">
          <label class="ca-label">Nom</label>
          <input nz-input [(ngModel)]="newAgentName" placeholder="Ex : Expert comptabilité" nzSize="small" />
          <label class="ca-label">Description</label>
          <input nz-input [(ngModel)]="newAgentDescription" placeholder="Décrit le rôle de l'agent" nzSize="small" />
          <label class="ca-label">Instructions système</label>
          <textarea nz-input [(ngModel)]="newAgentPrompt" placeholder="Instructions spécifiques pour cet agent..." [nzAutosize]="{ minRows: 2, maxRows: 6 }" nzSize="small"></textarea>
          <div class="create-btns">
            <button nz-button nzSize="small" (click)="showCreateForm = false">Annuler</button>
            <button nz-button nzType="primary" nzSize="small" (click)="createCustomAgent()" [disabled]="!newAgentName.trim()">Créer</button>
          </div>
        </div>
      </div>

      <nz-divider></nz-divider>

      <!-- Section 3: Instructions utilisateur -->
      <div class="settings-section">
        <div class="section-title">Instructions personnalisées</div>
        <div class="section-desc">Consignes appliquées à toutes les conversations</div>
        <textarea nz-input
          [(ngModel)]="customInstructions"
          (ngModelChange)="onInstructionsChange($event)"
          placeholder="Ex : Je travaille principalement avec Odoo et Slack..."
          [nzAutosize]="{ minRows: 2, maxRows: 6 }">
        </textarea>
        <div class="save-hint" *ngIf="instructionsSaving">Sauvegarde...</div>
      </div>

      <nz-divider></nz-divider>

      <!-- Section 4: Mémoire -->
      <div class="settings-section">
        <div class="section-title">Mémoire</div>
        <div class="section-desc">Informations retenues par l'assistant</div>
        <div *ngIf="memoryKeys.length === 0" class="memory-empty">
          <nz-empty nzNotFoundContent="Aucune mémoire sauvegardée" [nzNotFoundFooter]="emptyFooter">
            <ng-template #emptyFooter>
              <span class="empty-hint">L'assistant retiendra vos préférences au fil des conversations.</span>
            </ng-template>
          </nz-empty>
        </div>
        <div class="memory-list" *ngIf="memoryKeys.length > 0">
          <div class="memory-item" *ngFor="let key of memoryKeys">
            <div class="memory-content">
              <div class="memory-key">{{ key }}</div>
              <div class="memory-value">{{ formatMemoryValue(memory[key]) }}</div>
            </div>
            <button nz-button nzType="text" nzSize="small" nzDanger
              nz-popconfirm nzPopconfirmTitle="Supprimer cette mémoire ?"
              (nzOnConfirm)="deleteMemory(key)"
              nz-tooltip nzTooltipTitle="Supprimer">
              <span nz-icon nzType="delete" nzTheme="outline"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading"><nz-spin nzSimple></nz-spin></div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .settings-container { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .settings-section { }
    .section-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
    .section-desc { font-size: 12px; color: #999; margin-bottom: 10px; }
    .agent-option { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
    .agent-icon { font-size: 16px; color: #1677ff; }
    .agent-icon.custom { color: #722ed1; }
    .agent-icon-img { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; }
    .agent-option-text { display: flex; flex-direction: column; min-width: 0; }
    .agent-name { font-size: 13px; font-weight: 500; }
    .agent-desc { font-size: 11px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
    .custom-agent-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .custom-agent-item { padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0; }
    .ca-header { display: flex; align-items: center; justify-content: space-between; }
    .ca-name { font-weight: 600; font-size: 13px; }
    .ca-actions { display: flex; gap: 2px; }
    .ca-desc { font-size: 12px; color: #666; margin-top: 2px; }
    .ca-edit { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
    .ca-label { font-size: 11px; font-weight: 600; color: #666; margin-top: 4px; }
    .create-agent { margin-top: 4px; }
    .create-agent-form { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: #f6f8fa; border-radius: 8px; border: 1px dashed #d9d9d9; margin-top: 4px; }
    .create-btns { display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end; }
    .save-hint { font-size: 11px; color: #999; margin-top: 4px; }
    .memory-empty { padding: 20px 0; }
    .empty-hint { font-size: 12px; color: #999; }
    .memory-list { display: flex; flex-direction: column; gap: 6px; }
    .memory-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0; }
    .memory-content { flex: 1; min-width: 0; }
    .memory-key { font-weight: 600; font-size: 12px; color: #333; }
    .memory-value { font-size: 12px; color: #666; margin-top: 2px; word-break: break-word; white-space: pre-wrap; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 60px; }
  `]
})
export class AiSettingsComponent implements OnInit, OnDestroy {
  selectedAgentId = 'general';
  systemAgents: AiAvailableAgent[] = [];
  customAgents: AiAvailableAgent[] = [];
  customInstructions = '';
  instructionsSaving = false;
  memory: Record<string, any> = {};
  memoryKeys: string[] = [];
  loading = true;

  // Create agent form
  showCreateForm = false;
  newAgentName = '';
  newAgentDescription = '';
  newAgentPrompt = '';

  // Edit agent
  editingAgentId: string | null = null;
  editName = '';
  editDescription = '';
  editSystemPrompt = '';

  private destroy$ = new Subject<void>();
  private instructions$ = new Subject<string>();

  constructor(private ai: AiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.instructions$.pipe(
      debounceTime(800),
      takeUntil(this.destroy$),
    ).subscribe(val => {
      this.ai.updatePreferences({ customInstructions: val }).subscribe({
        next: () => { this.instructionsSaving = false; this.cdr.detectChanges(); },
        error: () => { this.instructionsSaving = false; this.cdr.detectChanges(); },
      });
    });

    this.loadAll();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll() {
    this.loading = true;

    // Load agents
    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
      },
    });

    // Load context (user preferences + memory)
    this.ai.getContext().subscribe({
      next: (res: any) => {
        const ctx = res?.data || res;
        const user = ctx?.user || {};
        this.customInstructions = user.preferences?.customInstructions || '';
        this.memory = user.memory || {};
        this.memoryKeys = Object.keys(this.memory);

        // Set selected agent from current thread or default
        const thread = this.ai.currentThread();
        this.selectedAgentId = thread?.agentId || this.ai.selectedAgentId() || 'general';

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onAgentChange(agentId: string) {
    this.ai.selectedAgentId.set(agentId);
    // If there's a current thread, update its agentId for future messages
    // (the backend uses thread.agentId for prompt generation)
  }

  onInstructionsChange(val: string) {
    this.instructionsSaving = true;
    this.instructions$.next(val);
  }

  // ── Custom agent CRUD ──
  createCustomAgent() {
    const name = this.newAgentName.trim();
    if (!name) return;
    this.ai.createAgent({
      name,
      description: this.newAgentDescription.trim(),
      systemPrompt: this.newAgentPrompt.trim(),
    }).subscribe({
      next: () => {
        this.newAgentName = '';
        this.newAgentDescription = '';
        this.newAgentPrompt = '';
        this.showCreateForm = false;
        this.reloadAgents();
      },
    });
  }

  toggleEditAgent(agent: AiAvailableAgent) {
    if (this.editingAgentId === agent.id) {
      this.editingAgentId = null;
      return;
    }
    this.editingAgentId = agent.id;
    this.editName = agent.name;
    this.editDescription = agent.description;
    // Need to load full agent data for systemPrompt
    this.editSystemPrompt = '';
    // Custom agents from the list don't have systemPrompt, load it
    this.ai.searchTools('').subscribe(); // not needed, just use inline
  }

  saveEditAgent(agentId: string) {
    this.ai.updateAgent(agentId, {
      name: this.editName.trim(),
      description: this.editDescription.trim(),
      systemPrompt: this.editSystemPrompt.trim(),
    }).subscribe({
      next: () => {
        this.editingAgentId = null;
        this.reloadAgents();
      },
    });
  }

  deleteCustomAgent(agentId: string) {
    this.ai.deleteAgent(agentId).subscribe({
      next: () => this.reloadAgents(),
    });
  }

  private reloadAgents() {
    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
        this.cdr.detectChanges();
      },
    });
  }

  deleteMemory(key: string) {
    this.ai.deleteMemoryKey(key).subscribe({
      next: () => {
        delete this.memory[key];
        this.memoryKeys = Object.keys(this.memory);
        this.cdr.detectChanges();
      },
    });
  }

  formatMemoryValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    try { return JSON.stringify(val, null, 2); } catch { return String(val); }
  }
}
