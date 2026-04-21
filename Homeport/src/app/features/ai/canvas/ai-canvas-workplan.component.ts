import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subscription } from 'rxjs';
import { AiService } from '../ai.service';
import { ApiClientService } from '../../../services/api-client.service';
import { AiAgentBadgeComponent } from '../agents/ai-agent-badge.component';
import { WindowManagerService } from '../window-manager/window-manager.service';
import { AiSubagentWindowComponent } from '../subagent-window/ai-subagent-window.component';
import { AiToolLabelsService } from '../ai-tool-labels.service';

interface WorkPlanData {
  threadId: string;
  plan: {
    messageId: string;
    summary: string;
    steps: Array<{ id: string; title: string; rationale?: string }>;
    risks: string[];
  } | null;
  mainTodo: {
    messageId: string;
    widgetId: string;
    todos: Array<{ id: string; content: string; activeForm?: string; status: string; toolCalls?: any[] }>;
  } | null;
  subagents: Array<{
    jobId: string;
    parentJobId: string | null;
    subagentType: string;
    agentName: string;
    agentEmoji: string;
    agentColor: string;
    agentTagline: string;
    status: string;
    startedAt: string;
    finishedAt: string;
    duration: number;
    error: string;
    summary: string;
    toolCallsCount: number;
    internalTodo: { todos: Array<{ id: string; content: string; status: string }> } | null;
    widgets: Array<{ widgetId: string; kind: string; messageId: string; title: string }>;
    pendingMessages: number;
    pendingPermission: {
      messageId: string;
      requestId: string;
      toolName: string;
      risk: string;
    } | null;
  }>;
  artifacts: Array<{
    fileId: string;
    name: string;
    mimeType?: string;
    size?: number;
    source: string;
    subagentJobId?: string | null;
    messageId: string;
  }>;
  actions: Array<{
    messageId: string;
    id: string;
    name: string;
    status: string;
    duration?: number;
    at: string;
    agent: 'parent' | 'subagent';
    subagentJobId?: string | null;
  }>;
}

/**
 * Vue unifiée « Plan de travail » qui remplace les onglets Agents + Tasks.
 * Arborescence hiérarchique : Plan > TODO principal > Sous-agents (chacun
 * avec ses todos internes / tools / widgets) > Artefacts > Actions.
 * Tout est cliquable et lié : click sur un item → scroll vers son message.
 */
@Component({
  selector: 'ai-canvas-workplan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzButtonModule, NzTagModule, NzToolTipModule, AiAgentBadgeComponent],
  template: `
    <div class="wp-wrap" *ngIf="data() as d; else loading">
      <!-- Section 1 : Plan (propose_plan) -->
      <section class="wp-section" *ngIf="d.plan">
        <header class="wp-section-head" (click)="toggle('plan')">
          <span nz-icon [nzType]="expanded().has('plan') ? 'down' : 'right'" nzTheme="outline"></span>
          <span class="wp-ico">🎯</span>
          <span class="wp-title">Plan</span>
          <span class="wp-count">{{ d.plan.steps.length }} étapes</span>
        </header>
        <div class="wp-section-body" *ngIf="expanded().has('plan')">
          <div class="wp-plan-summary">{{ d.plan.summary }}</div>
          <div class="wp-step" *ngFor="let step of d.plan.steps; let i = index" (click)="scrollTo(d.plan!.messageId)">
            <span class="wp-step-num">{{ i + 1 }}</span>
            <span class="wp-step-title">{{ step.title }}</span>
          </div>
        </div>
      </section>

      <!-- Section 2 : TODO principal -->
      <section class="wp-section" *ngIf="d.mainTodo">
        <header class="wp-section-head" (click)="toggle('todo')">
          <span nz-icon [nzType]="expanded().has('todo') ? 'down' : 'right'" nzTheme="outline"></span>
          <span class="wp-ico">✓</span>
          <span class="wp-title">Checklist</span>
          <span class="wp-count">{{ todoStats(d.mainTodo.todos) }}</span>
        </header>
        <div class="wp-section-body" *ngIf="expanded().has('todo')">
          <div *ngFor="let t of d.mainTodo.todos; trackBy: trackId"
               class="wp-todo-item"
               [class]="'wp-todo-' + t.status"
               (click)="scrollTo(d.mainTodo!.messageId)">
            <span class="wp-todo-ico" nz-icon [nzType]="todoIcon(t.status)" nzTheme="outline"></span>
            <span class="wp-todo-text" [class.done]="t.status === 'completed'">
              {{ t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content }}
            </span>
            <span class="wp-todo-linked" *ngIf="linkedSubagent(t, d.subagents) as sub" (click)="$event.stopPropagation(); openSubagent(sub)" [attr.title]="'Ouvrir ' + sub.agentName">
              {{ sub.agentEmoji }} {{ sub.agentName }}
            </span>
          </div>
        </div>
      </section>

      <!-- Section 3 : Sous-agents -->
      <section class="wp-section" *ngIf="d.subagents.length">
        <header class="wp-section-head" (click)="toggle('agents')">
          <span nz-icon [nzType]="expanded().has('agents') ? 'down' : 'right'" nzTheme="outline"></span>
          <span class="wp-ico">🤖</span>
          <span class="wp-title">Sous-agents</span>
          <span class="wp-count">{{ d.subagents.length }}</span>
        </header>
        <div class="wp-section-body" *ngIf="expanded().has('agents')">
          <div class="wp-subagent" *ngFor="let sub of d.subagents; trackBy: trackJobId"
               [class]="'wp-sub-' + sub.status">
            <div class="wp-sub-head" (click)="toggleSub(sub.jobId)">
              <span class="wp-sub-avatar" [style.background]="sub.agentColor">{{ sub.agentEmoji }}</span>
              <div class="wp-sub-ident">
                <div class="wp-sub-name">
                  {{ sub.agentName }}
                  <span class="wp-sub-type">· {{ sub.subagentType }}</span>
                </div>
                <div class="wp-sub-meta">
                  <span class="wp-sub-status" [class]="'sz-' + sub.status">{{ statusLabel(sub.status) }}</span>
                  <span *ngIf="sub.duration">· {{ formatDuration(sub.duration) }}</span>
                  <span *ngIf="sub.toolCallsCount">· {{ sub.toolCallsCount }} tools</span>
                </div>
              </div>
              <span class="wp-sub-chip wp-sub-perm" *ngIf="sub.pendingPermission" (click)="$event.stopPropagation(); scrollToPermission(sub.pendingPermission!.messageId)">
                🔔 Permission
              </span>
              <span class="wp-sub-chip wp-sub-mail" *ngIf="sub.pendingMessages">
                📮 {{ sub.pendingMessages }}
              </span>
              <button type="button" class="wp-sub-btn"
                      (click)="$event.stopPropagation(); openSubagent(sub)"
                      nz-tooltip [nzTooltipTitle]="'Ouvrir la fenêtre ' + sub.agentName">
                <span nz-icon nzType="expand" nzTheme="outline"></span>
              </button>
            </div>

            <div class="wp-sub-body" *ngIf="subExpanded().has(sub.jobId)">
              <!-- Todo interne -->
              <div class="wp-sub-todo" *ngIf="sub.internalTodo?.todos?.length">
                <div class="wp-sub-label">Plan interne</div>
                <div *ngFor="let t of sub.internalTodo!.todos" class="wp-todo-item wp-sub-todo-item" [class]="'wp-todo-' + t.status">
                  <span class="wp-todo-ico" nz-icon [nzType]="todoIcon(t.status)" nzTheme="outline"></span>
                  <span class="wp-todo-text" [class.done]="t.status === 'completed'">{{ t.content }}</span>
                </div>
              </div>
              <!-- Résumé -->
              <div class="wp-sub-summary" *ngIf="sub.summary">
                <div class="wp-sub-label">Résumé</div>
                <div class="wp-sub-summary-text">{{ truncate(sub.summary, 300) }}</div>
              </div>
              <!-- Widgets produits -->
              <div class="wp-sub-widgets" *ngIf="sub.widgets.length">
                <div class="wp-sub-label">Livrables ({{ sub.widgets.length }})</div>
                <div class="wp-widget-chip" *ngFor="let w of sub.widgets"
                     (click)="scrollTo(w.messageId)"
                     nz-tooltip [nzTooltipTitle]="w.title">
                  <span class="wp-widget-kind">{{ widgetKindLabel(w.kind) }}</span>
                  <span class="wp-widget-id">{{ w.widgetId }}</span>
                </div>
              </div>
              <!-- Erreur -->
              <div class="wp-sub-error" *ngIf="sub.error">⚠️ {{ sub.error }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 4 : Artefacts -->
      <section class="wp-section" *ngIf="d.artifacts.length">
        <header class="wp-section-head" (click)="toggle('artifacts')">
          <span nz-icon [nzType]="expanded().has('artifacts') ? 'down' : 'right'" nzTheme="outline"></span>
          <span class="wp-ico">📎</span>
          <span class="wp-title">Fichiers</span>
          <span class="wp-count">{{ d.artifacts.length }}</span>
        </header>
        <div class="wp-section-body" *ngIf="expanded().has('artifacts')">
          <div *ngFor="let a of d.artifacts" class="wp-artifact" (click)="scrollTo(a.messageId)">
            <span class="wp-art-ico" nz-icon [nzType]="fileIcon(a)" nzTheme="outline"></span>
            <div class="wp-art-body">
              <div class="wp-art-name">{{ a.name }}</div>
              <div class="wp-art-meta">
                <span>{{ sourceLabel(a.source) }}</span>
                <span *ngIf="a.size">· {{ formatSize(a.size) }}</span>
                <span *ngIf="a.mimeType">· {{ a.mimeType }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 5 : Actions (chronologique) -->
      <section class="wp-section" *ngIf="d.actions.length">
        <header class="wp-section-head" (click)="toggle('actions')">
          <span nz-icon [nzType]="expanded().has('actions') ? 'down' : 'right'" nzTheme="outline"></span>
          <span class="wp-ico">⚡</span>
          <span class="wp-title">Actions</span>
          <span class="wp-count">{{ d.actions.length }}</span>
        </header>
        <div class="wp-section-body" *ngIf="expanded().has('actions')">
          <div *ngFor="let ac of d.actions" class="wp-action" [class]="'wp-act-' + (ac.status || 'ok')" (click)="scrollTo(ac.messageId)">
            <span class="wp-act-dot" [class.err]="ac.status === 'error'"></span>
            <span class="wp-act-name">{{ toolLabel(ac.name) }}</span>
            <span class="wp-act-agent" *ngIf="ac.agent === 'subagent'" [title]="ac.subagentJobId">· sub-agent</span>
            <span class="wp-act-dur" *ngIf="ac.duration">· {{ ac.duration }}ms</span>
          </div>
        </div>
      </section>

      <!-- Empty state -->
      <div class="wp-empty" *ngIf="!d.plan && !d.mainTodo && !d.subagents.length && !d.artifacts.length">
        <span nz-icon nzType="schedule" nzTheme="outline"></span>
        <p>Aucun plan actif. Envoie un message pour démarrer.</p>
      </div>
    </div>

    <ng-template #loading>
      <div class="wp-loading">
        <span nz-icon nzType="loading" nzTheme="outline"></span>
        Chargement du plan…
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }
    .wp-wrap { padding: 8px 10px; font-size: 13px; color: #262626; }
    .wp-loading { padding: 32px; text-align: center; color: #8c8c8c; font-size: 12px; }
    .wp-section { margin-bottom: 4px; border-bottom: 1px solid #f5f5f5; padding-bottom: 6px; }
    .wp-section-head {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 4px; cursor: pointer;
      font-weight: 600; font-size: 12px; color: #595959;
      user-select: none;
      transition: color 0.15s ease;
    }
    .wp-section-head:hover { color: #e61982; }
    .wp-section-head span[nz-icon] { font-size: 11px; color: #8c8c8c; }
    .wp-ico { font-size: 14px; }
    .wp-title { flex: 1; }
    .wp-count { font-size: 11px; color: #8c8c8c; font-weight: 400; }
    .wp-section-body { padding: 2px 0 8px 20px; }
    .wp-plan-summary { font-size: 12px; color: #595959; margin-bottom: 6px; padding: 4px 8px; background: #fafafa; border-radius: 4px; border-left: 2px solid #1890ff; }
    .wp-step { display: flex; gap: 6px; padding: 3px 4px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .wp-step:hover { background: #fafafa; }
    .wp-step-num { font-weight: 600; color: #1890ff; min-width: 18px; }
    .wp-todo-item {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 6px; border-radius: 4px; cursor: pointer;
      font-size: 12px;
      transition: background 0.15s ease;
    }
    .wp-todo-item:hover { background: #fafafa; }
    .wp-todo-ico { font-size: 11px; }
    .wp-todo-completed .wp-todo-ico { color: #52c41a; }
    .wp-todo-in_progress { color: #e61982; font-weight: 600; }
    .wp-todo-in_progress .wp-todo-ico { color: #e61982; animation: spin 1.4s linear infinite; }
    .wp-todo-cancelled { opacity: 0.5; }
    .wp-todo-text { flex: 1; }
    .wp-todo-text.done { text-decoration: line-through; color: #8c8c8c; }
    .wp-todo-linked {
      font-size: 10.5px; padding: 1px 6px; border-radius: 10px;
      background: #fce7f3; color: #e61982; cursor: pointer;
      transition: all 0.15s ease;
    }
    .wp-todo-linked:hover { background: #e61982; color: #fff; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .wp-subagent {
      margin: 4px 0; border-radius: 6px;
      border: 1px solid #f0f0f0;
      transition: border-color 0.15s ease;
    }
    .wp-subagent:hover { border-color: #e8e8e8; }
    .wp-sub-completed { border-left: 3px solid #52c41a; }
    .wp-sub-running { border-left: 3px solid #e61982; }
    .wp-sub-error, .wp-sub-stalled { border-left: 3px solid #ff4d4f; }
    .wp-sub-waiting_permission { border-left: 3px solid #faad14; }
    .wp-sub-head {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; cursor: pointer;
    }
    .wp-sub-head:hover { background: #fafafa; }
    .wp-sub-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; color: #fff; flex-shrink: 0;
    }
    .wp-sub-ident { flex: 1; min-width: 0; }
    .wp-sub-name { font-weight: 600; font-size: 12.5px; color: #262626; }
    .wp-sub-type { font-weight: 400; color: #8c8c8c; font-size: 11px; }
    .wp-sub-meta { font-size: 10.5px; color: #8c8c8c; margin-top: 2px; }
    .wp-sub-status { font-weight: 500; }
    .wp-sub-status.sz-completed { color: #52c41a; }
    .wp-sub-status.sz-running { color: #e61982; }
    .wp-sub-status.sz-error, .wp-sub-status.sz-stalled { color: #ff4d4f; }
    .wp-sub-chip {
      font-size: 10px; padding: 2px 6px; border-radius: 10px;
      cursor: pointer; white-space: nowrap;
    }
    .wp-sub-perm { background: #fffbe6; color: #d48806; border: 1px solid #ffe58f; }
    .wp-sub-mail { background: #e6f7ff; color: #1890ff; }
    .wp-sub-btn {
      border: 0; background: transparent;
      padding: 4px 6px; cursor: pointer; color: #8c8c8c;
      border-radius: 4px;
    }
    .wp-sub-btn:hover { background: #f0f0f0; color: #e61982; }
    .wp-sub-body { padding: 4px 10px 10px 46px; }
    .wp-sub-label {
      font-size: 10.5px; font-weight: 600; color: #8c8c8c;
      text-transform: uppercase; letter-spacing: 0.3px;
      margin: 6px 0 3px;
    }
    .wp-sub-todo-item { padding: 2px 4px; }
    .wp-sub-summary-text {
      font-size: 11.5px; color: #595959; line-height: 1.5;
      padding: 4px 8px; background: #fafafa; border-radius: 4px;
      max-height: 120px; overflow-y: auto;
    }
    .wp-sub-widgets { display: flex; flex-wrap: wrap; gap: 4px; }
    .wp-widget-chip {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10.5px; padding: 2px 6px;
      background: #f0f0f0; border-radius: 10px; cursor: pointer;
      transition: background 0.15s ease;
    }
    .wp-widget-chip:hover { background: #fce7f3; }
    .wp-widget-kind { color: #8c8c8c; }
    .wp-widget-id { font-weight: 500; font-family: monospace; }
    .wp-sub-error {
      margin-top: 4px; padding: 4px 8px;
      background: #fff2f0; color: #ff4d4f; border-radius: 4px;
      font-size: 11px;
    }
    .wp-artifact {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 6px; cursor: pointer; border-radius: 4px;
    }
    .wp-artifact:hover { background: #fafafa; }
    .wp-art-ico { font-size: 14px; color: #e61982; }
    .wp-art-body { flex: 1; min-width: 0; }
    .wp-art-name { font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .wp-art-meta { font-size: 10.5px; color: #8c8c8c; }
    .wp-action {
      display: flex; align-items: center; gap: 6px;
      padding: 3px 6px; cursor: pointer; border-radius: 4px;
      font-size: 11.5px;
    }
    .wp-action:hover { background: #fafafa; }
    .wp-act-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #52c41a; flex-shrink: 0;
    }
    .wp-act-dot.err { background: #ff4d4f; }
    .wp-act-name { font-weight: 500; color: #262626; }
    .wp-act-agent { color: #8c8c8c; }
    .wp-act-dur { color: #bfbfbf; margin-left: auto; font-size: 10.5px; }
    .wp-empty {
      padding: 48px 16px; text-align: center; color: #8c8c8c;
      font-size: 12px;
    }
    .wp-empty span[nz-icon] { font-size: 32px; margin-bottom: 8px; display: block; color: #d9d9d9; }
  `],
})
export class AiCanvasWorkplanComponent implements OnInit, OnChanges, OnDestroy {
  @Input() threadId!: string;

  private ai = inject(AiService);
  private api = inject(ApiClientService);
  private wm = inject(WindowManagerService);
  private toolLabels = inject(AiToolLabelsService);

  data = signal<WorkPlanData | null>(null);
  expanded = signal<Set<string>>(new Set(['plan', 'todo', 'agents', 'artifacts', 'actions']));
  subExpanded = signal<Set<string>>(new Set());

  private _pollSub?: Subscription;
  private _sideSub?: any;

  ngOnInit(): void {
    this._load();
    this._subscribeBus();
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['threadId'] && !c['threadId'].firstChange) this._load();
  }

  ngOnDestroy(): void {
    try { this._sideSub?.unsubscribe?.(); } catch {}
  }

  private async _load(): Promise<void> {
    if (!this.threadId) return;
    try {
      const wsId = (this.ai as any).wsId?.() || undefined;
      const res = await this.api.get<WorkPlanData>(
        `/api/ai/threads/${this.threadId}/work-plan`,
        wsId ? { workspaceId: wsId } : {},
      ).toPromise();
      if (res) this.data.set(res);
    } catch (e: any) {
      console.warn('[workplan] load failed:', e?.message);
    }
  }

  private _subscribeBus(): void {
    const bus = (this.ai as any).sideEvents$;
    if (!bus?.subscribe) return;
    let pendingTimer: any = null;
    const scheduleReload = () => {
      if (pendingTimer) return;
      pendingTimer = setTimeout(() => { pendingTimer = null; this._load(); }, 500);
    };
    this._sideSub = bus.subscribe((ev: any) => {
      if (!ev) return;
      const t = ev.type || '';
      if (t.startsWith('canvas.') || t.startsWith('subagent.') || t === 'ai.message.created' || t === 'ai.message.updated' || t === 'job.status') {
        scheduleReload();
      }
    });
  }

  toggle(section: string): void {
    this.expanded.update(s => {
      const next = new Set(s);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  }

  toggleSub(jobId: string): void {
    this.subExpanded.update(s => {
      const next = new Set(s);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  }

  scrollTo(messageId: string): void {
    if (!messageId) return;
    try {
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-highlight');
        setTimeout(() => el.classList.remove('flash-highlight'), 1500);
      }
    } catch {}
  }

  scrollToPermission(messageId: string): void {
    this.scrollTo(messageId);
  }

  openSubagent(sub: any): void {
    this.wm.open({
      id: `subagent-${sub.jobId}`,
      title: `${sub.agentEmoji} ${sub.agentName}`,
      phaseChip: sub.subagentType,
      contentComponent: AiSubagentWindowComponent,
      contentInputs: { jobId: sub.jobId },
      action: 'replace',
    });
  }

  todoIcon(status: string): string {
    if (status === 'completed') return 'check-circle';
    if (status === 'in_progress') return 'sync';
    if (status === 'cancelled') return 'stop';
    return 'clock-circle';
  }

  todoStats(todos: Array<{ status: string }>): string {
    const done = todos.filter(t => t.status === 'completed').length;
    return `${done}/${todos.length}`;
  }

  linkedSubagent(todo: any, subs: WorkPlanData['subagents']): WorkPlanData['subagents'][0] | null {
    const tcs = Array.isArray(todo?.toolCalls) ? todo.toolCalls : [];
    for (const tc of tcs) {
      if (tc?.spawnedJobId) {
        const sub = subs.find(s => s.jobId === tc.spawnedJobId);
        if (sub) return sub;
      }
    }
    return null;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      queued: 'En file',
      running: 'En cours',
      waiting_dependency: 'Attente',
      waiting_permission: 'Permission',
      completed: 'Terminé',
      error: 'Erreur',
      stalled: 'Bloqué',
      cancelled: 'Annulé',
      paused: 'Pause',
    };
    return map[s] || s;
  }

  formatDuration(ms: number): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m${s % 60}s`;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024 * 10) / 10} MB`;
  }

  truncate(s: string, n: number): string {
    return s && s.length > n ? s.slice(0, n) + '…' : s;
  }

  widgetKindLabel(k: string): string {
    const map: Record<string, string> = {
      structured: 'Structure',
      canvas_html: 'Canvas',
      diagram: 'Diagramme',
      image_inline: 'Image',
      file_inline: 'Fichier',
      todo_list: 'Todo',
    };
    return map[k] || k;
  }

  sourceLabel(s: string): string {
    if (s === 'user_upload') return '⬆️ User';
    if (s === 'subagent') return '🤖 Sub-agent';
    return '🤖 Agent';
  }

  fileIcon(a: any): string {
    const mime = (a.mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'picture';
    if (mime.includes('pdf')) return 'file-pdf';
    if (mime.includes('word') || mime.includes('document')) return 'file-word';
    if (mime.includes('sheet') || mime.includes('excel')) return 'file-excel';
    if (mime.includes('presentation')) return 'file-ppt';
    return 'file';
  }

  toolLabel(name: string): string {
    return this.toolLabels.label(name);
  }

  trackId = (_: number, x: any) => x.id;
  trackJobId = (_: number, x: any) => x.jobId;
}
