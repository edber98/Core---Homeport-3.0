import { Component, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiService, AiThread, AiPageContext, AiAvailableAgent } from './ai.service';
import { AiChatComponent } from './ai-chat.component';
import { AiSettingsComponent } from './ai-settings.component';

@Component({
  selector: 'ai-panel',
  standalone: true,
  imports: [CommonModule, NzDrawerModule, NzButtonModule, NzIconModule, NzDropDownModule, NzMenuModule, NzListModule, NzEmptyModule, NzToolTipModule, AiChatComponent, AiSettingsComponent],
  template: `
    <nz-drawer
      [nzVisible]="ai.drawerOpen()"
      (nzOnClose)="ai.closeDrawer()"
      [nzWidth]="460"
      nzPlacement="right"
      [nzClosable]="false"
      [nzBodyStyle]="{ padding: 0 }">

      <ng-container *nzDrawerContent>
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
              <button nz-button nzType="text" nzSize="small" nz-tooltip nzTooltipTitle="Paramètres"
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
              <button nz-button nzType="text" nzSize="small" (click)="ai.closeDrawer()">
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
        </div>
      </ng-container>
    </nz-drawer>
  `,
  styles: [`
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
    .chat-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
    .settings-area { flex: 1; overflow: hidden; min-height: 0; }
  `]
})
export class AiPanelComponent {
  view: 'chat' | 'history' | 'settings' = 'chat';
  threads: AiThread[] = [];

  constructor(public ai: AiService, private cdr: ChangeDetectorRef, private router: Router) {
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
}
