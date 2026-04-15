import { Component, EventEmitter, Input, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiService } from '../ai.service';
import { AiToolLabelsService } from '../ai-tool-labels.service';

interface TaskNode {
  id: string;
  jobId: string;
  subject: string;
  description?: string;
  status: string;
  parentTaskId?: string;
  startedAt?: string;
  finishedAt?: string;
  toolCalls?: any[];
  children: TaskNode[];
}

@Component({
  selector: 'ai-canvas-tasks',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NzEmptyModule, NzToolTipModule],
  template: `
    <div class="tasks-wrap" *ngIf="tree().length; else empty">
      <ng-container *ngTemplateOutlet="taskList; context: { $implicit: tree(), depth: 0 }"></ng-container>

      <ng-template #taskList let-nodes let-depth="depth">
        <div class="task-node" *ngFor="let node of nodes" [style.padding-left.px]="depth * 14">
          <div class="task-row" [class]="'status-' + node.status"
            (click)="toggleExpanded(node.id)">
            <span nz-icon class="task-chev" *ngIf="node.children.length || node.toolCalls?.length"
              [nzType]="expanded.has(node.id) ? 'down' : 'right'" nzTheme="outline"></span>
            <span class="task-dot"></span>
            <span class="task-subject">{{ node.subject }}</span>
            <nz-tag [nzColor]="statusColor(node.status)" class="task-status-tag">{{ statusLabel(node.status) }}</nz-tag>
            <span class="task-dur" *ngIf="node.finishedAt">{{ duration(node) }}</span>
            <button *ngIf="node.status === 'waiting_permission'" nz-button nzSize="small" nzType="primary"
              (click)="goPermission($event, node)">
              Répondre
            </button>
          </div>
          <div *ngIf="expanded.has(node.id)">
            <div class="task-tools" *ngIf="node.toolCalls?.length">
              <div *ngFor="let tc of node.toolCalls" class="tool-line" [class.tool-err]="tc.status === 'error'"
                   [nz-tooltip]="tc.name">
                <span nz-icon [nzType]="tc.status === 'error' ? 'close-circle' : tc.status === 'running' ? 'loading' : 'check-circle'"
                      nzTheme="outline" [nzSpin]="tc.status === 'running'"></span>
                <span class="tool-name">{{ toolLabel(tc.name) }}</span>
                <span class="tool-dur" *ngIf="tc.duration">{{ tc.duration }}ms</span>
              </div>
            </div>
            <ng-container *ngTemplateOutlet="taskList; context: { $implicit: node.children, depth: depth + 1 }"></ng-container>
          </div>
        </div>
      </ng-template>
    </div>
    <ng-template #empty>
      <div class="tasks-empty">
        <nz-empty nzNotFoundContent="Aucune tâche en cours"></nz-empty>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: auto; }
    .tasks-wrap { padding: 8px 12px; }
    .task-node { margin: 2px 0; }
    .task-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 6px; cursor: pointer; transition: background .15s; font-size: 13px; }
    .task-row:hover { background: #fafafa; }
    .task-chev { font-size: 10px; color: #999; width: 10px; }
    .task-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: #bbb; }
    .task-row.status-done .task-dot { background: #52c41a; }
    .task-row.status-running .task-dot { background: #1677ff; animation: pulse 1.2s infinite; }
    .task-row.status-error .task-dot { background: #ff4d4f; }
    .task-row.status-waiting_permission .task-dot { background: #faad14; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .task-subject { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #333; }
    .task-status-tag { margin: 0; font-size: 10px; }
    .task-dur { font-size: 10px; color: #bbb; }
    .task-tools { margin: 3px 0 3px 32px; border-left: 2px solid #f0f0f0; padding: 3px 0 3px 10px; }
    .tool-line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; padding: 1px 0; }
    .tool-line.tool-err { color: #ff4d4f; }
    .tool-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tool-dur { font-size: 10px; color: #bbb; }
    .tasks-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; }
  `],
})
export class AiCanvasTasksComponent {
  @Input() threadId!: string;
  @Output() answerPermission = new EventEmitter<{ taskId: string; jobId: string }>();

  public ai = inject(AiService);
  private toolLabels = inject(AiToolLabelsService);
  expanded = new Set<string>();

  toolLabel(name?: string): string { return this.toolLabels.label(name); }

  tree = computed<TaskNode[]>(() => {
    const list = this.ai.canvasState()?.tasks || [];
    const map = new Map<string, TaskNode>();
    list.forEach(t => map.set(t.id, { ...t, children: [] }));
    const roots: TaskNode[] = [];
    map.forEach(node => {
      if (node.parentTaskId && map.has(node.parentTaskId)) {
        map.get(node.parentTaskId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  });

  toggleExpanded(id: string) {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
  }

  goPermission(e: Event, node: TaskNode) {
    e.preventDefault();
    e.stopPropagation();
    this.answerPermission.emit({ taskId: node.id, jobId: node.jobId });
    // Auto-scroll to permission card in chat
    setTimeout(() => {
      const el = document.querySelector(`[data-job-id="${node.jobId}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  statusColor(s: string) {
    if (s === 'done') return 'green';
    if (s === 'running') return 'blue';
    if (s === 'error') return 'red';
    if (s === 'waiting_permission') return 'orange';
    return 'default';
  }

  statusLabel(s: string) {
    const map: Record<string, string> = {
      done: 'Terminé', running: 'En cours', error: 'Erreur',
      waiting_permission: 'Permission', pending: 'En attente', cancelled: 'Annulé',
    };
    return map[s] || s;
  }

  duration(node: TaskNode): string {
    if (!node.startedAt || !node.finishedAt) return '';
    try {
      const ms = new Date(node.finishedAt).getTime() - new Date(node.startedAt).getTime();
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
    } catch { return ''; }
  }
}
