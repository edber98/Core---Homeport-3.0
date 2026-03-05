import { Component, ChangeDetectorRef, effect, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AiService, AiThread, AiPageContext, AiAvailableAgent } from './ai.service';
import { AiChatComponent } from './ai-chat.component';
import { AiSettingsComponent } from './ai-settings.component';

@Component({
  selector: 'ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzDrawerModule, NzButtonModule, NzIconModule, NzDropDownModule, NzMenuModule, NzListModule, NzEmptyModule, NzToolTipModule, NzPopoverModule, NzSelectModule, NzInputModule, AiChatComponent, AiSettingsComponent],
  template: `
    <nz-drawer
      [nzVisible]="ai.drawerOpen()"
      (nzOnClose)="onDrawerCloseRequested()"
      [nzWidth]="drawerWidth"
      nzPlacement="right"
      [nzClosable]="false"
      [nzBodyStyle]="{ padding: 0 }"
      [nzMaskClosable]="true"
      nzWrapClassName="ai-panel-drawer">

      <ng-container *nzDrawerContent>
        <div class="ai-panel-swipe-zone"
          (touchstart)="onDrawerTouchStart($event)"
          (touchmove)="onDrawerTouchMove($event)"
          (touchend)="onDrawerTouchEnd()"
          (touchcancel)="onDrawerTouchEnd()">
        <div class="panel-wrapper">
          <!-- Header -->
          <div class="panel-header">
            <div class="header-left">
              <span nz-icon nzType="robot" nzTheme="outline" class="ai-icon"></span>
              <span class="title" *ngIf="view === 'chat'">
                {{ ai.currentThread()?.title || 'Assistant IA' }}
              </span>
              <span class="title" *ngIf="view === 'history'">Historique</span>
              <span class="title" *ngIf="view === 'settings'">Paramètres</span>
            </div>
            <div class="header-right">
              <button *ngIf="view === 'chat' && ai.currentThread()" nz-button nzType="text" nzSize="small"
                nz-popover [nzPopoverContent]="threadSettingsPopover" nzPopoverTrigger="click" nzPopoverPlacement="bottomRight"
                nz-tooltip nzTooltipTitle="Paramètres du chat">
                <span nz-icon nzType="control" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Paramètres IA"
                (click)="toggleView('settings')" [class.active-btn]="view === 'settings'">
                <span nz-icon nzType="setting" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Historique"
                (click)="toggleView('history')" [class.active-btn]="view === 'history'">
                <span nz-icon nzType="history" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Nouvelle conversation" (click)="newThread()">
                <span nz-icon nzType="plus" nzTheme="outline"></span>
              </button>
              <button nz-button nzType="text" nzSize="small" (click)="onDrawerCloseRequested()">
                <span nz-icon nzType="close" nzTheme="outline"></span>
              </button>
            </div>
          </div>

          <!-- Context indicator -->
          <div class="context-bar" *ngIf="view === 'chat' && (contextLabel() || agentLabel() || linkedElementLabel())">
            <span nz-icon [nzType]="contextIcon()" nzTheme="outline"></span>
            <span class="context-label" *ngIf="contextLabel()">{{ contextLabel() }}</span>
            <a class="linked-link" *ngIf="linkedElementLabel()" (click)="openLinkedElement()" nz-tooltip nzTooltipTitle="Ouvrir l'élément lié">
              <span nz-icon nzType="link" nzTheme="outline"></span>
              {{ linkedElementLabel() }}
            </a>
            <span class="agent-badge" *ngIf="agentLabel()">
              <span class="agent-dot"></span>
              {{ agentLabel() }}
            </span>
          </div>

          <!-- Thread list (history) -->
          <div class="thread-list" *ngIf="view === 'history'">
            <div *ngIf="threads.length === 0" class="empty-history">
              <nz-empty nzNotFoundContent="Aucune conversation"></nz-empty>
            </div>
            <div class="thread-item" *ngFor="let t of threads" (click)="openThread(t)" [class.active]="t._id === ai.currentThread()?._id">
              <div class="thread-info">
                <span class="context-dot" *ngIf="isLinkedToContext(t)"></span>
                <div class="thread-title">{{ t.title }}</div>
              </div>
              <div class="thread-meta">
                <span class="mode-badge" [style.background]="modeBg(t.mode)" [style.color]="modeColor(t.mode)">{{ modeLabel(t.mode) }}</span>
                <span class="date">{{ t.updatedAt | date:'short' }}</span>
              </div>
            </div>
          </div>

          <!-- Settings -->
          <ai-settings *ngIf="view === 'settings'" class="settings-area"></ai-settings>

          <!-- Chat -->
          <ai-chat *ngIf="view === 'chat'" class="chat-area"></ai-chat>

          <!-- Thread settings popover -->
          <ng-template #threadSettingsPopover>
            <div class="thread-settings-popover">
              <div class="tsp-field">
                <label>Titre</label>
                <input nz-input nzSize="small" [ngModel]="ai.currentThread()?.title" (ngModelChange)="updateThreadTitle($event)" />
              </div>
              <div class="tsp-field">
                <label>Agent</label>
                <ng-container *ngIf="threadSettingsUseNative; else tspAgentDesktop">
                  <select class="tsp-native-select"
                    [ngModel]="ai.currentThread()?.agentId || 'general'"
                    (ngModelChange)="updateThreadAgent($event)">
                    <option value="general">Assistant général</option>
                    <optgroup *ngIf="systemAgents.length" label="Agents système">
                      <ng-container *ngFor="let a of systemAgents">
                        <option *ngIf="a.id !== 'general'" [value]="a.id">{{ a.name }}</option>
                      </ng-container>
                    </optgroup>
                    <optgroup *ngIf="customAgents.length" label="Agents personnalisés">
                      <option *ngFor="let a of customAgents" [value]="a.id">{{ a.name }}</option>
                    </optgroup>
                  </select>
                </ng-container>
                <ng-template #tspAgentDesktop>
                  <nz-select class="tsp-zorro-select" nzSize="small" style="width:100%"
                    nzShowSearch
                    nzDropdownClassName="thread-settings-select-dropdown"
                    [ngModel]="ai.currentThread()?.agentId || 'general'"
                    (ngModelChange)="updateThreadAgent($event)">
                    <nz-option nzValue="general" nzLabel="Assistant général"></nz-option>
                    <nz-option-group *ngIf="systemAgents.length" nzLabel="Agents système">
                      <ng-container *ngFor="let a of systemAgents">
                        <nz-option *ngIf="a.id !== 'general'" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
                      </ng-container>
                    </nz-option-group>
                    <nz-option-group *ngIf="customAgents.length" nzLabel="Agents personnalisés">
                      <nz-option *ngFor="let a of customAgents" [nzValue]="a.id" [nzLabel]="a.name"></nz-option>
                    </nz-option-group>
                  </nz-select>
                </ng-template>
              </div>
              <div class="tsp-field">
                <label>Mode</label>
                <ng-container *ngIf="threadSettingsUseNative; else tspModeDesktop">
                  <select class="tsp-native-select"
                    [ngModel]="ai.currentThread()?.mode"
                    (ngModelChange)="updateThreadMode($event)">
                    <option value="chat">Chat (libre)</option>
                    <option value="workflow">Workflow (lié au flow)</option>
                    <option value="form">Formulaire (lié au form)</option>
                  </select>
                </ng-container>
                <ng-template #tspModeDesktop>
                  <nz-select class="tsp-zorro-select" nzSize="small" style="width:100%"
                    nzDropdownClassName="thread-settings-select-dropdown"
                    [ngModel]="ai.currentThread()?.mode"
                    (ngModelChange)="updateThreadMode($event)">
                    <nz-option nzValue="chat" nzLabel="Chat (libre)"></nz-option>
                    <nz-option nzValue="workflow" nzLabel="Workflow (lié au flow)"></nz-option>
                    <nz-option nzValue="form" nzLabel="Formulaire (lié au form)"></nz-option>
                  </nz-select>
                </ng-template>
              </div>
              <div class="tsp-field">
                <label>Autonomie</label>
                <ng-container *ngIf="threadSettingsUseNative; else tspAutonomyDesktop">
                  <select class="tsp-native-select"
                    [ngModel]="ai.currentThread()?.metadata?.autonomyLevel || 'autonomous'"
                    (ngModelChange)="updateThreadAutonomy($event)">
                    <option value="prudent">Prudent (confirme les écritures)</option>
                    <option value="balanced">Équilibré (confirme les actions sensibles)</option>
                    <option value="autonomous">Autonome (agit directement)</option>
                  </select>
                </ng-container>
                <ng-template #tspAutonomyDesktop>
                  <nz-select class="tsp-zorro-select" nzSize="small" style="width:100%"
                    nzDropdownClassName="thread-settings-select-dropdown"
                    [ngModel]="ai.currentThread()?.metadata?.autonomyLevel || 'autonomous'"
                    (ngModelChange)="updateThreadAutonomy($event)">
                    <nz-option nzValue="prudent" nzLabel="Prudent (confirme les écritures)"></nz-option>
                    <nz-option nzValue="balanced" nzLabel="Équilibré (confirme les actions sensibles)"></nz-option>
                    <nz-option nzValue="autonomous" nzLabel="Autonome (agit directement)"></nz-option>
                  </nz-select>
                </ng-template>
              </div>
            </div>
          </ng-template>
        </div>
        </div>
      </ng-container>
    </nz-drawer>
  `,
  styles: [`
    .ai-panel-swipe-zone { height: 100%; display: flex; flex-direction: column; touch-action: pan-y; }
    .panel-wrapper { display: flex; flex-direction: column; height: 100%; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; flex-shrink: 0; }
    .header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .header-right { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .ai-icon { font-size: 18px; color: #1677ff; }
    .title { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .context-bar { display: flex; align-items: center; gap: 6px; padding: 6px 16px; background: #e6f4ff; border-bottom: 1px solid #bae0ff; font-size: 12px; color: #1677ff; flex-shrink: 0; }
    .thread-list { flex: 1; overflow-y: auto; padding: 8px; }
    .thread-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; max-width: 100%; }
    .thread-item:hover { background: #f5f5f5; }
    .thread-item.active { background: #e6f4ff; }
    .thread-info { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .thread-title { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .thread-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: #999; }
    .mode-badge { padding: 0 6px; border-radius: 3px; font-size: 11px; text-transform: uppercase; flex-shrink: 0; }
    .context-dot { width: 7px; height: 7px; border-radius: 50%; background: #1677ff; flex-shrink: 0; }
    .empty-history { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
    .active-btn { color: #1677ff !important; }
    .linked-link { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #1677ff; cursor: pointer; padding: 1px 6px; border-radius: 4px; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .linked-link:hover { background: rgba(22,119,255,0.1); }
    .agent-badge { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #722ed1; background: #f9f0ff; padding: 1px 8px; border-radius: 10px; }
    .agent-dot { width: 6px; height: 6px; border-radius: 50%; background: #722ed1; }
    .chat-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; min-width: 0; }
    .settings-area { flex: 1; overflow: hidden; min-height: 0; }
    .thread-settings-popover {
      width: 260px;
      transform-origin: top right;
      animation: panelSettingsIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tsp-field {
      margin-bottom: 10px;
      animation: panelFieldIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .tsp-field:nth-child(1) { animation-delay: 16ms; }
    .tsp-field:nth-child(2) { animation-delay: 28ms; }
    .tsp-field:nth-child(3) { animation-delay: 40ms; }
    .tsp-field:nth-child(4) { animation-delay: 52ms; }
    .tsp-field:last-child { margin-bottom: 0; }
    .tsp-field label { display: block; font-size: 11px; color: #999; margin-bottom: 3px; text-transform: uppercase; font-weight: 500; }
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select .ant-select-selector {
      height: 30px !important;
      border: 1px solid #cfd8e6 !important;
      border-radius: 10px !important;
      padding: 0 10px !important;
      background: #fff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(15, 23, 42, 0.05);
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease, color .18s ease !important;
    }
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select .ant-select-selection-item,
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select .ant-select-selection-placeholder {
      line-height: 28px !important;
      font-size: 12px !important;
      font-weight: 500;
    }
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select .ant-select-arrow {
      color: #64748b;
    }
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select:not(.ant-select-disabled):hover .ant-select-selector,
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select .ant-select-selector:hover {
      border-color: #1677ff !important;
      background: #fff !important;
      box-shadow: 0 2px 6px rgba(22, 119, 255, 0.15) !important;
    }
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select.ant-select-focused .ant-select-selector,
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select.ant-select-open .ant-select-selector,
    :host ::ng-deep .thread-settings-popover .tsp-zorro-select.ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector {
      border-color: #1677ff !important;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
      background: #fff !important;
    }
    .tsp-native-select {
      width: 100%;
      height: 30px;
      border: 1px solid #cfd8e6;
      border-radius: 10px;
      padding: 0 30px 0 10px;
      font-size: 12px;
      font-weight: 500;
      background: #fff;
      color: #0f172a;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(15, 23, 42, 0.05);
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, #64748b 50%),
        linear-gradient(135deg, #64748b 50%, transparent 50%);
      background-position:
        calc(100% - 13px) calc(50% - 2px),
        calc(100% - 8px) calc(50% - 2px);
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease, transform .1s ease, color .18s ease;
    }
    .tsp-native-select:hover {
      border-color: #1677ff;
      background: #fff;
      box-shadow: 0 2px 6px rgba(22, 119, 255, 0.15);
    }
    .tsp-native-select:focus {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
      background: #fff;
      color: #0958d9;
    }
    .tsp-native-select:active {
      transform: translateY(1px);
    }
    .tsp-native-select option {
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
      background: #fff;
    }
    .tsp-native-select option:checked {
      color: #0958d9;
      background: #e6f4ff;
    }
    .tsp-native-select option[disabled] {
      color: #94a3b8;
    }
    .tsp-native-select optgroup {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      background: #f8fafc;
    }
    :host ::ng-deep .thread-settings-select-dropdown.ant-select-dropdown {
      border-radius: 12px;
      border: 1px solid #d6e4ff;
      padding: 6px;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16);
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }
    :host ::ng-deep .thread-settings-select-dropdown .ant-select-item-group {
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 8px;
    }
    :host ::ng-deep .thread-settings-select-dropdown .ant-select-item-option {
      border-radius: 8px;
      min-height: 30px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
    }
    :host ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
      background: #eef5ff;
    }
    :host ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
      background: #e6f4ff;
      color: #0958d9;
      font-weight: 600;
    }
    :host ::ng-deep .thread-settings-select-dropdown .ant-select-item-option-grouped {
      padding-left: 16px;
    }
    @keyframes panelSettingsIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes panelFieldIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AiPanelComponent implements OnInit {
  view: 'chat' | 'history' | 'settings' = 'chat';
  threads: AiThread[] = [];
  allAgents: AiAvailableAgent[] = [];
  systemAgents: AiAvailableAgent[] = [];
  customAgents: AiAvailableAgent[] = [];
  threadSettingsUseNative = false;
  drawerWidth: number | string = 460;
  private titleDebounce?: any;
  private drawerSwipeX = 0;
  private drawerSwipeMode: 'idle' | 'pending' | 'horizontal' | 'vertical' = 'idle';
  private drawerSwipeStartX = 0;
  private drawerSwipeStartY = 0;
  private readonly drawerSwipeIntentThresh = 12; // px
  private readonly drawerSwipeCloseThresh = 72; // px
  private readonly drawerSwipeMaxShift = 240; // px

  @HostListener('window:resize')
  onResize() { this.updateDrawerWidth(); }

  private updateDrawerWidth() {
    const w = window.innerWidth;
    this.drawerWidth = w < 576 ? '100%' : w < 768 ? '90%' : 460;
    this.threadSettingsUseNative = w <= 768;
  }

  constructor(public ai: AiService, private cdr: ChangeDetectorRef, private router: Router) {
    this.updateDrawerWidth();
    // Sync currentThread changes (title, mode) back to local threads list in real-time
    effect(() => {
      const cur = this.ai.currentThread();
      if (!cur || !this.threads.length) return;
      const idx = this.threads.findIndex(t => t._id === cur._id);
      if (idx >= 0) {
        const existing = this.threads[idx];
        if (existing.title !== cur.title || existing.mode !== cur.mode) {
          this.threads = this.threads.map((t, i) => i === idx ? { ...t, title: cur.title, mode: cur.mode, flowId: cur.flowId, metadata: cur.metadata } : t);
          this.cdr.detectChanges();
        }
      }
    });
    effect(() => {
      const open = this.ai.drawerOpen();
      if (open) return;
      this.clearDrawerShellSwipe(false);
      this.resetDrawerSwipe();
    });
  }

  ngOnInit() {
    this.loadAgents();
  }

  loadAgents() {
    this.ai.loadAvailableAgents().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.allAgents = list;
        this.systemAgents = list.filter((a: AiAvailableAgent) => a.type === 'system');
        this.customAgents = list.filter((a: AiAvailableAgent) => a.type === 'custom');
        this.cdr.detectChanges();
      },
    });
  }

  updateThreadTitle(title: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
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
      next: () => this.ai.currentThread.set({ ...thread, agentId: newAgentId || undefined }),
    });
  }

  updateThreadMode(mode: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { mode }).subscribe({
      next: () => this.ai.currentThread.set({ ...thread, mode: mode as any }),
    });
  }

  updateThreadAutonomy(level: string) {
    const thread = this.ai.currentThread();
    if (!thread) return;
    this.ai.updateThread(thread.id || thread._id, { metadata: { autonomyLevel: level } }).subscribe({
      next: () => this.ai.currentThread.set({ ...thread, metadata: { ...(thread.metadata || {}), autonomyLevel: level } }),
    });
  }

  onDrawerCloseRequested() {
    this.clearDrawerShellSwipe(false);
    this.resetDrawerSwipe();
    this.ai.closeDrawer();
  }

  onDrawerTouchStart(ev: TouchEvent) {
    try {
      if (!this.ai.drawerOpen() || !this.isTabletOrBelow()) return;
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      this.clearDrawerShellSwipe(false);
      this.drawerSwipeMode = 'pending';
      this.drawerSwipeStartX = t.clientX;
      this.drawerSwipeStartY = t.clientY;
      this.drawerSwipeX = 0;
    } catch {}
  }

  onDrawerTouchMove(ev: TouchEvent) {
    try {
      if (!this.ai.drawerOpen() || !this.isTabletOrBelow()) return;
      if (this.drawerSwipeMode === 'idle') return;
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      const dx = t.clientX - this.drawerSwipeStartX;
      const dy = t.clientY - this.drawerSwipeStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (this.drawerSwipeMode === 'pending') {
        if (absX < this.drawerSwipeIntentThresh && absY < this.drawerSwipeIntentThresh) return;
        this.drawerSwipeMode = absX > (absY + 4) ? 'horizontal' : 'vertical';
      }
      if (this.drawerSwipeMode !== 'horizontal') return;

      const shift = Math.min(this.drawerSwipeMaxShift, Math.max(0, dx));
      this.drawerSwipeX = shift;
      this.applyDrawerShellSwipe(shift);
      if (shift !== 0) ev.preventDefault();
    } catch {}
  }

  onDrawerTouchEnd() {
    try {
      if (this.drawerSwipeMode === 'idle') return;
      const shouldClose = this.drawerSwipeX >= this.drawerSwipeCloseThresh;
      this.clearDrawerShellSwipe(!shouldClose);
      this.resetDrawerSwipe();
      if (shouldClose) this.ai.closeDrawer();
    } catch {
      this.clearDrawerShellSwipe(false);
      this.resetDrawerSwipe();
    }
  }

  toggleView(target: 'history' | 'settings') {
    this.view = this.view === target ? 'chat' : target;
    if (this.view === 'history') this.loadThreads();
  }

  loadThreads() {
    this.ai.listThreads().subscribe({
      next: (res: any) => {
        const all = res?.data || res || [];
        const ctx = this.ai.pageContext();
        // Sort: context-linked first, then keep backend sort (updatedAt desc)
        this.threads = all.sort((a: AiThread, b: AiThread) => {
          const aLinked = this._isLinked(a, ctx);
          const bLinked = this._isLinked(b, ctx);
          if (aLinked && !bLinked) return -1;
          if (!aLinked && bLinked) return 1;
          return 0;
        });
        this.cdr.detectChanges();
      },
      error: () => { this.threads = []; },
    });
  }

  async openThread(thread: AiThread) {
    await this.ai.loadThread(thread.id || thread._id);
    this.view = 'chat';
    this.cdr.detectChanges();
  }

  async newThread() {
    // Use page context to auto-detect mode and link to current flow/form
    const ctx = this.ai.pageContext();
    const mode = ctx.page === 'flow-builder' ? (ctx.nodeId ? 'node_args' : 'workflow')
               : ctx.page === 'form-builder' ? 'form'
               : 'chat';
    const meta: any = {};
    if (ctx.flowId) meta.flowId = ctx.flowId;
    if (ctx.formId) meta.formId = ctx.formId;
    if (ctx.nodeId) meta.nodeId = ctx.nodeId;
    const agentId = this.ai.selectedAgentId();
    await this.ai.createThread(mode, Object.keys(meta).length ? meta : undefined, agentId);
    this.view = 'chat';
    this.cdr.detectChanges();
  }

  // ── Mode badges ──
  modeLabel(mode: string): string {
    switch (mode) {
      case 'chat': return 'Chat';
      case 'workflow': return 'Flow';
      case 'node_args': return 'Args';
      case 'form': return 'Form';
      default: return mode;
    }
  }

  modeBg(mode: string): string {
    switch (mode) {
      case 'workflow': return '#e6f4ff';
      case 'node_args': return '#fff7e6';
      case 'form': return '#f6ffed';
      default: return '#f0f0f0';
    }
  }

  modeColor(mode: string): string {
    switch (mode) {
      case 'workflow': return '#1677ff';
      case 'node_args': return '#d48806';
      case 'form': return '#389e0d';
      default: return '#666';
    }
  }

  // ── Context indicator ──
  contextLabel(): string {
    const ctx = this.ai.pageContext();
    if (ctx.page === 'flow-builder') return 'Mode workflow';
    if (ctx.page === 'form-builder') return 'Mode formulaire';
    return '';
  }

  contextIcon(): string {
    const ctx = this.ai.pageContext();
    if (ctx.page === 'flow-builder') return 'apartment';
    if (ctx.page === 'form-builder') return 'form';
    return 'message';
  }

  // ── Linked element ──
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
      // Use short ID (flw_xxx) from metadata, fallback to flowId
      const flowId = thread.metadata?.flowShortId || thread.flowId;
      this.router.navigate(['/flow-builder', 'editor'], { queryParams: { demo: '1', flow: flowId, center: '1' } });
    } else if (thread.mode === 'form' && thread.metadata?.formId) {
      const formId = thread.metadata?.formShortId || thread.metadata.formId;
      this.router.navigate(['/dynamic-form'], { queryParams: { session: formId } });
    }
  }

  // ── Agent indicator ──
  agentLabel(): string {
    const thread = this.ai.currentThread();
    if (!thread?.agentId || thread.agentId === 'general') return '';
    // Try to find the agent name from available agents
    const agents = this.ai.availableAgents();
    const found = agents.find(a => a.id === thread.agentId);
    if (found) return found.name;
    // Fallback: show the raw ID nicely
    if (thread.agentId.startsWith('provider:')) return thread.agentId.slice('provider:'.length);
    return thread.agentId;
  }

  // ── Context linking ──
  isLinkedToContext(t: AiThread): boolean {
    return this._isLinked(t, this.ai.pageContext());
  }

  private _isLinked(t: AiThread, ctx: AiPageContext): boolean {
    if (ctx.flowId && t.flowId === ctx.flowId) return true;
    if (ctx.formId && t.metadata?.formId === ctx.formId) return true;
    return false;
  }

  private isTabletOrBelow(): boolean {
    try { return window.innerWidth <= 1280; } catch { return false; }
  }

  private getDrawerShell(): HTMLElement | null {
    try {
      return document.querySelector('.ai-panel-drawer.ant-drawer-right .ant-drawer-content-wrapper') as HTMLElement | null;
    } catch {
      return null;
    }
  }

  private applyDrawerShellSwipe(shift: number) {
    try {
      const shell = this.getDrawerShell();
      if (!shell) return;
      shell.style.setProperty('transition', 'none', 'important');
      shell.style.setProperty('transform', `translate3d(${shift}px, 0, 0)`, 'important');
    } catch {}
  }

  private clearDrawerShellSwipe(animateBack: boolean) {
    try {
      const shell = this.getDrawerShell();
      if (!shell) return;
      if (!animateBack) {
        shell.style.removeProperty('transition');
        shell.style.removeProperty('transform');
        return;
      }
      shell.style.removeProperty('transition');
      requestAnimationFrame(() => {
        try { shell.style.removeProperty('transform'); } catch {}
      });
    } catch {}
  }

  private resetDrawerSwipe() {
    this.drawerSwipeX = 0;
    this.drawerSwipeMode = 'idle';
    this.drawerSwipeStartX = 0;
    this.drawerSwipeStartY = 0;
  }
}
