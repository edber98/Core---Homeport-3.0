import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiService } from '../ai.service';
import { ApiClientService } from '../../../services/api-client.service';
import { resolveAgentProfile } from '../agents/ai-roster';
import { AiToolLabelsService } from '../ai-tool-labels.service';

type TimelineItemKind = 'tool' | 'message_in' | 'message_out' | 'status' | 'permission' | 'text_out';

interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  at: Date;
  text?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  status?: string;
  fromName?: string;
  /** Pour message_in : message encore en attente de prise en compte par le subagent */
  pending?: boolean;
}

/**
 * Fenêtre d'interaction avec un subagent spécifique.
 * Affiche timeline live (tools, messages, statut) + input pour lui parler.
 * Montée dans le WM via `wm.open({ contentComponent: AiSubagentWindowComponent, contentInputs: { jobId } })`.
 */
@Component({
  selector: 'ai-subagent-window',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NzIconModule, NzButtonModule, NzInputModule, NzTagModule],
  template: `
    <div class="sw-wrap">
      <div class="sw-header" *ngIf="profile">
        <div class="sw-avatar" [style.background]="profile.color">{{ profile.emoji }}</div>
        <div class="sw-ident">
          <div class="sw-name">{{ profile.name }}</div>
          <div class="sw-tag">{{ profile.tagline }}</div>
        </div>
        <nz-tag [nzColor]="statusColor()">{{ statusLabel() }}</nz-tag>
      </div>

      <div class="sw-body">
        <div class="sw-todo" *ngIf="subagentTodo() as todo">
          <div class="sw-todo-title">{{ todo.title || 'Checklist interne' }}</div>
          <div class="sw-todo-item" *ngFor="let t of todo.todos; trackBy: trackTodo" [class]="'tdo-' + t.status">
            <span nz-icon [nzType]="todoIcon(t.status)" nzTheme="outline"></span>
            <span class="sw-todo-text" [class.done]="t.status === 'completed'">{{ t.content }}</span>
          </div>
        </div>

        <div class="sw-timeline">
          <div class="sw-empty" *ngIf="timeline().length === 0">
            <span nz-icon nzType="loading" nzTheme="outline"></span>
            <span>En attente d'activité…</span>
          </div>
          <div *ngFor="let it of timeline(); trackBy: trackItem" class="sw-item" [class]="'kind-' + it.kind">
            <div class="sw-item-time">{{ formatTime(it.at) }}</div>
            <div class="sw-item-body">
              <ng-container [ngSwitch]="it.kind">
                <div *ngSwitchCase="'tool'" class="sw-tool">
                  <span nz-icon nzType="tool" nzTheme="outline"></span>
                  <span class="sw-tool-name">{{ toolLabel(it.toolName) }}</span>
                  <span class="sw-tool-raw" *ngIf="it.toolName !== toolLabel(it.toolName)">{{ it.toolName }}</span>
                  <span class="sw-tool-args" *ngIf="formatArgs(it.toolArgs) as s">{{ s }}</span>
                </div>
                <div *ngSwitchCase="'message_in'" class="sw-msg in" [class.pending]="it.pending">
                  <div class="sw-msg-from">
                    {{ it.fromName || 'Utilisateur' }} → {{ profile?.name }}
                    <span class="sw-pending-chip" *ngIf="it.pending">
                      <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                      En attente de prise en compte
                    </span>
                    <span class="sw-delivered-chip" *ngIf="it.pending === false">
                      <span nz-icon nzType="check" nzTheme="outline"></span>
                      Pris en compte
                    </span>
                  </div>
                  <div class="sw-msg-text" [innerHTML]="renderMd(it.text || '')"></div>
                </div>
                <div *ngSwitchCase="'message_out'" class="sw-msg out">
                  <div class="sw-msg-from">{{ profile?.name }} → {{ it.fromName || 'parent' }}</div>
                  <div class="sw-msg-text" [innerHTML]="renderMd(it.text || '')"></div>
                </div>
                <div *ngSwitchCase="'text_out'" class="sw-text-out">
                  <div class="sw-text-head">
                    <span nz-icon nzType="message" nzTheme="outline"></span>
                    {{ profile?.name }} répond
                  </div>
                  <div class="sw-text-body" [innerHTML]="renderMd(it.text || '')"></div>
                </div>
                <div *ngSwitchCase="'status'" class="sw-status">
                  <span nz-icon nzType="info-circle" nzTheme="outline"></span>
                  <span>{{ it.text }}</span>
                </div>
                <div *ngSwitchCase="'permission'" class="sw-perm">
                  <span nz-icon nzType="lock" nzTheme="outline"></span>
                  <span>{{ it.text }}</span>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <div class="sw-input" *ngIf="isActive()">
        <textarea nz-input [(ngModel)]="draft" rows="2"
                  placeholder="Écris un message à {{ profile?.name || 'ce sous-agent' }}…"
                  (keydown.enter)="onEnter($event)"></textarea>
        <button nz-button nzType="primary" [disabled]="!draft.trim() || sending()" (click)="send()">
          <span nz-icon [nzType]="sending() ? 'loading' : 'send'" nzTheme="outline"></span>
          Envoyer
        </button>
      </div>
      <div class="sw-finished" *ngIf="!isActive()">
        <span nz-icon nzType="check-circle" nzTheme="outline"></span>
        Ce sous-agent est terminé — vous pouvez consulter son historique ci-dessus.
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .sw-wrap { display: flex; flex-direction: column; height: 100%; font-size: 12.5px; color: #262626; }
    .sw-header {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .sw-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: #fff; flex-shrink: 0;
    }
    .sw-ident { flex: 1; min-width: 0; }
    .sw-name { font-weight: 700; font-size: 13px; }
    .sw-tag { font-size: 11px; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sw-body {
      flex: 1; overflow-y: auto; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .sw-todo {
      padding: 10px 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px;
    }
    .sw-todo-title { font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #262626; }
    .sw-todo-item { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 12px; }
    .sw-todo-item.tdo-in_progress { color: #e61982; font-weight: 600; }
    .sw-todo-item.tdo-completed span[nz-icon] { color: #52c41a; }
    .sw-todo-item.tdo-cancelled { opacity: 0.5; text-decoration: line-through; }
    .sw-todo-item .sw-todo-text.done { text-decoration: line-through; color: #8c8c8c; }
    .sw-timeline { display: flex; flex-direction: column; gap: 6px; }
    .sw-empty {
      display: flex; align-items: center; gap: 8px;
      padding: 24px; color: #8c8c8c; font-size: 12px;
      justify-content: center;
    }
    .sw-item {
      display: flex; gap: 10px;
      padding: 8px 10px; border-radius: 8px;
      transition: background 0.15s ease;
    }
    .sw-item:hover { background: #fafafa; }
    .sw-item-time { font-size: 10px; color: #bfbfbf; flex-shrink: 0; min-width: 40px; }
    .sw-item-body { flex: 1; min-width: 0; }
    .sw-tool {
      display: flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: #595959;
    }
    .sw-tool-name { font-weight: 600; color: #262626; }
    .sw-tool-raw {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 10px;
      color: #bfbfbf; padding: 1px 5px; border-radius: 3px; background: #fafafa;
    }
    .sw-tool-args {
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 10.5px;
      background: #f5f5f5; padding: 1px 6px; border-radius: 3px;
      color: #595959;
      max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .sw-msg { padding: 8px 10px; border-radius: 8px; }
    .sw-msg.in { background: #fff7e6; border-left: 3px solid #fa8c16; }
    .sw-msg.in.pending { background: #fffbe6; border-left-color: #faad14; border-left-style: dashed; }
    .sw-msg.out { background: #e6f7ff; border-left: 3px solid #1890ff; }
    .sw-msg-from {
      font-size: 10.5px; color: #8c8c8c; font-weight: 600; margin-bottom: 3px;
      display: flex; align-items: center; gap: 6px;
    }
    .sw-pending-chip, .sw-delivered-chip {
      font-size: 10px; padding: 1px 6px; border-radius: 10px;
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: auto;
    }
    .sw-pending-chip { background: #fffbe6; color: #d48806; border: 1px solid #ffe58f; }
    .sw-delivered-chip { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
    .sw-msg-text { font-size: 12.5px; line-height: 1.5; }
    .sw-msg-text ::ng-deep p { margin: 0 0 4px; }
    .sw-msg-text ::ng-deep code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .sw-text-out {
      padding: 10px 12px; border-radius: 8px;
      background: #fdf2f8; border-left: 3px solid #e61982;
    }
    .sw-text-head {
      display: flex; align-items: center; gap: 6px;
      font-size: 10.5px; font-weight: 600; color: #e61982; margin-bottom: 4px;
    }
    .sw-text-body { font-size: 12.5px; line-height: 1.6; color: #262626; }
    .sw-text-body ::ng-deep p { margin: 0 0 6px; }
    .sw-text-body ::ng-deep code { background: #fff; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .sw-text-body ::ng-deep pre { background: #fff; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0; }
    .sw-text-body ::ng-deep ul, .sw-text-body ::ng-deep ol { margin: 4px 0; padding-left: 20px; }
    .sw-status, .sw-perm {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11.5px; color: #8c8c8c;
    }
    .sw-perm { color: #fa8c16; }
    .sw-input {
      display: flex; gap: 8px; align-items: flex-end;
      padding: 10px 14px; border-top: 1px solid #f0f0f0; flex-shrink: 0;
      background: #fafafa;
    }
    .sw-input textarea { flex: 1; resize: none; font-size: 12.5px; }
    .sw-finished {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 14px; background: #f6ffed; color: #52c41a;
      border-top: 1px solid #f0f0f0; font-size: 12px;
    }
  `],
})
export class AiSubagentWindowComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) jobId!: string;

  private ai = inject(AiService);
  private api = inject(ApiClientService);
  private msg = inject(NzMessageService);
  private toolLabels = inject(AiToolLabelsService);

  profile: any = null;
  private _job = signal<any | null>(null);
  private _events = signal<TimelineItem[]>([]);
  private _subagentTodo = signal<any | null>(null);

  draft = '';
  sending = signal(false);

  private _busSub: any = null;
  private _jobStreamSub: any = null;

  timeline = computed(() => this._events());

  isActive = computed(() => {
    const s = this._job()?.status;
    return !!s && !['completed', 'error', 'cancelled'].includes(s);
  });

  subagentTodo = computed(() => this._subagentTodo());

  ngOnInit(): void {
    this._load();
    this._subscribeBus();
    this._subscribeJobStream();
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['jobId'] && !c['jobId'].firstChange) {
      this._load();
      if (this._jobStreamSub) this._jobStreamSub.unsubscribe?.();
      this._subscribeJobStream();
    }
  }

  ngOnDestroy(): void {
    if (this._busSub) this._busSub.unsubscribe?.();
    if (this._jobStreamSub) this._jobStreamSub.unsubscribe?.();
  }

  /**
   * Subscription directe au SSE du job pour capter les events LLM (message,
   * tool.*, done) qui ne sont PAS forwardés vers le thread bus (seul canvas.*
   * et subagent.* sont forwardés). Sans ça, impossible de streamer le texte
   * que le subagent génère en réponse.
   */
  private _subscribeJobStream(): void {
    try {
      const stream$ = (this.ai as any).streamJob?.(this.jobId);
      if (!stream$) return;
      this._jobStreamSub = stream$.subscribe({
        next: (ev: any) => this._handleJobEvent(ev),
        error: (e: any) => console.warn('[subagent-window] job stream error:', e?.message),
      });
    } catch (e: any) {
      console.warn('[subagent-window] streamJob not available:', e?.message);
    }
  }

  private _handleJobEvent(ev: any): void {
    if (!ev || !ev.type) return;
    if (ev.type === 'message' && typeof ev.text === 'string') {
      this._events.update(arr => {
        const last = arr[arr.length - 1];
        if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
          const updated = [...arr];
          updated[updated.length - 1] = { ...last, text: (last.text || '') + ev.text };
          return updated;
        }
        return [...arr, {
          id: `text-live-${Date.now()}`,
          kind: 'text_out',
          at: new Date(),
          text: ev.text,
        }];
      });
      return;
    }
    if (ev.type === 'tool.start') {
      // Finalise le text_out en cours → nouvel id pour le prochain
      this._events.update(arr => {
        const last = arr[arr.length - 1];
        if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
          const updated = [...arr];
          updated[updated.length - 1] = { ...last, id: `text-${Date.now()}` };
          return updated;
        }
        return arr;
      });
      return;
    }
    if (ev.type === 'tool.end') {
      const toolId = `tool-${ev.id || ev.toolId || Date.now()}`;
      this._events.update(arr => {
        if (arr.some(x => x.id === toolId)) return arr;
        return [...arr, {
          id: toolId,
          kind: 'tool',
          at: new Date(),
          toolName: ev.name || ev.toolName,
          toolArgs: ev.args,
          toolResult: ev.result,
        }];
      });
      return;
    }
    if (ev.type === 'job.status' && ev.status) {
      this._job.update(j => j ? { ...j, status: ev.status } : j);
      if (ev.status === 'completed' || ev.status === 'error') {
        this._events.update(arr => [...arr, {
          id: `status-${Date.now()}`,
          kind: 'status',
          at: new Date(),
          text: ev.status === 'error' ? `Erreur : ${ev.error || 'inconnu'}` : 'Terminé',
        }]);
      }
      return;
    }
  }

  private async _load(): Promise<void> {
    try {
      const job = await this.api.get<any>(`/api/ai/jobs/${this.jobId}`, { workspaceId: this._wsId() }).toPromise();
      this._job.set(job);
      const p = resolveAgentProfile({ subagentType: job?.subagentType, agentName: job?.agentName });
      this.profile = p ? { ...p } : { name: job?.subagentType || 'Sous-agent', emoji: '🤖', color: '#e61982', tagline: '' };
      this._seedTimelineFromJob(job);
      await this._loadSubagentTodo();
    } catch (e: any) {
      console.warn('[subagent-window] load failed:', e?.message);
    }
  }

  private _wsId(): string | undefined {
    try { return (this.ai as any).wsId?.() || undefined; } catch { return undefined; }
  }

  private _seedTimelineFromJob(job: any): void {
    if (!job) return;
    const items: TimelineItem[] = [];
    const dedup = new Set<string>();
    const add = (it: TimelineItem) => {
      if (dedup.has(it.id)) return;
      dedup.add(it.id);
      items.push(it);
    };

    if (job.startedAt) {
      add({ id: 'start', kind: 'status', at: new Date(job.startedAt), text: `Démarrage de ${this.profile?.name || 'l\'agent'}` });
    }

    // SideEvents persistés (tool.end, subagent.message.received, message deltas...)
    // = historique complet depuis le backend, permet de tout voir à la réouverture.
    const sideEvents: any[] = Array.isArray(job.sideEvents) ? job.sideEvents : [];
    // Regroupe les text deltas en un seul bloc de texte par "run" (coupé sur tool_use ou status)
    let textBuffer = '';
    let textBufferStart: Date | null = null;
    const flushText = () => {
      if (textBuffer.trim()) {
        const at = textBufferStart || new Date();
        add({ id: `text-${at.getTime()}-${items.length}`, kind: 'text_out', at, text: textBuffer });
      }
      textBuffer = '';
      textBufferStart = null;
    };
    for (const ev of sideEvents) {
      const at = new Date(ev.at || ev.timestamp || Date.now());
      if (ev.type === 'message' && ev.text) {
        textBuffer += ev.text;
        if (!textBufferStart) textBufferStart = at;
        continue;
      }
      if (ev.type === 'tool.end') {
        flushText();
        const id = `tool-${ev.id || at.getTime()}`;
        add({
          id,
          kind: 'tool',
          at,
          toolName: ev.name,
          toolArgs: ev.args,
          toolResult: ev.result,
        });
      } else if (ev.type === 'subagent.message.received') {
        flushText();
        add({
          id: `msg-${at.getTime()}-${ev.fromName || ''}`,
          kind: ev.targetJobId === this.jobId ? 'message_in' : 'message_out',
          at,
          text: ev.message || ev.summary || '(message)',
          fromName: ev.fromName,
          pending: false, // déjà délivré (pour historique)
        });
      }
    }
    flushText();

    // Canvas state : tool calls live (prend le relais si sideEvents absents)
    const canvasTask = (this.ai.canvasState()?.tasks || []).find((t: any) => t.id === this.jobId || t.jobId === this.jobId);
    const liveCalls: any[] = canvasTask?.toolCalls || [];
    for (const tc of liveCalls) {
      add({
        id: `tool-${tc.id || tc.at || tc.name}`,
        kind: 'tool',
        at: new Date(tc.at || Date.now()),
        toolName: tc.name,
        toolArgs: tc.args || (tc.argsSummary ? { _summary: tc.argsSummary } : undefined),
        toolResult: tc.result || tc.resultSummary,
      });
    }

    // Fallback : artifacts persistés (fin de job, si pas de sideEvents)
    if (!sideEvents.length && !liveCalls.length && Array.isArray(job.result?.artifacts)) {
      for (const tc of job.result.artifacts) {
        add({
          id: `tool-${tc.id || tc.name + items.length}`,
          kind: 'tool',
          at: new Date(tc.at || job.finishedAt || Date.now()),
          toolName: tc.name,
          toolArgs: tc.args,
          toolResult: tc.result,
        });
      }
    }

    // Mailbox messages : délivrés (consommés par le subagent) ET en attente
    if (Array.isArray(job.pendingMessages)) {
      for (const m of job.pendingMessages) {
        const at = new Date(m.createdAt);
        add({
          id: `msg-${at.getTime()}-${m.fromName || ''}`,
          kind: 'message_in',
          at,
          text: m.message,
          fromName: m.fromName,
          pending: !m.delivered,
        });
      }
    }

    if (job.finishedAt) {
      add({ id: 'end', kind: 'status', at: new Date(job.finishedAt), text: job.status === 'error' ? `Erreur : ${job.error || 'inconnu'}` : 'Terminé' });
    }
    items.sort((a, b) => a.at.getTime() - b.at.getTime());
    this._events.set(items);
  }

  private async _loadSubagentTodo(): Promise<void> {
    try {
      const tid = this.ai.currentThread()?.id || (this.ai.currentThread() as any)?._id;
      if (!tid) return;
      const res = await this.api.get<any>(`/api/ai/threads/${tid}`, { workspaceId: this._wsId() }).toPromise();
      const msgs = res?.messages || [];
      const widgetId = `subagent-todos-${String(this.jobId).slice(-12)}`;
      const todoMsg = msgs.find((m: any) => m?.metadata?.widgetId === widgetId);
      if (todoMsg?.metadata?.todoList) {
        this._subagentTodo.set(todoMsg.metadata.todoList);
      }
    } catch { /* ignore */ }
  }

  private _subscribeBus(): void {
    const bus = (this.ai as any).sideEvents$;
    if (!bus || !bus.subscribe) return;
    this._busSub = bus.subscribe((ev: any) => {
      if (!ev) return;
      // Un event canvas.* utilise `taskId`, un event job utilise `jobId/_jobId/targetJobId`.
      const targetJobId = ev.jobId || ev.targetJobId || ev._jobId || ev.taskId;
      if (targetJobId && String(targetJobId) !== String(this.jobId)) return;

      if (ev.type === 'message' && typeof ev.text === 'string') {
        // Stream text delta du subagent → accumule dans un text_out "en cours"
        this._events.update(arr => {
          const last = arr[arr.length - 1];
          if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
            const updated = [...arr];
            updated[updated.length - 1] = { ...last, text: (last.text || '') + ev.text };
            return updated;
          }
          return [...arr, {
            id: `text-live-${Date.now()}`,
            kind: 'text_out',
            at: new Date(),
            text: ev.text,
          }];
        });
        return;
      }
      if (ev.type === 'tool.start') {
        // Un nouveau tool commence → ferme le text_out "live" en cours pour séparer
        this._events.update(arr => {
          const last = arr[arr.length - 1];
          if (last && last.kind === 'text_out' && last.id.startsWith('text-live-')) {
            const updated = [...arr];
            updated[updated.length - 1] = { ...last, id: `text-${Date.now()}` };
            return updated;
          }
          return arr;
        });
      }
      if (ev.type === 'tool.end' || ev.type === 'canvas.task.toolcall') {
        const toolId = `tool-${ev.toolId || ev.id || ev.at || Date.now()}`;
        this._events.update(arr => {
          if (arr.some(x => x.id === toolId)) return arr;
          return [...arr, {
            id: toolId,
            kind: 'tool',
            at: new Date(ev.at || Date.now()),
            toolName: ev.toolName || ev.name,
            toolArgs: ev.args || (ev.argsSummary ? { _summary: ev.argsSummary } : undefined),
            toolResult: ev.result || ev.resultSummary,
          }];
        });
      } else if (ev.type === 'subagent.message.received') {
        const kind: TimelineItemKind = ev.targetJobId === this.jobId ? 'message_in' : 'message_out';
        const msgId = `msg-${ev.at || Date.now()}-${ev.fromName || ''}`;
        this._events.update(arr => {
          // Dédup : si un message identique (même at + fromName) existe déjà, skip.
          if (arr.some(x => x.id === msgId)) return arr;
          return [...arr, {
            id: msgId,
            kind,
            at: new Date(ev.at || Date.now()),
            text: ev.message || ev.summary || '(message)',
            fromName: ev.fromName,
          }];
        });
      } else if (ev.type === 'canvas.task.update' || ev.type === 'job.status') {
        const next = ev.status;
        if (next) {
          this._job.update(j => j ? { ...j, status: next } : j);
          this._events.update(arr => [...arr, {
            id: `status-${Date.now()}-${arr.length}`,
            kind: 'status',
            at: new Date(),
            text: `Statut → ${next}${ev.error ? ` (${ev.error})` : ''}`,
          }]);
        }
      } else if (ev.type === 'ai.message.updated' && ev.kind === 'todo_list') {
        this._loadSubagentTodo();
      }
    });
  }

  async send(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.sending()) return;
    this.sending.set(true);
    try {
      const tid = this.ai.currentThread()?.id || (this.ai.currentThread() as any)?._id;
      if (!tid) { this.msg.error('Pas de thread actif'); return; }
      await this.api.post<any>(
        `/api/ai/threads/${tid}/subagent-poke`,
        { jobId: this.jobId, message: text },
        { workspaceId: this._wsId() },
      ).toPromise();
      // Pas d'ajout optimiste : le backend émet `subagent.message.received` qui
      // sera reçu via sideEvents$ et ajouté dans la timeline sans duplication.
      this.draft = '';
    } catch (e: any) {
      this.msg.error(`Envoi échoué : ${e?.message || 'erreur'}`);
    } finally {
      this.sending.set(false);
    }
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  toolLabel(name: string | undefined): string {
    return this.toolLabels.label(name);
  }

  formatArgs(args: any): string {
    if (!args) return '';
    const s = JSON.stringify(args);
    if (s.length > 80) return s.slice(0, 80) + '…';
    return s;
  }

  formatTime(d: Date): string {
    try {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  }

  renderMd(text: string): string {
    try {
      const html = marked.parse(String(text || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } catch { return text; }
  }

  statusColor(): string {
    const s = this._job()?.status;
    if (s === 'running') return 'processing';
    if (s === 'completed') return 'success';
    if (s === 'error') return 'error';
    if (s === 'waiting_permission' || s === 'waiting_dependency') return 'warning';
    return 'default';
  }

  statusLabel(): string {
    const s = this._job()?.status || 'unknown';
    const map: Record<string, string> = {
      queued: 'En file',
      running: 'En cours',
      waiting_dependency: 'Attente dep.',
      waiting_permission: 'Attente permission',
      paused: 'En pause',
      completed: 'Terminé',
      error: 'Erreur',
      cancelled: 'Annulé',
      stalled: 'Bloqué',
    };
    return map[s] || s;
  }

  trackItem = (_: number, it: TimelineItem) => it.id;
  trackTodo = (_: number, t: any) => t.id;

  todoIcon(status: string): string {
    if (status === 'completed') return 'check-circle';
    if (status === 'in_progress') return 'sync';
    if (status === 'cancelled') return 'stop';
    return 'clock-circle';
  }
}
