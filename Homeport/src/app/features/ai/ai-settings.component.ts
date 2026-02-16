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
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AiService, AiAvailableAgent } from './ai.service';
import { AccessControlService } from '../../services/access-control.service';
import { ApiClientService } from '../../services/api-client.service';

@Component({
  selector: 'ai-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzInputModule, NzButtonModule, NzIconModule, NzEmptyModule, NzPopconfirmModule, NzToolTipModule, NzSpinModule, NzDividerModule, NzTagModule, NzAvatarModule, NzTabsModule, NzCheckboxModule, NzInputNumberModule],
  template: `
    <div class="settings-container" *ngIf="!loading; else loadingTpl">
      <nz-tabset nzSize="small" nzType="card">
        <!-- Tab 1: Agents -->
        <nz-tab nzTitle="Agents">
          <div class="tab-content">
            <div class="settings-section">
              <div class="section-title">Agent actif</div>
              <div class="section-desc">Choisir l'agent pour les nouvelles conversations</div>
              <nz-select
                class="active-agent-select"
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
              <div class="active-agent-info">
                <div class="aai-row" *ngIf="selectedAgentInfo()?.description"><span class="aai-label">Description</span> {{ selectedAgentInfo()?.description }}</div>
                <div class="aai-row"><span class="aai-label">Type</span> {{ selectedAgentInfo()?.type === 'custom' ? 'Personnalisé' : 'Système' }}</div>
                <div class="aai-row"><span class="aai-label">Autonomie</span> {{ autonomyLabel(selectedAgentInfo()?.autonomyLevel) }}</div>
                <div class="aai-row" *ngIf="(selectedAgentInfo()?.allowedProviders?.length || 0) > 0"><span class="aai-label">Providers</span> {{ selectedAgentInfo()?.allowedProviders?.join(', ') }}</div>
                <div class="aai-row" *ngIf="(selectedAgentInfo()?.toolCount || 0) > 0"><span class="aai-label">Actions</span> {{ selectedAgentInfo()?.toolCount }}</div>
              </div>
            </div>

            <nz-divider></nz-divider>

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
                  <div class="ca-edit agent-customization-form" *ngIf="editingAgentId === a.id">
                    <label class="ca-label">Nom</label>
                    <input nz-input [(ngModel)]="editName" nzSize="small" />
                    <label class="ca-label">Description</label>
                    <input nz-input [(ngModel)]="editDescription" nzSize="small" />
                    <label class="ca-label">Providers associés</label>
                    <nz-select [(ngModel)]="editAllowedProviders" nzMode="multiple" nzPlaceHolder="Tous les providers" nzSize="small" style="width: 100%">
                      <nz-option *ngFor="let p of availableProviderKeys" [nzValue]="p.key" [nzLabel]="p.name" nzCustomContent>
                        <div class="provider-opt">
                          <img *ngIf="p.icon" [src]="p.icon" class="provider-opt-icon" />
                          <span>{{ p.name }}</span>
                        </div>
                      </nz-option>
                    </nz-select>
                    <div class="field-hint">L'agent aura accès aux outils de ces providers</div>
                    <label class="ca-label">Instructions système</label>
                    <textarea nz-input [(ngModel)]="editSystemPrompt" [nzAutosize]="{ minRows: 2, maxRows: 8 }" nzSize="small"></textarea>
                    <label class="ca-label">Groupes d'outils</label>
                    <div class="tool-groups-grid">
                      <label *ngFor="let g of allToolGroups" nz-checkbox [nzChecked]="editToolGroups.includes(g.key)" (nzCheckedChange)="toggleToolGroup(g.key, $event)">
                        {{ g.label }}
                      </label>
                    </div>
                    <div class="field-hint">Vide = tous les groupes (par défaut)</div>
                    <label class="ca-label">Outils bloqués</label>
                    <nz-select [(ngModel)]="editBlockedTools" nzMode="tags" nzPlaceHolder="Noms des outils à bloquer" nzSize="small" style="width: 100%"></nz-select>
                    <div class="field-hint">Ex : deploy_flow, undeploy_flow</div>
                    <label class="ca-label">Comportement du routeur</label>
                    <nz-select [(ngModel)]="editRouterBehavior" nzSize="small" style="width: 100%">
                      <nz-option nzValue="auto" nzLabel="Auto (routeur en chat uniquement)"></nz-option>
                      <nz-option nzValue="skip" nzLabel="Direct (pas de routeur)"></nz-option>
                      <nz-option nzValue="force" nzLabel="Forcer (toujours via le routeur)"></nz-option>
                    </nz-select>
                    <label class="ca-label">Niveau d'autonomie</label>
                    <nz-select [(ngModel)]="editAutonomyLevel" nzSize="small" style="width: 100%">
                      <nz-option nzValue="prudent" nzLabel="Prudent (confirme les écritures)"></nz-option>
                      <nz-option nzValue="balanced" nzLabel="Équilibré (confirme les destructives)"></nz-option>
                      <nz-option nzValue="autonomous" nzLabel="Autonome (agit directement)"></nz-option>
                    </nz-select>
                    <label class="ca-label">Boucles max</label>
                    <nz-input-number [(ngModel)]="editMaxToolLoops" [nzMin]="1" [nzMax]="100" nzSize="small" style="width: 100%"></nz-input-number>
                    <button nz-button nzType="primary" nzSize="small" (click)="saveEditAgent(a.id)" style="margin-top: 6px">
                      Sauvegarder
                    </button>
                  </div>
                </div>
              </div>

              <div class="create-agent" *ngIf="!showCreateForm">
                <button nz-button nzType="dashed" class="create-agent-btn" (click)="showCreateForm = true" nzBlock>
                  <span nz-icon nzType="plus" nzTheme="outline"></span> Créer un agent
                </button>
              </div>
              <div class="create-agent-form agent-customization-form" *ngIf="showCreateForm">
                <label class="ca-label">Nom</label>
                <input nz-input [(ngModel)]="newAgentName" placeholder="Ex : Expert comptabilité" nzSize="small" />
                <label class="ca-label">Description</label>
                <input nz-input [(ngModel)]="newAgentDescription" placeholder="Décrit le rôle de l'agent" nzSize="small" />
                <label class="ca-label">Providers associés</label>
                <nz-select [(ngModel)]="newAgentProviders" nzMode="multiple" nzPlaceHolder="Sélectionner les providers" nzSize="small" style="width: 100%">
                  <nz-option *ngFor="let p of availableProviderKeys" [nzValue]="p.key" [nzLabel]="p.name" nzCustomContent>
                    <div class="provider-opt">
                      <img *ngIf="p.icon" [src]="p.icon" class="provider-opt-icon" />
                      <span>{{ p.name }}</span>
                    </div>
                  </nz-option>
                </nz-select>
                <div class="field-hint">L'agent aura accès aux outils de ces providers</div>
                <label class="ca-label">Instructions système</label>
                <textarea nz-input [(ngModel)]="newAgentPrompt" placeholder="Instructions spécifiques pour cet agent..." [nzAutosize]="{ minRows: 2, maxRows: 6 }" nzSize="small"></textarea>
                <label class="ca-label">Groupes d'outils</label>
                <div class="tool-groups-grid">
                  <label *ngFor="let g of allToolGroups" nz-checkbox [nzChecked]="newAgentToolGroups.includes(g.key)" (nzCheckedChange)="toggleNewToolGroup(g.key, $event)">
                    {{ g.label }}
                  </label>
                </div>
                <div class="field-hint">Vide = tous les groupes (par défaut)</div>
                <label class="ca-label">Niveau d'autonomie</label>
                <nz-select [(ngModel)]="newAgentAutonomyLevel" nzSize="small" style="width: 100%">
                  <nz-option nzValue="prudent" nzLabel="Prudent (confirme les écritures)"></nz-option>
                  <nz-option nzValue="balanced" nzLabel="Équilibré (confirme les destructives)"></nz-option>
                  <nz-option nzValue="autonomous" nzLabel="Autonome (agit directement)"></nz-option>
                </nz-select>
                <label class="ca-label">Comportement du routeur</label>
                <nz-select [(ngModel)]="newAgentRouterBehavior" nzSize="small" style="width: 100%">
                  <nz-option nzValue="auto" nzLabel="Auto"></nz-option>
                  <nz-option nzValue="skip" nzLabel="Direct"></nz-option>
                  <nz-option nzValue="force" nzLabel="Forcer le routeur"></nz-option>
                </nz-select>
                <div class="create-btns">
                  <button nz-button nzSize="small" (click)="showCreateForm = false">Annuler</button>
                  <button nz-button nzType="primary" nzSize="small" (click)="createCustomAgent()" [disabled]="!newAgentName.trim()">Créer</button>
                </div>
              </div>
            </div>
          </div>
        </nz-tab>

        <!-- Tab 2: Mémoire -->
        <nz-tab nzTitle="Mémoire">
          <div class="tab-content">
            <!-- Project memory -->
            <div class="settings-section" *ngIf="projectElementType">
              <div class="section-title">
                <span nz-icon nzType="project" nzTheme="outline"></span>
                Mémoire du projet
              </div>
              <div class="section-desc">Informations liées au {{ projectElementType === 'flow' ? 'workflow' : 'formulaire' }} en cours</div>
              <div *ngIf="projectMemoryKeys.length === 0" class="memory-empty-inline">
                <span class="empty-hint">Aucune mémoire projet.</span>
              </div>
              <div class="memory-list" *ngIf="projectMemoryKeys.length > 0">
                <div class="memory-item project" *ngFor="let key of projectMemoryKeys">
                  <div class="memory-content">
                    <div class="memory-key">{{ key }}</div>
                    <div class="memory-value">{{ formatMemoryValue(projectMemory[key]) }}</div>
                  </div>
                  <button nz-button nzType="text" nzSize="small" nzDanger
                    nz-popconfirm nzPopconfirmTitle="Supprimer cette mémoire projet ?"
                    (nzOnConfirm)="deleteProjectMemory(key)"
                    nz-tooltip nzTooltipTitle="Supprimer">
                    <span nz-icon nzType="delete" nzTheme="outline"></span>
                  </button>
                </div>
              </div>
              <nz-divider></nz-divider>
            </div>

            <!-- Global memory -->
            <div class="settings-section">
              <div class="section-title">
                <span nz-icon nzType="global" nzTheme="outline"></span>
                Mémoire globale
              </div>
              <div class="section-desc">Préférences et habitudes partagées entre toutes les conversations</div>
              <div *ngIf="memoryKeys.length === 0" class="memory-empty-inline">
                <span class="empty-hint">L'assistant retiendra vos préférences au fil des conversations.</span>
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
        </nz-tab>

        <!-- Tab 3: Instructions -->
        <nz-tab nzTitle="Instructions">
          <div class="tab-content">
            <div class="settings-section">
              <div class="section-title">Instructions personnalisées</div>
              <div class="section-desc">Consignes appliquées à toutes les conversations</div>
              <textarea nz-input
                class="custom-instructions-input"
                [(ngModel)]="customInstructions"
                (ngModelChange)="onInstructionsChange($event)"
                placeholder="Ex : Je travaille principalement avec Odoo et Slack..."
                [nzAutosize]="{ minRows: 4, maxRows: 12 }">
              </textarea>
              <div class="save-hint" *ngIf="instructionsSaving">Sauvegarde...</div>
            </div>
          </div>
        </nz-tab>

        <!-- Tab 4: MCP Servers -->
        <nz-tab nzTitle="MCP">
          <div class="tab-content">
            <div class="settings-section">
              <div class="section-title">Serveurs MCP</div>
              <div class="section-desc">Outils externes connectés via le protocole MCP</div>

              <div class="mcp-server-list" *ngIf="mcpServers.length">
                <div class="mcp-server-item" *ngFor="let s of mcpServers">
                  <div class="ca-header">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <span class="mcp-status" [class.connected]="s.status?.connected"></span>
                      <span class="ca-name">{{ s.name }}</span>
                      <nz-tag [nzColor]="s.transport === 'stdio' ? 'blue' : 'green'" style="font-size: 10px">{{ s.transport }}</nz-tag>
                    </div>
                    <div class="ca-actions">
                      <button nz-button nzType="text" nzSize="small"
                        (click)="s.status?.connected ? disconnectMcp(s) : connectMcp(s)"
                        nz-tooltip [nzTooltipTitle]="s.status?.connected ? 'Déconnecter' : 'Connecter'">
                        <span nz-icon [nzType]="s.status?.connected ? 'disconnect' : 'api'" nzTheme="outline"></span>
                      </button>
                      <button nz-button nzType="text" nzSize="small" nzDanger
                        nz-popconfirm nzPopconfirmTitle="Supprimer ce serveur ?"
                        (nzOnConfirm)="deleteMcpServer(s)">
                        <span nz-icon nzType="delete" nzTheme="outline"></span>
                      </button>
                    </div>
                  </div>
                  <div class="ca-desc">
                    {{ s.transport === 'stdio' ? s.command : s.url }}
                    <span *ngIf="s.status?.toolCount"> · {{ s.status.toolCount }} outils</span>
                  </div>
                </div>
              </div>

              <div *ngIf="mcpServers.length === 0" class="memory-empty-inline">
                <span class="empty-hint">Aucun serveur MCP configuré.</span>
              </div>

              <div class="create-agent" *ngIf="!showMcpForm">
                <button nz-button nzType="dashed" class="create-agent-btn" (click)="showMcpForm = true" nzBlock>
                  <span nz-icon nzType="plus" nzTheme="outline"></span> Ajouter un serveur MCP
                </button>
              </div>
              <div class="create-agent-form agent-customization-form" *ngIf="showMcpForm">
                <label class="ca-label">Nom</label>
                <input nz-input [(ngModel)]="newMcpName" placeholder="Ex : Mon serveur CRM" nzSize="small" />
                <label class="ca-label">Transport</label>
                <nz-select [(ngModel)]="newMcpTransport" nzSize="small" style="width: 100%">
                  <nz-option nzValue="stdio" nzLabel="stdio (commande locale)"></nz-option>
                  <nz-option nzValue="sse" nzLabel="SSE/HTTP (URL distante)"></nz-option>
                </nz-select>
                <ng-container *ngIf="newMcpTransport === 'stdio'">
                  <label class="ca-label">Commande</label>
                  <input nz-input [(ngModel)]="newMcpCommand" placeholder="npx mcp-server-xxx" nzSize="small" />
                </ng-container>
                <ng-container *ngIf="newMcpTransport === 'sse'">
                  <label class="ca-label">URL</label>
                  <input nz-input [(ngModel)]="newMcpUrl" placeholder="http://localhost:3001/mcp" nzSize="small" />
                </ng-container>
                <label class="ca-label">Préfixe outils</label>
                <input nz-input [(ngModel)]="newMcpPrefix" placeholder="Ex : crm" nzSize="small" />
                <div class="field-hint">Préfixe ajouté aux noms d'outils pour éviter les collisions</div>
                <div class="create-btns mcp-create-btns">
                  <button nz-button nzSize="small" class="mcp-cancel-btn" (click)="showMcpForm = false">Annuler</button>
                  <button nz-button nzType="primary" nzSize="small" class="mcp-add-btn" (click)="createMcpServer()" [disabled]="!newMcpName.trim()">Ajouter</button>
                </div>
              </div>
            </div>
          </div>
        </nz-tab>

        <!-- Tab 5: Admin (visible si admin) -->
        <nz-tab *ngIf="isAdmin" nzTitle="Admin">
          <div class="tab-content">
            <div class="settings-section">
              <div class="section-title">Statistiques IA</div>
              <div class="section-desc">Utilisation dans ce workspace</div>
              <div class="stats-grid" *ngIf="stats">
                <div class="stat-card">
                  <div class="stat-value">{{ stats.threadCount }}</div>
                  <div class="stat-label">Conversations</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ stats.messageCount }}</div>
                  <div class="stat-label">Messages</div>
                </div>
              </div>
              <div *ngIf="!stats" class="memory-empty-inline">
                <button nz-button nzSize="small" class="admin-stats-btn" (click)="loadStats()">Charger les statistiques</button>
              </div>
            </div>

            <nz-divider *ngIf="stats?.topTools?.length"></nz-divider>

            <div class="settings-section" *ngIf="stats?.topTools?.length">
              <div class="section-title">Outils les plus utilisés</div>
              <div class="tool-usage-list">
                <div class="tool-usage-item" *ngFor="let t of stats.topTools">
                  <span class="tool-name">{{ t.name }}</span>
                  <nz-tag>{{ t.count }}</nz-tag>
                </div>
              </div>
            </div>

            <nz-divider></nz-divider>

            <div class="settings-section">
              <div class="section-title">Contexte entreprise</div>
              <div class="section-desc">Informations détectées automatiquement</div>
              <pre class="context-json" *ngIf="stats?.companyContext">{{ formatJson(stats.companyContext) }}</pre>
              <div *ngIf="!stats?.companyContext" class="memory-empty-inline"><span class="empty-hint">Non chargé</span></div>
            </div>

            <nz-divider></nz-divider>

            <div class="settings-section">
              <div class="section-title">Contexte workspace</div>
              <pre class="context-json" *ngIf="stats?.workspaceContext">{{ formatJson(stats.workspaceContext) }}</pre>
              <div *ngIf="!stats?.workspaceContext" class="memory-empty-inline"><span class="empty-hint">Non chargé</span></div>
            </div>
          </div>
        </nz-tab>
      </nz-tabset>
    </div>

    <ng-template #loadingTpl>
      <div class="loading"><nz-spin nzSimple></nz-spin></div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .settings-container { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
    .tab-content { padding: 12px 0; }
    .settings-section { }
    .section-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
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
    .create-agent-btn.ant-btn-dashed:hover:not(:disabled),
    .create-agent-btn.ant-btn-dashed:focus-visible:not(:disabled) {
      border-color: #1677ff !important;
      color: #1677ff !important;
      border-style: dashed;
    }
    :host ::ng-deep .active-agent-select .ant-select-selector:hover {
      border-color: #1677ff !important;
    }
    :host ::ng-deep .active-agent-select .ant-select-focused .ant-select-selector,
    :host ::ng-deep .active-agent-select .ant-select-open .ant-select-selector,
    :host ::ng-deep .active-agent-select .ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector,
    :host ::ng-deep .active-agent-select.ant-select-focused .ant-select-selector,
    :host ::ng-deep .active-agent-select.ant-select-open .ant-select-selector {
      border-color: #1677ff !important;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
    }
    :host ::ng-deep .agent-customization-form .ant-input:hover,
    :host ::ng-deep .agent-customization-form .ant-input-number:hover,
    :host ::ng-deep .agent-customization-form .ant-select-selector:hover {
      border-color: #1677ff !important;
    }
    :host ::ng-deep .agent-customization-form .ant-input:focus,
    :host ::ng-deep .agent-customization-form .ant-input-focused,
    :host ::ng-deep .agent-customization-form .ant-input-number-focused,
    :host ::ng-deep .agent-customization-form .ant-select-focused .ant-select-selector,
    :host ::ng-deep .agent-customization-form .ant-select-open .ant-select-selector,
    :host ::ng-deep .agent-customization-form .ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector {
      border-color: #1677ff !important;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
    }
    :host ::ng-deep .agent-customization-form .ant-input-number-focused .ant-input-number-input {
      box-shadow: none !important;
    }
    .create-agent-form { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: #f6f8fa; border-radius: 8px; border: 1px dashed #d9d9d9; margin-top: 4px; }
    .create-btns { display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end; }
    .mcp-create-btns .mcp-add-btn.ant-btn-primary,
    .mcp-create-btns .mcp-add-btn.ant-btn-primary:not(:disabled) {
      background: #1677ff;
      border-color: #1677ff;
      color: #fff;
    }
    .mcp-create-btns .mcp-add-btn.ant-btn-primary:hover:not(:disabled),
    .mcp-create-btns .mcp-add-btn.ant-btn-primary:focus-visible:not(:disabled) {
      background: #0958d9;
      border-color: #0958d9;
      color: #fff;
    }
    .mcp-create-btns .mcp-cancel-btn.ant-btn:hover:not(:disabled),
    .mcp-create-btns .mcp-cancel-btn.ant-btn:focus-visible:not(:disabled) {
      border-color: #ff4d4f !important;
      color: #ff4d4f !important;
    }
    .provider-opt { display: flex; align-items: center; gap: 6px; }
    .provider-opt-icon { width: 16px; height: 16px; border-radius: 3px; object-fit: contain; }
    .field-hint { font-size: 11px; color: #999; margin-top: 2px; }
    .active-agent-info { margin-top: 8px; padding: 8px 10px; background: #f6f8fa; border-radius: 6px; border: 1px solid #f0f0f0; }
    .aai-row { font-size: 12px; color: #666; margin-bottom: 2px; }
    .aai-row:last-child { margin-bottom: 0; }
    .aai-label { font-weight: 600; color: #333; margin-right: 4px; }
    .save-hint { font-size: 11px; color: #999; margin-top: 4px; }
    .admin-stats-btn.ant-btn,
    .admin-stats-btn.ant-btn:not(:disabled) {
      background: #1677ff;
      border-color: #1677ff;
      color: #fff;
    }
    .admin-stats-btn.ant-btn:hover:not(:disabled),
    .admin-stats-btn.ant-btn:focus-visible:not(:disabled) {
      background: #0958d9;
      border-color: #0958d9;
      color: #fff;
    }
    .memory-empty-inline { padding: 8px 0; }
    .memory-item.project { border-color: #d9e8ff; background: #f0f7ff; }
    .empty-hint { font-size: 12px; color: #999; }
    .memory-list { display: flex; flex-direction: column; gap: 6px; }
    .memory-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #fafafa; border-radius: 6px; border: 1px solid #f0f0f0; }
    .memory-content { flex: 1; min-width: 0; }
    .memory-key { font-weight: 600; font-size: 12px; color: #333; }
    .memory-value { font-size: 12px; color: #666; margin-top: 2px; word-break: break-word; white-space: pre-wrap; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 60px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .stat-card { padding: 12px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 11px; color: #999; margin-top: 2px; }
    .tool-usage-list { display: flex; flex-direction: column; gap: 4px; }
    .tool-usage-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 4px; }
    .tool-usage-item:hover { background: #fafafa; }
    .tool-name { font-size: 12px; font-weight: 500; }
    .context-json { font-size: 11px; background: #f5f5f5; padding: 10px; border-radius: 6px; overflow: auto; max-height: 300px; white-space: pre-wrap; word-break: break-all; }
    .tool-groups-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 8px; }
    .tool-groups-grid label { font-size: 12px; }
    :host ::ng-deep .tool-groups-grid .ant-checkbox-wrapper:hover .ant-checkbox-inner,
    :host ::ng-deep .tool-groups-grid .ant-checkbox:hover .ant-checkbox-inner {
      border-color: #1677ff !important;
    }
    :host ::ng-deep .tool-groups-grid .ant-checkbox-checked .ant-checkbox-inner {
      background-color: #1677ff !important;
      border-color: #1677ff !important;
    }
    :host ::ng-deep .tool-groups-grid .ant-checkbox-input:focus + .ant-checkbox-inner {
      border-color: #1677ff !important;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
    }
    :host ::ng-deep textarea.custom-instructions-input.ant-input:hover {
      border-color: #1677ff !important;
    }
    :host ::ng-deep textarea.custom-instructions-input.ant-input:focus,
    :host ::ng-deep textarea.custom-instructions-input.ant-input-focused {
      border-color: #1677ff !important;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
    }
    .mcp-server-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .mcp-server-item { padding: 10px 12px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0; }
    .mcp-status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #d9d9d9; }
    .mcp-status.connected { background: #52c41a; }
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
  projectMemory: Record<string, any> = {};
  projectMemoryKeys: string[] = [];
  projectElementType: 'flow' | 'form' | null = null;
  projectElementId: string | null = null;
  loading = true;
  isAdmin = false;
  stats: any = null;

  availableProviderKeys: { key: string; name: string; icon: string | null }[] = [];

  showCreateForm = false;
  newAgentName = '';
  newAgentDescription = '';
  newAgentPrompt = '';
  newAgentProviders: string[] = [];

  editingAgentId: string | null = null;
  editName = '';
  editDescription = '';
  editSystemPrompt = '';
  editAllowedProviders: string[] = [];
  editToolGroups: string[] = [];
  editBlockedTools: string[] = [];
  editRouterBehavior = 'auto';
  editAutonomyLevel = 'autonomous';
  editMaxToolLoops = 40;

  newAgentToolGroups: string[] = [];
  newAgentAutonomyLevel = 'autonomous';
  newAgentRouterBehavior = 'auto';

  // MCP
  mcpServers: any[] = [];
  showMcpForm = false;
  newMcpName = '';
  newMcpTransport = 'stdio';
  newMcpCommand = '';
  newMcpUrl = '';
  newMcpPrefix = '';

  allToolGroups = [
    { key: 'core', label: 'Core (mémoire, questions)' },
    { key: 'navigation', label: 'Navigation (ouvrir)' },
    { key: 'execution', label: 'Exécution (providers)' },
    { key: 'workflow_search', label: 'Recherche workflows' },
    { key: 'project_memory', label: 'Mémoire projet' },
    { key: 'thread', label: 'Thread (transfert)' },
    { key: 'workflow', label: 'Workflow (builder)' },
    { key: 'form', label: 'Formulaire (builder)' },
    { key: 'node_args', label: 'Node args' },
    { key: 'mcp', label: 'MCP (externe)' },
  ];

  private destroy$ = new Subject<void>();
  private instructions$ = new Subject<string>();

  constructor(private ai: AiService, private cdr: ChangeDetectorRef, private acl: AccessControlService, private apiClient: ApiClientService) {}

  ngOnInit() {
    this.isAdmin = (this.acl.currentUser()?.role || 'member') === 'admin';

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

    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
        this.availableProviderKeys = this.systemAgents
          .filter(a => a.id.startsWith('provider:'))
          .map(a => ({ key: a.id.slice('provider:'.length), name: a.name, icon: a.icon }));
      },
    });

    this.loadMcpServers();

    this.ai.getContext().subscribe({
      next: (res: any) => {
        const ctx = res?.data || res;
        const user = ctx?.user || {};
        this.customInstructions = user.preferences?.customInstructions || '';
        this.memory = user.memory || {};
        this.memoryKeys = Object.keys(this.memory);

        const thread = this.ai.currentThread();
        this.selectedAgentId = thread?.agentId || this.ai.selectedAgentId() || 'general';

        this.projectElementType = null;
        this.projectElementId = null;
        if (thread?.flowId) {
          this.projectElementType = 'flow';
          this.projectElementId = thread.flowId;
        } else if (thread?.metadata?.formId) {
          this.projectElementType = 'form';
          this.projectElementId = thread.metadata.formId;
        }
        if (this.projectElementType && this.projectElementId) {
          this.loadProjectMemory();
        }

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
  }

  selectedAgentInfo(): AiAvailableAgent {
    const all = [...this.systemAgents, ...this.customAgents];
    return all.find(a => a.id === this.selectedAgentId)
      || { id: 'general', name: 'Général', description: 'Assistant polyvalent', icon: null, type: 'system' as const, toolCount: 0 };
  }

  autonomyLabel(level?: string): string {
    switch (level || 'autonomous') {
      case 'prudent': return 'Prudent (confirme les écritures)';
      case 'balanced': return 'Équilibré (confirme les destructives)';
      case 'autonomous': return 'Autonome (agit directement)';
      default: return level || 'Autonome';
    }
  }

  onInstructionsChange(val: string) {
    this.instructionsSaving = true;
    this.instructions$.next(val);
  }

  createCustomAgent() {
    const name = this.newAgentName.trim();
    if (!name) return;
    this.ai.createAgent({
      name,
      description: this.newAgentDescription.trim(),
      systemPrompt: this.newAgentPrompt.trim(),
      allowedProviders: this.newAgentProviders,
      toolGroups: this.newAgentToolGroups,
      routerBehavior: this.newAgentRouterBehavior,
      autonomyLevel: this.newAgentAutonomyLevel,
    }).subscribe({
      next: () => {
        this.newAgentName = '';
        this.newAgentDescription = '';
        this.newAgentPrompt = '';
        this.newAgentProviders = [];
        this.newAgentToolGroups = [];
        this.newAgentAutonomyLevel = 'autonomous';
        this.newAgentRouterBehavior = 'auto';
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
    this.editAllowedProviders = agent.allowedProviders ? [...agent.allowedProviders] : [];
    this.editToolGroups = (agent as any).toolGroups ? [...(agent as any).toolGroups] : [];
    this.editBlockedTools = (agent as any).blockedTools ? [...(agent as any).blockedTools] : [];
    this.editRouterBehavior = (agent as any).routerBehavior || 'auto';
    this.editAutonomyLevel = (agent as any).autonomyLevel || 'autonomous';
    this.editMaxToolLoops = (agent as any).maxToolLoops || 40;
    this.editSystemPrompt = '';
  }

  saveEditAgent(agentId: string) {
    this.ai.updateAgent(agentId, {
      name: this.editName.trim(),
      description: this.editDescription.trim(),
      systemPrompt: this.editSystemPrompt.trim(),
      allowedProviders: this.editAllowedProviders,
      toolGroups: this.editToolGroups,
      blockedTools: this.editBlockedTools,
      routerBehavior: this.editRouterBehavior,
      autonomyLevel: this.editAutonomyLevel,
      maxToolLoops: this.editMaxToolLoops,
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
        this.availableProviderKeys = this.systemAgents
          .filter(a => a.id.startsWith('provider:'))
          .map(a => ({ key: a.id.slice('provider:'.length), name: a.name, icon: a.icon }));
        this.cdr.detectChanges();
      },
    });
  }

  loadProjectMemory() {
    if (!this.projectElementType || !this.projectElementId) return;
    this.ai.getProjectMemory(this.projectElementType, this.projectElementId).subscribe({
      next: (res: any) => {
        this.projectMemory = res?.data || res || {};
        this.projectMemoryKeys = Object.keys(this.projectMemory);
        this.cdr.detectChanges();
      },
      error: () => {
        this.projectMemory = {};
        this.projectMemoryKeys = [];
      },
    });
  }

  deleteProjectMemory(key: string) {
    if (!this.projectElementType || !this.projectElementId) return;
    this.ai.deleteProjectMemoryKey(this.projectElementType, this.projectElementId, key).subscribe({
      next: () => {
        delete this.projectMemory[key];
        this.projectMemoryKeys = Object.keys(this.projectMemory);
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

  loadStats() {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.get<any>('/api/ai/stats', { workspaceId: wsId }).subscribe({
      next: (res: any) => {
        this.stats = res?.data || res;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  // ── MCP ──

  loadMcpServers() {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.get<any>('/api/ai/mcp-servers', { workspaceId: wsId }).subscribe({
      next: (res: any) => {
        this.mcpServers = res?.data || res || [];
        this.cdr.detectChanges();
      },
      error: () => { this.mcpServers = []; },
    });
  }

  createMcpServer() {
    const name = this.newMcpName.trim();
    if (!name) return;
    const wsId = this.acl.currentWorkspaceId?.() || '';
    const body: any = { name, transport: this.newMcpTransport, toolPrefix: this.newMcpPrefix.trim() };
    if (this.newMcpTransport === 'stdio') body.command = this.newMcpCommand.trim();
    if (this.newMcpTransport === 'sse') body.url = this.newMcpUrl.trim();
    this.apiClient.post<any>('/api/ai/mcp-servers', body, { workspaceId: wsId }).subscribe({
      next: () => {
        this.showMcpForm = false;
        this.newMcpName = ''; this.newMcpCommand = ''; this.newMcpUrl = ''; this.newMcpPrefix = '';
        this.loadMcpServers();
      },
    });
  }

  connectMcp(server: any) {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.post<any>(`/api/ai/mcp-servers/${server.id}/connect`, {}, { workspaceId: wsId }).subscribe({
      next: () => this.loadMcpServers(),
      error: () => this.loadMcpServers(),
    });
  }

  disconnectMcp(server: any) {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.post<any>(`/api/ai/mcp-servers/${server.id}/disconnect`, {}, { workspaceId: wsId }).subscribe({
      next: () => this.loadMcpServers(),
    });
  }

  deleteMcpServer(server: any) {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.delete<any>(`/api/ai/mcp-servers/${server.id}`, { workspaceId: wsId }).subscribe({
      next: () => this.loadMcpServers(),
    });
  }

  formatJson(obj: any): string {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  toggleToolGroup(key: string, checked: boolean) {
    if (checked) {
      if (!this.editToolGroups.includes(key)) this.editToolGroups.push(key);
    } else {
      this.editToolGroups = this.editToolGroups.filter(g => g !== key);
    }
  }

  toggleNewToolGroup(key: string, checked: boolean) {
    if (checked) {
      if (!this.newAgentToolGroups.includes(key)) this.newAgentToolGroups.push(key);
    } else {
      this.newAgentToolGroups = this.newAgentToolGroups.filter(g => g !== key);
    }
  }
}
