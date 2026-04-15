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
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AiService } from '../ai.service';
import { AiAgentBadgeComponent } from '../agents/ai-agent-badge.component';
import { resolveAgentProfile } from '../agents/ai-roster';

interface AgentNode {
  id: string;
  jobId: string;
  subject: string;
  description?: string;
  subagentType?: string;
  // Roster (optionnel, enrichi par le backend)
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
  agentTagline?: string;
  agentFigure?: string;
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
  imports: [CommonModule, FormsModule, NzIconModule, NzTagModule, NzEmptyModule, NzToolTipModule, NzButtonModule, NzPopconfirmModule, NzInputModule, AiAgentBadgeComponent],
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
            <div class="agent-body">
              <div class="agent-top">
                <ai-agent-badge
                  *ngIf="node.subagentType || node.agentName"
                  [agent]="{
                    subagentType: node.subagentType,
                    agentName: node.agentName,
                    agentEmoji: node.agentEmoji,
                    agentColor: node.agentColor,
                    agentTagline: node.agentTagline,
                    agentFigure: node.agentFigure
                  }"
                  [compact]="true">
                </ai-agent-badge>
                <span class="agent-subject" [nz-tooltip]="node.description || node.subject">
                  {{ truncate(node.subject, 100) }}
                </span>
                <span class="agent-status-inline" [class]="'sz-' + node.status">
                  <span *ngIf="node.status === 'running'" class="status-dot pulse"></span>
                  {{ statusLabel(node.status) }}
                </span>
                <button *ngIf="canMessage(node.status)"
                        nz-button nzType="text" nzSize="small"
                        class="agent-chat-open"
                        [class.active]="chatOpen() === node.jobId"
                        (click)="toggleChat($event, node)"
                        nz-tooltip nzTooltipTitle="Envoyer un message à ce sous-agent">
                  <span nz-icon nzType="message" nzTheme="outline"></span>
                </button>
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
                <span class="meta-dur" *ngIf="durationText(node) as d">{{ d }}</span>
                <span class="meta-tools" *ngIf="node.toolCalls?.length">
                  <span nz-icon nzType="tool" nzTheme="outline"></span>
                  {{ node.toolCalls!.length }} outil{{ node.toolCalls!.length > 1 ? 's' : '' }}
                </span>
                <span class="meta-waiting" *ngIf="node.status === 'waiting_dependency'">
                  <span nz-icon nzType="hourglass" nzTheme="outline"></span> Attend une dépendance
                </span>
                <a class="meta-permission" *ngIf="node.status === 'waiting_permission'"
                   (click)="goPermission($event, node)">
                  <span nz-icon nzType="lock" nzTheme="outline"></span> Permission demandée
                </a>
              </div>
              <!-- Mini-chat inline : message au subagent en cours -->
              <div class="agent-chat" *ngIf="chatOpen() === node.jobId" (click)="$event.stopPropagation()">
                <textarea
                  nz-input
                  [(ngModel)]="chatDraft"
                  [nzAutosize]="{ minRows: 1, maxRows: 3 }"
                  [placeholder]="chatPlaceholder(node)"
                  (keydown.enter)="$event.preventDefault(); sendChat(node)"
                  class="agent-chat-input"
                ></textarea>
                <div class="agent-chat-actions">
                  <span class="chat-hint">Délivré au prochain tour du sous-agent</span>
                  <button nz-button nzType="primary" nzSize="small"
                          (click)="sendChat(node)"
                          [disabled]="!chatDraft.trim() || sending()">
                    <span nz-icon nzType="send" nzTheme="outline"></span>
                    Envoyer
                  </button>
                </div>
              </div>
              <div class="agent-error" *ngIf="node.error">{{ node.error }}</div>
            </div>
          </div>
          <div class="agent-children" *ngIf="expanded().has(node.id)">
            <div class="toolcalls" *ngIf="node.toolCalls?.length">
              <div *ngFor="let tc of node.toolCalls; trackBy: trackByTc"
                   class="tc-line" [class.tc-err]="tc.status === 'error'"
                   [nz-tooltip]="tc.name">
                <span nz-icon
                      [nzType]="tc.status === 'error' ? 'close-circle' : tc.status === 'running' ? 'loading' : 'check-circle'"
                      nzTheme="outline"
                      [nzSpin]="tc.status === 'running'"></span>
                <span class="tc-name" [title]="tc.name">{{ toolLabel(tc.name) }}</span>
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
    .agent-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
    .agent-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .agent-subject { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #595959; font-size: 12px; }
    .agent-status-inline {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 600;
      padding: 2px 7px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: .3px;
    }
    .agent-status-inline.sz-running { color: #e61982; background: #fff5fa; }
    .agent-status-inline.sz-waiting_dependency { color: #d48806; background: #fff7e6; }
    .agent-status-inline.sz-waiting_permission { color: #d48806; background: #fff7e6; }
    .agent-status-inline.sz-queued { color: #8c8c8c; background: #fafafa; }
    .agent-status-inline.sz-completed, .agent-status-inline.sz-done { color: #52c41a; background: #f6ffed; }
    .agent-status-inline.sz-error { color: #cf1322; background: #fff2f0; }
    .agent-status-inline.sz-cancelled { color: #8c8c8c; background: #fafafa; }

    .agent-chat-open { flex-shrink: 0; padding: 0 6px; height: 22px; color: #bfbfbf; border-radius: 10px; }
    .agent-chat-open:hover, .agent-chat-open.active { color: #e61982; background: #fff5fa; }

    .agent-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #8c8c8c; flex-wrap: wrap; }
    .meta-dur { color: #8c8c8c; font-variant-numeric: tabular-nums; }
    .meta-tools { display: inline-flex; align-items: center; gap: 3px; color: #8c8c8c; }
    .meta-waiting { color: #d48806; display: inline-flex; align-items: center; gap: 3px; }
    .meta-permission { color: #d48806; cursor: pointer; text-decoration: underline; display: inline-flex; align-items: center; gap: 3px; }

    /* Mini-chat inline pour envoyer un message au subagent en cours */
    .agent-chat {
      margin-top: 8px;
      background: #fff;
      border: 1px solid #ffd6e7;
      border-radius: 8px;
      padding: 8px 10px;
      animation: chatIn 180ms ease-out;
    }
    @keyframes chatIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .agent-chat-input { font-size: 12px; border: 0 !important; box-shadow: none !important; padding: 2px 0 !important; resize: none; }
    .agent-chat-input:focus { box-shadow: none !important; }
    .agent-chat-actions {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 4px; padding-top: 4px;
      border-top: 1px dashed #f5e7f0;
    }
    .chat-hint { font-size: 10px; color: #bfbfbf; font-style: italic; }
    .agent-error { color: #ff4d4f; font-size: 11px; margin-top: 2px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block; }
    .status-dot.pulse { animation: pulse 1.1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    .agent-row.status-running { background: linear-gradient(90deg, rgba(22,119,255,0.05), transparent); }
    .agent-row.status-error { background: rgba(255,77,79,0.04); }
    .agent-row.status-completed .agent-icon, .agent-row.status-done .agent-icon { opacity: 0.75; }
    .agent-children { margin-top: 3px; }
    .toolcalls { margin: 3px 0 6px 36px; border-left: 2px solid #f0f0f0; padding: 4px 0 4px 10px; }
    .tc-line { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #666; padding: 2px 0; min-width: 0; }
    .tc-line.tc-err { color: #ff4d4f; }
    .tc-name { font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .tc-dur { font-size: 10px; color: #bbb; flex-shrink: 0; }
    .tc-args { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; font-family: ui-monospace, monospace; font-size: 10px; }
    .agents-empty { display: flex; align-items: center; justify-content: center; height: 100%; padding: 20px; }
  `],
})
export class AiCanvasAgentsComponent implements OnInit, OnDestroy {
  @Input() threadId!: string;
  @Output() answerPermission = new EventEmitter<{ taskId: string; jobId: string }>();

  public ai = inject(AiService);
  expanded = signal<Set<string>>(new Set<string>());
  chatOpen = signal<string | null>(null); // jobId du subagent dont le mini-chat est ouvert
  chatDraft = '';
  sending = signal(false);

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

  /** Peut-on envoyer un message à ce subagent ? (le job doit être vivant) */
  canMessage(status: string): boolean {
    return status === 'running' || status === 'queued' || status === 'waiting_dependency' || status === 'paused';
  }

  toggleChat(ev: Event, node: AgentNode): void {
    ev.stopPropagation();
    this.chatOpen.set(this.chatOpen() === node.jobId ? null : node.jobId);
    this.chatDraft = '';
    if (this.chatOpen()) {
      // Focus le textarea au prochain tick
      setTimeout(() => {
        const ta = document.querySelector('ai-canvas-agents .agent-chat-input textarea') as HTMLTextAreaElement | null;
        ta?.focus();
      }, 50);
    }
  }

  chatPlaceholder(node: AgentNode): string {
    const name = node.agentName
      || resolveAgentProfile({ subagentType: node.subagentType })?.name
      || node.subagentType
      || 'cet agent';
    return `Message à ${name}…`;
  }

  sendChat(node: AgentNode): void {
    const msg = this.chatDraft.trim();
    if (!msg || !node.jobId || this.sending()) return;
    this.sending.set(true);
    this.ai.sendMessageToAgent(node.jobId, msg, msg.slice(0, 60)).subscribe({
      next: () => {
        this.nzMsg.success(`Message délivré à ${node.agentName || node.subagentType}`);
        this.chatDraft = '';
        this.chatOpen.set(null);
        this.sending.set(false);
      },
      error: (e: any) => {
        this.nzMsg.error(e?.error?.message || 'Envoi impossible (job terminé ?)');
        this.sending.set(false);
      },
    });
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
      case 'project_doc_writer': return '📘';
      case 'general': return '🤖';
      default: return '🤖';
    }
  }

  /** Mapping tool name → label humain (aligné avec TOOL_LABELS de ai-message). */
  private static TOOL_LABELS: Record<string, string> = {
    web_search: 'Recherche web', web_fetch: 'Lecture page web', web_download: 'Téléchargement',
    research_deep: 'Recherche approfondie',
    project_list_dir: 'Liste dossier', project_tree: 'Arborescence projet',
    project_read_file: 'Lecture fichier', project_read_batch: 'Lecture multiple',
    project_grep: 'Recherche texte', project_search: 'Recherche fichiers',
    project_write_file: 'Écriture fichier', project_create_folder: 'Création dossier',
    project_delete: 'Suppression', project_move: 'Déplacement',
    project_refresh_tree: 'Actualisation arbo',
    project_stage_for_sandbox: 'Préparation fichier sandbox',
    execute_code: 'Exécution code', install_package: 'Installation package',
    generate_document: 'Génération document', edit_document: 'Édition document',
    render_html_preview: 'Aperçu HTML', build_website: 'Site web',
    ask_user: 'Question', spawn_subagent: 'Sous-agent',
    render_structured: 'Affichage structuré', propose_plan: 'Plan d\'action',
    generate_diagram: 'Diagramme', display_image: 'Image',
    search_manual: 'Manuel', get_manual_section: 'Section manuel',
    save_memory: 'Mémoire', get_memory: 'Mémoire',
    save_project_memory: 'Mémoire projet', get_project_memory: 'Mémoire projet',
    get_project_knowledge: 'Mémoire projet', set_project_knowledge: 'Mémoire projet',
    suggest_memory_entries: 'Suggestion mémoire projet',
    search_tools: 'Recherche outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution outil',
    open_element: 'Ouverture', open_credentials: 'Identifiants', list_credentials: 'Identifiants',
    compact_and_transfer: 'Transfert', activate_capsule: 'Activation outils',
  };

  toolLabel(name?: string): string {
    if (!name) return '';
    return (this.constructor as typeof AiCanvasAgentsComponent).TOOL_LABELS[name] || name;
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
