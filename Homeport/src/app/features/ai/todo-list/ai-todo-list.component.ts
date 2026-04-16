import { ChangeDetectionStrategy, Component, Input, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiService, AgentReport } from '../ai.service';
import { AiAgentBadgeComponent } from '../agents/ai-agent-badge.component';
import { AiAgentReportCardComponent } from '../agent-reports/ai-agent-report-card.component';

export interface TodoToolCall {
  name: string;
  status?: 'success' | 'error' | 'running';
  duration?: number;
  argsSummary?: string;
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
  subagentType?: string;
  spawnedJobId?: string;
}

export interface TodoItem {
  id: string;
  content: string;
  activeForm?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  toolCalls?: TodoToolCall[];
}

export interface TodoListPayload {
  todos: TodoItem[];
  title?: string;
  updatedAt?: string | Date;
}

/**
 * Checklist d'étapes rendue inline dans le chat. Widget éditable : le LLM
 * appelle `todo_write` plusieurs fois avec le même widgetId ('session-todos'),
 * la même card est mise à jour in-place → l'utilisateur voit le progrès.
 *
 * Design inspiré de la TodoWriteTool de Claude Code : un item in_progress à la
 * fois (ou zéro), narration inter-étapes, collapse automatique quand tout est
 * completed.
 */
@Component({
  selector: 'ai-todo-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, AiAgentBadgeComponent, AiAgentReportCardComponent],
  template: `
    <div class="todo-card" [class.all-done]="allDone()" [class.has-active]="hasActive()">
      <header class="todo-head" (click)="toggleExpanded()">
        <div class="head-left">
          <span class="head-ico" [class.pulse]="hasActive()">
            <span nz-icon
                  [nzType]="allDone() ? 'check-circle' : (hasActive() ? 'sync' : 'ordered-list')"
                  [nzSpin]="hasActive()"
                  nzTheme="outline"></span>
          </span>
          <div class="head-text">
            <div class="head-title">
              {{ data?.title || (allDone() ? 'Terminé' : hasActive() ? currentTask() : 'Checklist') }}
            </div>
            <div class="head-progress">
              <span class="counter">{{ completedCount() }}/{{ total() }}</span>
              <span class="bar-wrap">
                <span class="bar" [style.width.%]="progressPct()"></span>
              </span>
            </div>
          </div>
        </div>
        <span nz-icon [nzType]="expanded() ? 'up' : 'down'" nzTheme="outline" class="chev"></span>
      </header>

      <ul class="todo-items" *ngIf="expanded()">
        <li *ngFor="let t of data?.todos || []; let i = index"
            class="todo-item"
            [class.t-pending]="t.status === 'pending'"
            [class.t-active]="t.status === 'in_progress'"
            [class.t-done]="t.status === 'completed'"
            [class.t-cancelled]="t.status === 'cancelled'">
          <div class="item-main" (click)="toggleItemExpand(t.id)">
            <span class="status-ico">
              <span *ngIf="t.status === 'pending'" class="circle"></span>
              <span *ngIf="t.status === 'in_progress'" class="spinner" nz-icon nzType="loading" nzTheme="outline"></span>
              <span *ngIf="t.status === 'completed'" nz-icon nzType="check" nzTheme="outline"></span>
              <span *ngIf="t.status === 'cancelled'" nz-icon nzType="close" nzTheme="outline"></span>
            </span>
            <span class="content">
              <span class="item-text">
                {{ t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content }}
              </span>
              <!-- Résumé icônes inline : 1 icône par type de tool utilisé -->
              <span class="item-tool-icons" *ngIf="t.toolCalls?.length">
                <span *ngFor="let ic of itemToolIconSummary(t.toolCalls!); trackBy: trackIcon"
                      class="tool-ic-mini"
                      [style.background]="ic.bg"
                      [title]="ic.title">
                  <ng-container *ngIf="ic.emoji; else iconRef">{{ ic.emoji }}</ng-container>
                  <ng-template #iconRef>
                    <span nz-icon [nzType]="ic.icon" nzTheme="outline"></span>
                  </ng-template>
                </span>
              </span>
            </span>
          </div>
          <!-- Contenu expand : UNIQUEMENT les rapports subagents (pas de pills tools) -->
          <div class="item-body" *ngIf="spawnedSubagents(t.toolCalls || []).length && isItemExpanded(t.id)">
            <div class="item-subagents">
              <div *ngFor="let s of spawnedSubagents(t.toolCalls!); trackBy: trackSpawn" class="item-subagent">
                <ai-agent-report-card *ngIf="findAgentReport(s.spawnedJobId) as report" [report]="report">
                </ai-agent-report-card>
                <div *ngIf="!findAgentReport(s.spawnedJobId)" class="subagent-running">
                  <ai-agent-badge [agent]="{subagentType: s.subagentType, agentName: s.agentName, agentEmoji: s.agentEmoji, agentColor: s.agentColor}" [compact]="true">
                  </ai-agent-badge>
                  <span class="subagent-status">
                    <span nz-icon nzType="loading" nzTheme="outline"></span>
                    en cours…
                  </span>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 720px; }
    .todo-card {
      background: #fff;
      border: 1px solid #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 6px 0;
      transition: box-shadow .15s, border-color .15s;
    }
    .todo-card.has-active { box-shadow: 0 2px 12px rgba(230,25,130,.06); border-color: #ffd6e7; }
    .todo-card.all-done { opacity: .85; }

    .todo-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      user-select: none;
      transition: background .12s;
    }
    .todo-head:hover { background: #fafafa; }

    .head-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .head-ico {
      width: 28px; height: 28px;
      display: inline-flex; align-items: center; justify-content: center;
      background: #fff5fa; color: #e61982;
      border-radius: 50%;
      font-size: 14px;
      flex: 0 0 auto;
    }
    .all-done .head-ico { background: #f6ffed; color: #52c41a; }
    .head-ico.pulse {
      animation: todoPulse 1.4s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(230,25,130,.4);
    }
    @keyframes todoPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(230,25,130,.4); }
      50%      { box-shadow: 0 0 0 6px rgba(230,25,130,0); }
    }

    .head-text { flex: 1; min-width: 0; }
    .head-title {
      font-size: 13px; font-weight: 600; color: #262626;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      line-height: 1.3;
    }
    .head-progress {
      display: flex; align-items: center; gap: 8px;
      margin-top: 3px;
      font-size: 11px; color: #8c8c8c;
    }
    .counter { font-variant-numeric: tabular-nums; min-width: 28px; }
    .bar-wrap {
      flex: 1; max-width: 180px;
      height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden;
    }
    .bar {
      display: block; height: 100%;
      background: linear-gradient(90deg, #e61982, #ff70a6);
      border-radius: 2px;
      transition: width .3s ease;
    }
    .all-done .bar { background: linear-gradient(90deg, #52c41a, #73d13d); }

    .chev { color: #bfbfbf; font-size: 11px; flex: 0 0 auto; transition: color .15s; }
    .todo-head:hover .chev { color: #e61982; }

    .todo-items {
      list-style: none;
      margin: 0; padding: 4px 0 10px;
      border-top: 1px solid #f5f5f5;
      animation: itemsIn 200ms ease-out;
    }
    @keyframes itemsIn { from { opacity: 0; } to { opacity: 1; } }

    .todo-item {
      padding: 0;
      font-size: 13px;
      line-height: 1.45;
    }
    .item-main {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 7px 14px 7px 18px;
      cursor: default;
      transition: background .12s;
    }
    .todo-item:hover .item-main { background: #fafafa; }
    .todo-item.t-active .item-main,
    .todo-item .item-main:has(.item-chev) { cursor: pointer; }

    .item-chev { color: #bfbfbf; font-size: 10px; margin-left: auto; flex-shrink: 0; padding-top: 2px; }
    .todo-item:hover .item-chev { color: #e61982; }
    .item-tool-count { color: #8c8c8c; font-size: 11px; margin-left: 4px; font-weight: 500; }

    /* Mini-icônes inline : aperçu rapide des tool types utilisés */
    .item-tool-icons {
      display: inline-flex; align-items: center; gap: 3px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .tool-ic-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #f5f5f5;
      font-size: 9px;
      color: #595959;
      line-height: 1;
      cursor: default;
    }
    .tool-ic-mini [nz-icon] { font-size: 9px; }
    /* Pastilles agent (avec emoji + couleur de marque) contrastées */
    .tool-ic-mini:not([style*="background: #fafafa"]):not([style*="background: #f5f5f5"]) {
      color: #fff;
    }

    /* Body expand : tools pills + rapports subagents */
    .item-body {
      padding: 4px 14px 10px 42px;
      animation: itemToolsIn 180ms ease-out;
    }
    .item-tools {
      display: flex; flex-wrap: wrap; gap: 4px;
      margin-bottom: 8px;
    }
    .item-subagents {
      display: flex; flex-direction: column; gap: 6px;
    }
    .item-subagent { max-width: 100%; }
    .item-subagent ai-agent-report-card { display: block; }
    .subagent-running {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px;
      background: #fff5fa; border: 1px solid #ffd6e7; border-radius: 8px;
      font-size: 12px;
    }
    .subagent-running .subagent-status {
      display: inline-flex; align-items: center; gap: 4px;
      color: #e61982; font-weight: 500;
    }
    .subagent-running .subagent-status [nz-icon] {
      animation: spinLoad 1.2s linear infinite;
    }
    @keyframes spinLoad { to { transform: rotate(360deg); } }
    @keyframes itemToolsIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .item-tool-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px 2px 4px;
      background: #fafafa; border: 1px solid #f0f0f0;
      border-radius: 10px;
      font-size: 11px; color: #595959;
      max-width: 100%;
      overflow: hidden;
    }
    .item-tool-pill.tool-err { background: #fff2f0; border-color: #ffccc7; color: #cf1322; }
    .tool-agent-emoji {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px;
      background: #e61982; color: #fff;
      border-radius: 50%;
      font-size: 11px;
      flex-shrink: 0;
    }
    .tool-ic { color: #8c8c8c; font-size: 11px; padding: 0 2px; flex-shrink: 0; }
    .tool-count { font-weight: 700; color: #262626; font-variant-numeric: tabular-nums; }
    .tool-name { font-weight: 600; color: #262626; }
    .tool-hint { color: #8c8c8c; font-family: ui-monospace, Menlo, monospace; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
    .tool-dur { color: #bfbfbf; font-size: 10px; margin-left: auto; font-variant-numeric: tabular-nums; }

    .status-ico {
      flex: 0 0 auto;
      width: 16px; height: 20px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px;
    }
    .circle {
      width: 10px; height: 10px;
      border: 1.5px solid #d9d9d9; border-radius: 50%;
    }
    .spinner { color: #e61982; font-size: 12px; }
    .spinner [nz-icon] { animation: todoSpin 1s linear infinite; }
    @keyframes todoSpin { to { transform: rotate(360deg); } }

    .content { flex: 1; min-width: 0; }
    .item-text { color: #434343; }

    .t-pending .item-text { color: #8c8c8c; }
    .t-pending .status-ico .circle { border-color: #d9d9d9; }

    .t-active .item-text { color: #e61982; font-weight: 600; }

    .t-done .item-text {
      color: #8c8c8c;
      text-decoration: line-through;
      text-decoration-color: #d9d9d9;
    }
    .t-done .status-ico { color: #52c41a; }

    .t-cancelled .item-text {
      color: #bfbfbf;
      text-decoration: line-through;
    }
    .t-cancelled .status-ico { color: #ff4d4f; }
  `],
})
export class AiTodoListComponent {
  @Input() data?: TodoListPayload;

  private ai = inject(AiService);

  /** Cherche un message agent_report dans le thread avec ce jobId */
  findAgentReport(jobId?: string): AgentReport | null {
    if (!jobId) return null;
    const messages = this.ai.messages();
    for (const m of messages) {
      const k = (m.metadata as any)?.kind;
      if (k === 'agent_report' && (m.metadata as any)?.agentReport?.jobId === jobId) {
        return (m.metadata as any).agentReport as AgentReport;
      }
    }
    return null;
  }

  /** Filtre les tools hors spawn_subagent (pills) */
  nonSpawnTools(tools: TodoToolCall[]): TodoToolCall[] {
    return (tools || []).filter(t => t.name !== 'spawn_subagent');
  }

  /** Extrait les spawns (1 entry par subagent spawné) */
  spawnedSubagents(tools: TodoToolCall[]): TodoToolCall[] {
    return (tools || []).filter(t => t.name === 'spawn_subagent' && t.spawnedJobId);
  }

  trackSpawn(i: number, s: TodoToolCall) { return s.spawnedJobId || `s:${i}`; }

  // Par défaut : expand si en cours, collapse si tout done
  expanded = signal(true);
  /** IDs des items dont la liste de tools est dépliée. L'item in_progress est auto-expand. */
  manuallyExpandedItems = signal(new Set<string>());

  isItemExpanded(itemId: string): boolean {
    if (this.manuallyExpandedItems().has(itemId)) return true;
    const t = (this.data?.todos || []).find(x => x.id === itemId);
    // On n'auto-expand que si l'item a des SUBAGENTS à montrer (pas juste des tools simples)
    const hasSubs = this.spawnedSubagents(t?.toolCalls || []).length > 0;
    if (!hasSubs) return false;
    if (t && t.status === 'in_progress') return true;
    const todos = this.data?.todos || [];
    const lastWithSubs = [...todos].reverse().find(x => x.status === 'completed' && this.spawnedSubagents(x.toolCalls || []).length > 0);
    if (lastWithSubs && lastWithSubs.id === itemId) {
      const hasInProgress = todos.some(x => x.status === 'in_progress');
      if (!hasInProgress) return true;
    }
    return false;
  }

  toggleItemExpand(itemId: string): void {
    const t = (this.data?.todos || []).find(x => x.id === itemId);
    // Expand uniquement si l'item a des subagents (pas de tools simples)
    if (!this.spawnedSubagents(t?.toolCalls || []).length) return;
    const next = new Set(this.manuallyExpandedItems());
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    this.manuallyExpandedItems.set(next);
  }

  /** Groupe les tools consécutifs de même nom pour un item */
  groupItemTools(tools: TodoToolCall[]): Array<{name: string; count: number; label: string; icon: string; hasError: boolean; argsSummary?: string; totalDuration?: number; agentName?: string; agentEmoji?: string; agentColor?: string}> {
    if (!tools?.length) return [];
    const groups: any[] = [];
    let current: any = null;
    for (const tc of tools) {
      const name = tc.name;
      // spawn_subagent avec des agents différents = groupes séparés
      const key = name === 'spawn_subagent' ? `${name}:${tc.agentName || tc.subagentType}` : name;
      if (current && current.key === key) {
        current.count++;
        current.totalDuration = (current.totalDuration || 0) + (tc.duration || 0);
        if (tc.status === 'error') current.hasError = true;
      } else {
        current = {
          key,
          name,
          count: 1,
          label: this.toolLabel(name),
          icon: this.iconForTool(name),
          hasError: tc.status === 'error',
          argsSummary: tc.argsSummary,
          totalDuration: tc.duration || 0,
          agentName: tc.agentName,
          agentEmoji: tc.agentEmoji,
          agentColor: tc.agentColor,
        };
        groups.push(current);
      }
    }
    return groups;
  }

  trackTool(i: number, g: any) { return `${g.key}:${i}`; }

  trackIcon(i: number, ic: any) { return ic.key; }

  /**
   * Résumé d'icônes inline : 1 mini-pastille par subagent spawné uniquement.
   * Les tools simples (web_search, execute_code…) ne sont PAS affichés ici —
   * l'utilisateur veut les items épurés, juste les agents en pastille.
   */
  itemToolIconSummary(tools: TodoToolCall[]): Array<{key: string; icon: string; emoji?: string; bg: string; title: string}> {
    if (!tools?.length) return [];
    const seen = new Map<string, {key: string; icon: string; emoji?: string; bg: string; title: string; count: number}>();
    for (const t of tools) {
      if (t.name !== 'spawn_subagent' || !t.agentEmoji) continue;
      const key = `agent:${t.agentName || t.subagentType}`;
      const existing = seen.get(key);
      if (existing) existing.count++;
      else seen.set(key, {
        key,
        icon: 'team',
        emoji: t.agentEmoji,
        bg: t.agentColor || '#e61982',
        title: t.agentName || t.subagentType || 'agent',
        count: 1,
      });
    }
    const arr = [...seen.values()];
    return arr.slice(0, 4);
  }

  formatDur(ms?: number): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
    const m = Math.floor(ms / 60000); const s = Math.round((ms % 60000) / 1000);
    return s ? `${m}m${s}s` : `${m}m`;
  }

  toolLabel(name: string): string {
    const L: Record<string, string> = {
      web_search: 'Recherche web', web_fetch: 'Lecture page', research_deep: 'Recherche profonde',
      web_download: 'Téléchargement', execute_code: 'Exécution code',
      project_read_file: 'Lecture fichier', project_write_file: 'Écriture fichier',
      project_list_dir: 'Liste dossier', project_grep: 'Recherche texte',
      spawn_subagent: 'Sous-agent', send_message_to_agent: 'Message',
      display_image: 'Image', display_file: 'Fichier', render_structured: 'Tableau',
      render_interactive_canvas: 'Canvas', generate_diagram: 'Diagramme',
      ask_user: 'Question', propose_plan: 'Plan', install_package: 'Install',
      todo_write: 'Checklist', save_memory: 'Mémoire', get_memory: 'Mémoire',
    };
    return L[name] || name;
  }

  iconForTool(name: string): string {
    const M: Record<string, string> = {
      web_search: 'search', web_fetch: 'global', research_deep: 'experiment',
      web_download: 'cloud-download', execute_code: 'code',
      project_read_file: 'file-text', project_write_file: 'edit',
      project_list_dir: 'folder', project_grep: 'file-search',
      spawn_subagent: 'team', send_message_to_agent: 'message',
      display_image: 'picture', display_file: 'file-done',
      render_structured: 'table', render_interactive_canvas: 'layout',
      generate_diagram: 'partition', ask_user: 'question-circle',
      propose_plan: 'compass', install_package: 'appstore-add',
    };
    return M[name] || 'api';
  }

  total = computed(() => this.data?.todos?.length || 0);
  completedCount = computed(() => (this.data?.todos || []).filter(t => t.status === 'completed').length);
  progressPct = computed(() => {
    const t = this.total();
    return t ? Math.round((this.completedCount() / t) * 100) : 0;
  });
  hasActive = computed(() => (this.data?.todos || []).some(t => t.status === 'in_progress'));
  allDone = computed(() => {
    const todos = this.data?.todos || [];
    return todos.length > 0 && todos.every(t => t.status === 'completed' || t.status === 'cancelled');
  });
  currentTask = computed(() => {
    const active = (this.data?.todos || []).find(t => t.status === 'in_progress');
    return active ? (active.activeForm || active.content) : 'En cours…';
  });

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }
}
