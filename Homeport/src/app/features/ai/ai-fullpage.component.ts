import { Component, ChangeDetectorRef, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiThread, AiAvailableAgent } from './ai.service';
import { ApiClientService } from '../../services/api-client.service';
import { AccessControlService } from '../../services/access-control.service';
import { AiChatComponent } from './ai-chat.component';
import { AiSettingsComponent } from './ai-settings.component';

@Component({
  selector: 'ai-fullpage',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSelectModule, NzInputModule, NzEmptyModule, NzToolTipModule, NzPopconfirmModule, NzPopoverModule, AiChatComponent, AiSettingsComponent],
  template: `
    <div class="fp-layout">
      <!-- Sidebar -->
      <div class="fp-sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <span class="sidebar-title" *ngIf="!sidebarCollapsed">Conversations</span>
          <button nz-button nzType="text" nzSize="small" (click)="sidebarCollapsed = !sidebarCollapsed"
            nz-tooltip [nzTooltipTitle]="sidebarCollapsed ? 'Afficher' : 'Masquer'">
            <span nz-icon [nzType]="sidebarCollapsed ? 'menu-unfold' : 'menu-fold'" nzTheme="outline"></span>
          </button>
        </div>

        <ng-container *ngIf="!sidebarCollapsed">
          <!-- Agent selector -->
          <div class="sidebar-agent">
            <nz-select
              [(ngModel)]="selectedAgentId"
              (ngModelChange)="onAgentChange($event)"
              nzPlaceHolder="Agent"
              nzSize="small"
              nzShowSearch
              style="width: 100%"
              [nzOptionHeightPx]="36">
              <nz-option-group *ngIf="systemAgents.length" nzLabel="Système">
                <nz-option *ngFor="let a of systemAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
                  <div class="agent-opt">
                    <img *ngIf="a.icon" [src]="a.icon" class="agent-opt-icon" />
                    <span *ngIf="!a.icon" nz-icon nzType="robot" nzTheme="outline" class="agent-opt-nz"></span>
                    <span>{{ a.name }}</span>
                  </div>
                </nz-option>
              </nz-option-group>
              <nz-option-group *ngIf="customAgents.length" nzLabel="Personnalisés">
                <nz-option *ngFor="let a of customAgents" [nzValue]="a.id" [nzLabel]="a.name" nzCustomContent>
                  <div class="agent-opt">
                    <span nz-icon nzType="user" nzTheme="outline" class="agent-opt-nz custom"></span>
                    <span>{{ a.name }}</span>
                  </div>
                </nz-option>
              </nz-option-group>
            </nz-select>
          </div>

          <!-- New thread button -->
          <div class="sidebar-new">
            <button nz-button nzType="primary" nzSize="small" nzBlock (click)="newThread()">
              <span nz-icon nzType="plus" nzTheme="outline"></span> Nouvelle conversation
            </button>
          </div>

          <!-- Threads list -->
          <div class="sidebar-threads">
            <div *ngIf="threads.length === 0" class="empty-threads">
              <nz-empty nzNotFoundContent="Aucune conversation" [nzNotFoundImage]="'simple'"></nz-empty>
            </div>
            <div class="thread-item"
              *ngFor="let t of threads"
              (click)="selectThread(t)"
              [class.active]="t._id === ai.currentThread()?._id">
              <div class="thread-title">{{ t.title }}</div>
              <div class="thread-meta">
                <span class="mode-tag" [class]="'mode-' + t.mode">{{ modeLabel(t.mode) }}</span>
                <span class="thread-agent" *ngIf="t.agentId && t.agentId !== 'general'">{{ agentName(t.agentId) }}</span>
                <span class="thread-date">{{ t.updatedAt | date:'short' }}</span>
              </div>
              <button class="thread-delete" nz-button nzType="text" nzSize="small" nzDanger
                nz-popconfirm nzPopconfirmTitle="Supprimer ?"
                (nzOnConfirm)="deleteThread(t)"
                (click)="$event.stopPropagation()">
                <span nz-icon nzType="delete" nzTheme="outline"></span>
              </button>
            </div>
          </div>

          <!-- Settings link -->
          <div class="sidebar-bottom">
            <button nz-button nzType="text" nzSize="small" nzBlock (click)="showSettings = !showSettings"
              [class.active-btn]="showSettings">
              <span nz-icon nzType="setting" nzTheme="outline"></span>
              Paramètres
            </button>
          </div>
        </ng-container>
      </div>

      <!-- Main content -->
      <div class="fp-main">
        <!-- Settings overlay -->
        <ai-settings *ngIf="showSettings" class="fp-settings"></ai-settings>

        <!-- Chat or empty state -->
        <ng-container *ngIf="!showSettings">
          <div class="fp-empty" *ngIf="!ai.currentThread()">
            <div class="empty-content">
              <span nz-icon nzType="robot" nzTheme="outline" class="empty-icon"></span>
              <h3>Assistant IA</h3>
              <p>Sélectionnez une conversation ou créez-en une nouvelle.</p>
              <button nz-button nzType="primary" (click)="newThread()">
                <span nz-icon nzType="plus" nzTheme="outline"></span> Nouvelle conversation
              </button>
            </div>
          </div>

          <!-- Chat header + chat -->
          <ng-container *ngIf="ai.currentThread()">
            <div class="fp-chat-header">
              <div class="chat-title">{{ ai.currentThread()?.title }}</div>
              <div class="chat-badges">
                <span class="mode-tag" [class]="'mode-' + ai.currentThread()?.mode">{{ modeLabel(ai.currentThread()?.mode || 'chat') }}</span>
                <a class="linked-link" *ngIf="linkedElementLabel()" (click)="openLinkedElement()" nz-tooltip nzTooltipTitle="Ouvrir l'élément lié">
                  <span nz-icon nzType="link" nzTheme="outline"></span>
                  {{ linkedElementLabel() }}
                </a>
                <span class="agent-badge" *ngIf="ai.currentThread()?.agentId && ai.currentThread()?.agentId !== 'general'">
                  {{ agentName(ai.currentThread()!.agentId!) }}
                </span>
              </div>
              <div class="chat-actions">
                <button nz-button nzType="text" nzSize="small" (click)="regenerateTitle()"
                  nz-tooltip nzTooltipTitle="Régénérer le titre" [nzLoading]="regeneratingTitle">
                  <span nz-icon nzType="reload" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small" (click)="duplicateThread()"
                  nz-tooltip nzTooltipTitle="Dupliquer la conversation">
                  <span nz-icon nzType="copy" nzTheme="outline"></span>
                </button>
                <button nz-button nzType="text" nzSize="small"
                  nz-popover [nzPopoverContent]="settingsPopover" nzPopoverTrigger="click" nzPopoverPlacement="bottomRight"
                  nz-tooltip nzTooltipTitle="Paramètres">
                  <span nz-icon nzType="setting" nzTheme="outline"></span>
                </button>
              </div>

              <ng-template #settingsPopover>
                <div class="settings-popover">
                  <div class="sp-field">
                    <label>Titre</label>
                    <input nz-input nzSize="small" [ngModel]="ai.currentThread()?.title" (ngModelChange)="updateThreadTitle($event)" />
                  </div>
                  <div class="sp-field">
                    <label>Agent</label>
                    <nz-select nzSize="small" style="width:100%"
                      [ngModel]="ai.currentThread()?.agentId || 'general'"
                      (ngModelChange)="updateThreadAgent($event)"
                      nzShowSearch>
                      <nz-option *ngFor="let a of allAgents" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
                    </nz-select>
                  </div>
                  <div class="sp-field">
                    <label>Mode</label>
                    <nz-select nzSize="small" style="width:100%"
                      [ngModel]="ai.currentThread()?.mode"
                      (ngModelChange)="updateThreadMode($event)">
                      <nz-option nzValue="chat" nzLabel="Chat"></nz-option>
                      <nz-option nzValue="workflow" nzLabel="Workflow"></nz-option>
                      <nz-option nzValue="form" nzLabel="Formulaire"></nz-option>
                    </nz-select>
                  </div>
                  <div class="sp-field">
                    <label>Autonomie</label>
                    <nz-select nzSize="small" style="width:100%"
                      [ngModel]="ai.currentThread()?.metadata?.autonomyLevel || 'autonomous'"
                      (ngModelChange)="updateThreadAutonomy($event)">
                      <nz-option nzValue="prudent" nzLabel="Prudent"></nz-option>
                      <nz-option nzValue="balanced" nzLabel="Équilibré"></nz-option>
                      <nz-option nzValue="autonomous" nzLabel="Autonome"></nz-option>
                    </nz-select>
                  </div>
                  <div class="sp-divider"></div>
                  <div class="sp-field">
                    <label>Élément lié</label>
                    <div class="sp-link" *ngIf="ai.currentThread()?.flowId || ai.currentThread()?.metadata?.formId">
                      <a class="sp-link-text" (click)="openLinkedElement()">
                        <span nz-icon nzType="link" nzTheme="outline"></span>
                        {{ linkedElementLabel() || 'Élément lié' }}
                      </a>
                      <button nz-button nzType="text" nzSize="small" nzDanger (click)="unlinkElement()" nz-tooltip nzTooltipTitle="Dissocier">
                        <span nz-icon nzType="disconnect" nzTheme="outline"></span>
                      </button>
                    </div>
                    <div class="sp-no-link" *ngIf="!ai.currentThread()?.flowId && !ai.currentThread()?.metadata?.formId">
                      <span class="sp-no-link-text">Aucun</span>
                      <nz-select nzSize="small" nzPlaceHolder="Lier un workflow..." nzShowSearch nzAllowClear
                        style="width:100%;margin-top:4px"
                        (ngModelChange)="linkToFlow($event)" [ngModel]="null">
                        <nz-option *ngFor="let f of recentFlows" [nzValue]="f.id" [nzLabel]="f.name"></nz-option>
                      </nz-select>
                    </div>
                  </div>
                </div>
              </ng-template>
            </div>
            <ai-chat class="fp-chat"></ai-chat>
          </ng-container>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .fp-layout { display: flex; height: 100%; background: #fff; }

    /* Sidebar */
    .fp-sidebar { width: 300px; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; flex-shrink: 0; background: #fafafa; transition: width 0.2s ease; }
    .fp-sidebar.collapsed { width: 48px; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f0f0f0; }
    .sidebar-title { font-weight: 600; font-size: 15px; }
    .sidebar-agent { padding: 8px 12px 0; }
    .sidebar-new { padding: 8px 12px; }
    .sidebar-threads { flex: 1; overflow-y: auto; padding: 4px 8px; }
    .sidebar-bottom { padding: 8px 12px; border-top: 1px solid #f0f0f0; }

    .thread-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 2px; position: relative; }
    .thread-item:hover { background: #e6f4ff; }
    .thread-item.active { background: #e6f4ff; border: 1px solid #bae0ff; }
    .thread-title { font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 28px; }
    .thread-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 11px; color: #999; }
    .thread-delete { position: absolute; top: 8px; right: 4px; opacity: 0; transition: opacity 0.15s; }
    .thread-item:hover .thread-delete { opacity: 1; }
    .thread-date { margin-left: auto; }
    .thread-agent { color: #722ed1; }

    .mode-tag { padding: 0 5px; border-radius: 3px; font-size: 10px; text-transform: uppercase; font-weight: 500; }
    .mode-chat { background: #f0f0f0; color: #666; }
    .mode-workflow { background: #e6f4ff; color: #1677ff; }
    .mode-node_args { background: #fff7e6; color: #d48806; }
    .mode-form { background: #f6ffed; color: #389e0d; }

    .agent-opt { display: flex; align-items: center; gap: 6px; }
    .agent-opt-icon { width: 16px; height: 16px; border-radius: 3px; object-fit: contain; }
    .agent-opt-nz { font-size: 14px; color: #1677ff; }
    .agent-opt-nz.custom { color: #722ed1; }

    .empty-threads { padding: 30px 10px; }
    .active-btn { color: #1677ff !important; }

    /* Main */
    .fp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .fp-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
    .empty-content { text-align: center; color: #999; }
    .empty-icon { font-size: 48px; color: #d9d9d9; margin-bottom: 12px; }
    .empty-content h3 { font-size: 18px; color: #333; margin: 0 0 8px; }
    .empty-content p { margin: 0 0 16px; font-size: 14px; }

    .fp-chat-header { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
    .chat-title { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chat-badges { display: flex; gap: 6px; align-items: center; }
    .agent-badge { font-size: 11px; color: #722ed1; background: #f9f0ff; padding: 1px 8px; border-radius: 10px; }
    .linked-link { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #1677ff; cursor: pointer; padding: 1px 6px; border-radius: 4px; text-decoration: none; white-space: nowrap; }
    .linked-link:hover { background: rgba(22,119,255,0.1); }
    .chat-actions { margin-left: auto; display: flex; gap: 2px; }
    .settings-popover { width: 280px; }
    .sp-field { margin-bottom: 10px; }
    .sp-field:last-child { margin-bottom: 0; }
    .sp-field label { display: block; font-size: 11px; color: #999; margin-bottom: 3px; text-transform: uppercase; font-weight: 500; }
    .sp-divider { border-top: 1px solid #f0f0f0; margin: 8px 0; }
    .sp-link { display: flex; align-items: center; gap: 4px; }
    .sp-link-text { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #1677ff; cursor: pointer; }
    .sp-link-text:hover { text-decoration: underline; }
    .sp-no-link-text { font-size: 12px; color: #999; }
    .fp-chat { flex: 1; min-height: 0; }
    .fp-settings { flex: 1; overflow-y: auto; }

    /* Responsive */
    @media (max-width: 768px) {
      .fp-sidebar { width: 0; overflow: hidden; }
      .fp-sidebar:not(.collapsed) { width: 260px; position: absolute; z-index: 10; height: 100%; box-shadow: 2px 0 8px rgba(0,0,0,0.1); }
    }
  `]
})
export class AiFullpageComponent implements OnInit, OnDestroy {
  threads: AiThread[] = [];
  systemAgents: AiAvailableAgent[] = [];
  customAgents: AiAvailableAgent[] = [];
  allAgents: AiAvailableAgent[] = [];
  selectedAgentId = 'general';
  sidebarCollapsed = false;
  showSettings = false;
  regeneratingTitle = false;
  recentFlows: { id: string; name: string }[] = [];

  private refreshInterval?: any;
  private titleDebounce?: any;

  constructor(public ai: AiService, private cdr: ChangeDetectorRef, private router: Router, private nzMsg: NzMessageService, private apiClient: ApiClientService, private acl: AccessControlService) {
    // Sync currentThread changes (title, mode, flowId) back to local threads list in real-time
    effect(() => {
      const cur = this.ai.currentThread();
      if (!cur) return;
      const idx = this.threads.findIndex(t => t._id === cur._id);
      if (idx >= 0) {
        const existing = this.threads[idx];
        if (existing.title !== cur.title || existing.mode !== cur.mode || existing.flowId !== cur.flowId) {
          this.threads = this.threads.map((t, i) => i === idx ? { ...t, title: cur.title, mode: cur.mode, flowId: cur.flowId, metadata: cur.metadata } : t);
          this.cdr.detectChanges();
        }
      } else if (cur._id) {
        // New thread created — add it to the top of the list
        this.threads = [cur, ...this.threads];
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit() {
    // Set page context
    this.ai.setPageContext({ page: 'other' });

    // Load threads and agents
    this.loadThreads();
    this.loadAgents();

    // Load recent flows for link management
    this.loadRecentFlows();

    // Handle AI actions (open_element, open_credentials)
    this.ai.actionRequests$.subscribe(action => {
      if (action.action === 'open_element') {
        const a = action as any;
        switch (a.elementType) {
          case 'flow':
            this.router.navigate(['/flow-builder', 'editor'], { queryParams: { flow: a.elementId } });
            break;
          case 'form':
            this.router.navigate(['/dynamic-form'], { queryParams: { session: a.elementId } });
            break;
          case 'website':
            this.router.navigate(['/websites/editor'], { queryParams: { id: a.elementId } });
            break;
        }
      }
    });

    // Auto-refresh threads every 30s
    this.refreshInterval = setInterval(() => this.loadThreads(), 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadThreads() {
    this.ai.listThreads().subscribe({
      next: (res: any) => {
        this.threads = res?.data || res || [];
        this.cdr.detectChanges();
      },
      error: () => { this.threads = []; },
    });
  }

  loadAgents() {
    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.allAgents = list;
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
        this.selectedAgentId = this.ai.selectedAgentId() || 'general';
        this.cdr.detectChanges();
      },
    });
  }

  onAgentChange(agentId: string) {
    this.ai.selectedAgentId.set(agentId);
  }

  async newThread() {
    this.showSettings = false;
    await this.ai.createThread('chat', undefined, this.selectedAgentId);
    this.loadThreads();
    this.cdr.detectChanges();
  }

  async selectThread(thread: AiThread) {
    this.showSettings = false;
    await this.ai.loadThread(thread.id || thread._id);
    this.cdr.detectChanges();
  }

  deleteThread(thread: AiThread) {
    this.ai.deleteThread(thread.id || thread._id).subscribe({
      next: () => {
        // Clear selection if deleted thread was active
        if (this.ai.currentThread()?._id === thread._id) {
          this.ai.currentThread.set(null);
          this.ai.messages.set([]);
        }
        this.loadThreads();
      },
    });
  }

  modeLabel(mode: string): string {
    switch (mode) {
      case 'chat': return 'Chat';
      case 'workflow': return 'Flow';
      case 'node_args': return 'Args';
      case 'form': return 'Form';
      case 'onboarding': return 'Onboarding';
      default: return mode;
    }
  }

  linkedElementLabel(): string {
    const thread = this.ai.currentThread();
    if (!thread) return '';
    if (thread.mode === 'workflow' && thread.flowId) return 'Ouvrir le workflow';
    if (thread.mode === 'form' && thread.metadata?.formId) return 'Ouvrir le formulaire';
    return '';
  }

  openLinkedElement() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    if (thread.mode === 'workflow' && thread.flowId) {
      const flowId = thread.metadata?.flowShortId || thread.flowId;
      this.router.navigate(['/flow-builder', 'editor'], { queryParams: { demo: '1', flow: flowId, center: '1' } });
    } else if (thread.mode === 'form' && thread.metadata?.formId) {
      const formId = thread.metadata?.formShortId || thread.metadata.formId;
      this.router.navigate(['/dynamic-form'], { queryParams: { session: formId } });
    }
  }

  agentName(agentId: string): string {
    if (!agentId || agentId === 'general') return '';
    const all = [...this.systemAgents, ...this.customAgents];
    const found = all.find(a => a.id === agentId);
    if (found) return found.name;
    if (agentId.startsWith('provider:')) return agentId.slice('provider:'.length);
    return agentId;
  }

  regenerateTitle() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.regeneratingTitle = true;
    this.ai.regenerateTitle(thread.id || thread._id).subscribe({
      next: (res: any) => {
        const title = res?.data?.title || res?.title;
        if (title) {
          this.ai.currentThread.set({ ...thread, title });
        }
        this.regeneratingTitle = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.regeneratingTitle = false;
        this.nzMsg.error('Impossible de régénérer le titre');
        this.cdr.detectChanges();
      },
    });
  }

  duplicateThread() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.duplicateThread(thread.id || thread._id).subscribe({
      next: async (res: any) => {
        const newThread = res?.data || res;
        if (newThread?.id || newThread?._id) {
          this.nzMsg.success('Conversation dupliquée');
          await this.ai.loadThread(newThread.id || newThread._id);
          this.loadThreads();
          this.cdr.detectChanges();
        }
      },
      error: () => this.nzMsg.error('Impossible de dupliquer'),
    });
  }

  updateThreadTitle(title: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    // Debounce title update
    clearTimeout(this.titleDebounce);
    this.titleDebounce = setTimeout(() => {
      this.ai.updateThread(thread.id || thread._id, { title }).subscribe({
        next: () => this.ai.currentThread.set({ ...thread, title }),
      });
    }, 500);
  }

  updateThreadAgent(agentId: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    const newAgentId = agentId === 'general' ? '' : agentId;
    this.ai.updateThread(thread.id || thread._id, { agentId: newAgentId }).subscribe({
      next: () => {
        this.ai.currentThread.set({ ...thread, agentId: newAgentId || undefined });
        this.nzMsg.success('Agent mis à jour');
      },
    });
  }

  loadRecentFlows() {
    const wsId = this.acl.currentWorkspaceId?.() || '';
    this.apiClient.get<any[]>(`/api/workspaces/${wsId}/flows`, { limit: 20 }).subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.recentFlows = list.map((f: any) => ({ id: f.id || f._id, name: f.name || 'Sans nom' }));
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  unlinkElement() {
    const thread = this.ai.currentThread();
    if (!thread) return;
    // Clear flow/form link
    this.ai.updateThread(thread.id || thread._id, { metadata: { formId: null, flowShortId: null, formShortId: null } }).subscribe({
      next: () => {
        const updated = { ...thread, flowId: undefined, metadata: { ...(thread.metadata || {}), formId: undefined, flowShortId: undefined, formShortId: undefined } };
        this.ai.currentThread.set(updated);
        this.nzMsg.success('Élément dissocié');
        this.cdr.detectChanges();
      },
    });
  }

  linkToFlow(flowId: string) {
    if (!flowId) return;
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { mode: 'workflow', metadata: { flowShortId: flowId } }).subscribe({
      next: (res: any) => {
        const updated = res?.data || res;
        if (updated) {
          this.ai.currentThread.set(updated);
          this.nzMsg.success('Workflow lié');
          this.cdr.detectChanges();
        }
      },
    });
  }

  updateThreadAutonomy(level: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { metadata: { autonomyLevel: level } }).subscribe({
      next: () => {
        const updated = { ...thread, metadata: { ...(thread.metadata || {}), autonomyLevel: level } };
        this.ai.currentThread.set(updated);
      },
    });
  }

  updateThreadMode(mode: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { mode }).subscribe({
      next: () => {
        this.ai.currentThread.set({ ...thread, mode: mode as any });
      },
    });
  }
}
