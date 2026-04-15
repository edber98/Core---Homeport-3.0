import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService } from '../ai.service';

interface AgentNode {
  id: string;
  jobId: string;
  subject: string;
  description?: string;
  subagentType?: string;
  status: string;
  parentTaskId?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  error?: string;
  toolCalls?: any[];
  children: AgentNode[];
}

/**
 * Canvas « Agents » — visualise en direct l'arbre des sous-agents lancés par
 * spawn_subagent. Reçoit `canvas.task.create/update/toolcall` events (émis
 * par sub-runner.js + job-runner.js) et affiche :
 *  - Arbre hiérarchique (parent → enfants via parentTaskId)
 *  - Icône par subagentType (research / doc_writer / file_analyzer / general)
 *  - Status badge coloré + pulse pour running
 *  - Durée live (temps écoulé pour running, figée pour completed)
 *  - Compteur de tool calls + expand pour voir la liste
 */
@Component({
  selector: 'ai-canvas-agents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, NzTagModule, NzEmptyModule, NzToolTipModule, NzButtonModule, NzPopconfirmModule],
  template: `
    <div class="agents-wrap" *ngIf="tree().length; else empty">
      <div class="agents-header">
        <div class="agents-title">
          <span nz-icon nzType="deployment-unit" nzTheme="outline"></span>
          <span>Sous-agents</span>
        </div>
        <span class="agents-count">{{ totalCount() }} agent(s)</span>
      </div>
      <ng-container *ngTemplateOutlet="nodeList; context: { $implicit: tree(), depth: 0 }"></ng-container>

      <ng-template #nodeList let-nodes let-depth="depth">
        <div class="agent-node" *ngFor="let node of nodes; trackBy: trackById" [style.padding-left.px]="depth * 16">
          <div class="agent-row" [class]="'status-' + node.status" (click)="toggleExpanded(node.id)">
            <span nz-icon class="agent-chev"
                  *ngIf="node.children.length || node.toolCalls?.length"
                  [nzType]="expanded().has(node.id) ? 'down' : 'right'"
                  nzTheme="outline"></span>
            <span class="agent-chev" *ngIf="!node.children.length && !node.toolCalls?.length"></span>
            <span class="agent-icon">{{ iconFor(node.subagentType) }}</span>
            <div class="agent-body">
              <div class="agent-top">
                <span class="agent-subject" [nz-tooltip]="node.description || node.subject">
                  {{ truncate(node.subject, 120) }}
                </span>
                <nz-tag [nzColor]="statusColor(node.status)" class="agent-status">
                  <span *ngIf="node.status === 'running'" class="status-dot pulse"></span>
                  {{ statusLabel(node.status) }}
                </nz-tag>
                <button *ngIf="isCancellable(node.status)"
                        nz-button nzType="text" nzSize="small"
                        class="agent-stop"
                        nz-popconfirm
                        [nzPopconfirmTitle]="'Arrêter cette tâche ? Les sous-tâches dépendantes seront aussi annulées.'"
                        nzOkText="Arrêter" nzCancelText="Non" nzOkDanger
                        (click)="$event.stopPropagation()"
                        (nzOnConfirm)="cancelTask(node)"
                        nz-tooltip nzTooltipTitle="Arrêter la tâche (cascade)">
                  <span nz-icon nzType="stop" nzTheme="outline"></span>
                </button>
              </div>
              <div class="agent-meta">
                <span class="meta-type" *ngIf="node.subagentType">{{ node.subagentType }}</span>
                <span class="meta-dur" *ngIf="durationText(node) as d">{{ d }}</span>
                <span class="meta-tools" *ngIf="node.toolCalls?.length">
                  <span nz-icon nzType="tool" nzTheme="outline"></span>
                  {{ node.toolCalls!.length }} outil(s)
                </span>
                <span class="meta-waiting" *ngIf="node.status === 'waiting_dependency'">
                  ⏳ Attend une dépendance
                </span>
                <a class="meta-permission" *ngIf="node.status === 'waiting_permission'"
                   (click)="goPermission($event, node)">
                  🔒 Permission demandée
                </a>
              </div>
              <div class="agent-error" *ngIf="node.error">{{ node.error }}</div>
            </div>
          </div>
          <div class="agent-children" *ngIf="expanded().has(node.id)">
            <div class="toolcalls" *ngIf="node.toolCalls?.length">
              <div *ngFor="let tc of node.toolCalls; trackBy: trackByTc"
                   class="tc-line" [class.tc-err]="tc.status === 'error'">
                <span nz-icon
                      [nzType]="tc.status === 'error' ? 'close-circle' : tc.status === 'running' ? 'loading' : 'check-circle'"
                      nzTheme="outline"
                      [nzSpin]="tc.status === 'running'"></span>
                <span class="tc-name">{{ tc.name }}</span>
                <span class="tc-dur" *ngIf="tc.duration != null">{{ tc.duration }}ms</span>
                <span class="tc-args" *ngIf="tc.argsSummary"
                      [nz-tooltip]="tc.resultSummary || tc.argsSummary">
                  {{ truncate(tc.argsSummary, 60) }}
                </span>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="nodeList; context: { $implicit: node.children, depth: depth + 1 }"></ng-container>
          </div>
        </div>
      </ng-template>
    </div>
    <ng-template #empty>
      <div class="agents-empty">
        <nz-empty nzNotFoundContent="Aucun sous-agent actif"></nz-empty>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: auto; }
    .agents-wrap { padding: 10px 12px; }
    .agents-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
    .agents-title { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #333; font-size: 13px; }
    .agents-count { font-size: 11px; color: #999; }
    .agent-node { margin: 2px 0; }
    .agent-stop { flex-shrink: 0; padding: 0 6px; height: 24px; color: #999; }
    .agent-stop:hover { color: #ff4d4f; background: #fff1f0; }
    .agent-row { display: flex; align-items: flex-start; gap: 8px; padding: 7px 8px; border-radius: 6px; cursor: pointer; transition: background .15s; }
    .agent-row:hover { background: #fafafa; }
    .agent-chev { width: 12px; font-size: 10px; color: #999; padding-top: 3px; flex-shrink: 0; }
    .agent-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; padding-top: 1px; }
    .agent-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .agent-top { display: flex; align-items: center; gap: 6px; }
    .agent-subject { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #333; font-size: 13px; font-weight: 500; }
    .agent-status { margin: 0; font-size: 10px; display: inline-flex; align-items: center; gap: 4px; }
    .agent-meta { display: flex; align-items: center; gap: 10px; font-size: 11px; color: #999; flex-wrap: wrap; }
    .meta-type { color: #666; background: #f5f5f5; border-radius: 4px; padding: 1px 6px; font-size: 10px; }
    .meta-dur { color: #888; }
    .meta-tools { display: inline-flex; align-items: center; gap: 3px; color: #1677ff; }
    .meta-waiting { color: #faad14; }
    .meta-permission { color: #faad14; cursor: pointer; text-decoration: underline; }
    .agent-error { color: #ff4d4f; font-size: 11px; margin-top: 2px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
    .status-dot.pulse { animation: pulse 1.1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    .agent-row.status-running { background: linear-gradient(90deg, rgba(22,119,255,0.05), transparent); }
    .agent-row.status-error { background: rgba(255,77,79,0.04); }
    .agent-row.status-completed .agent-icon, .agent-row.status-done .agent-icon { opacity: 0.75; }
    .agent-children { margin-top: 3px; }
    .toolcalls { margin: 3px 0 6px 36px; border-left: 2px solid #f0f0f0; padding: 4px 0 4px 10px; }
    .tc-line { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #666; padding: 2px 0; }
    .tc-line.tc-err { color: #ff4d4f; }
    .tc-name { font-weight: 500; }
    .tc-dur { font-size: 10px; color: #bbb; }
    .tc-args { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; font-family: ui-monospace, monospace; font-size: 10px; }
    .agents-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; }
  `],
})
export class AiCanvasAgentsComponent implements OnInit, OnDestroy {
  @Input() threadId!: string;
  @Output() answerPermission = new EventEmitter<{ taskId: string; jobId: string }>();

  public ai = inject(AiService);
  expanded = signal<Set<string>>(new Set<string>());

  // Tick signal bumped every second so durations of running agents refresh live.
  private _tick = signal(0);
  private _timer: any = null;

  tree = computed<AgentNode[]>(() => {
    // Touch the tick to retrigger when live durations need refresh
    this._tick();
    const list = (this.ai.canvasState()?.tasks || []) as any[];
    const map = new Map<string, AgentNode>();
    list.forEach(t => map.set(t.id, { ...t, children: [] } as AgentNode));
    const roots: AgentNode[] = [];
    map.forEach(node => {
      const parent = node.parentTaskId && map.get(node.parentTaskId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    return roots;
  });

  totalCount = computed(() => (this.ai.canvasState()?.tasks || []).length);

  ngOnInit() {
    // Live timer for running tasks
    this._timer = setInterval(() => this._tick.update(v => v + 1), 1000);
  }

  ngOnDestroy() {
    if (this._timer) clearInterval(this._timer);
  }

  toggleExpanded(id: string) {
    const next = new Set(this.expanded());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.expanded.set(next);
  }

  trackById(_: number, n: AgentNode) { return n.id; }
  trackByTc(_: number, tc: any) { return tc.id || tc.at || tc.name; }

  private nzMsg = inject(NzMessageService);

  isCancellable(status: string): boolean {
    return status === 'running' || status === 'queued' || status === 'waiting_dependency' || status === 'waiting_permission' || status === 'paused';
  }

  cancelTask(node: AgentNode): void {
    const id = node.jobId || node.id;
    if (!id) return;
    this.ai.cancelJob(id).subscribe({
      next: (r: any) => {
        const n = r?.cancelledCount ?? 1;
        this.nzMsg.success(n > 1 ? `Tâche arrêtée (+${n - 1} cascade)` : 'Tâche arrêtée');
      },
      error: () => this.nzMsg.error('Échec de l\'arrêt'),
    });
  }

  iconFor(type?: string): string {
    switch (type) {
      case 'research': return '🔍';
      case 'doc_writer': return '📄';
      case 'file_analyzer': return '📊';
      case 'memory_extractor': return '🧠';
      case 'general': return '🤖';
      default: return '🤖';
    }
  }

  statusColor(s: string): string {
    if (s === 'running') return 'blue';
    if (s === 'completed' || s === 'done') return 'green';
    if (s === 'error') return 'red';
    if (s === 'waiting_permission') return 'orange';
    if (s === 'waiting_dependency') return 'gold';
    if (s === 'queued' || s === 'pending') return 'default';
    return 'default';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      queued: 'En file',
      pending: 'En attente',
      running: 'En cours',
      completed: 'Terminé',
      done: 'Terminé',
      error: 'Erreur',
      cancelled: 'Annulé',
      waiting_permission: 'Permission',
      waiting_dependency: 'Dépendance',
    };
    return map[s] || s;
  }

  truncate(s: string, max: number): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  durationText(node: AgentNode): string | null {
    const start = node.startedAt ? new Date(node.startedAt).getTime() : 0;
    const end = node.finishedAt
      ? new Date(node.finishedAt).getTime()
      : (node.status === 'running' ? Date.now() : 0);
    if (!start || !end || end < start) {
      if (node.duration != null) return this.formatMs(node.duration);
      return null;
    }
    return this.formatMs(end - start);
  }

  private formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m${s.toString().padStart(2, '0')}s`;
  }

  goPermission(e: Event, node: AgentNode) {
    e.preventDefault();
    e.stopPropagation();
    this.answerPermission.emit({ taskId: node.id, jobId: node.jobId });
    setTimeout(() => {
      const el = document.querySelector(`[data-job-id="${node.jobId}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }
}
