import { Component, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiMessage, AiMessageSegment, AiToolCall, AiService } from './ai.service';
import { NodeExecResultDialogComponent } from '../flow/node-exec-result-dialog.component';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  enrich_context: 'Contexte', create_flow: 'Création flow', list_graph: 'Graphe',
  get_templates: 'Templates', get_template_details: 'Détails template', ensure_start: 'Démarrage',
  add_node: 'Ajout noeud', remove_node: 'Suppression', replace_node: 'Remplacement',
  connect_nodes: 'Connexion', disconnect_nodes: 'Déconnexion',
  connect_by_output_name: 'Connexion sortie', get_output_options: 'Sorties',
  set_node_args: 'Config args', set_node_description: 'Description',
  validate_flow: 'Validation', auto_layout: 'Layout', save_flow: 'Sauvegarde',
  create_start_form: 'Formulaire start', propose_context_mapping: 'Mapping',
  get_node_schema: 'Schéma noeud', get_node_info: 'Info noeud',
  list_predecessors: 'Prédécesseurs', get_predecessor_context: 'Contexte préd.',
  search_predecessors: 'Recherche préd.', get_scenarios: 'Scénarios',
  get_msgin_preview: 'Aperçu msgIn', get_form_schema: 'Schéma form',
  set_form_schema: 'MAJ schéma', add_field: 'Ajout champ', update_field: 'Modif champ',
  remove_field: 'Suppr champ', add_section: 'Ajout section',
  reorder_fields: 'Réordonnancement', get_field_types: 'Types champs',
  create_form: 'Création form', save_form: 'Sauvegarde form',
  get_output_schema: 'Schéma sortie', build_schema: 'Construction schéma',
  search_forms: 'Recherche forms', load_form: 'Chargement form',
  update_section: 'Modif section', update_form_settings: 'Paramètres form',
  deploy_flow: 'Déploiement', undeploy_flow: 'Arrêt production',
  get_deployment_status: 'Statut déploiement', start_run: 'Lancement exécution',
  list_runs: 'Historique exécutions', get_run_stats: 'Statistiques',
};

interface ToolGroup {
  category: string;
  icon: string;
  color: string;
  tools: AiToolCall[];
}

/** Processed segment for display — text-before-tools merged into reasoning blocks */
interface ProcessedSegment {
  type: 'text' | 'reasoning';
  content?: string;          // for text segments (final response)
  reasoningText?: string;    // for reasoning segments (text absorbed from preceding text)
  toolCalls?: AiToolCall[];  // for reasoning segments
}

const TOOL_CATEGORIES: Record<string, { category: string; icon: string; color: string }> = {};
const CAT_PLAN = { category: 'Analyse', icon: 'search', color: '#722ed1' };
const CAT_QUESTION = { category: 'Question', icon: 'question-circle', color: '#fa8c16' };
const CAT_BUILD = { category: 'Construction', icon: 'tool', color: '#1677ff' };
const CAT_EXEC = { category: 'Exécution', icon: 'thunderbolt', color: '#52c41a' };
const CAT_VALID = { category: 'Finalisation', icon: 'check-circle', color: '#13c2c2' };
const CAT_MEM = { category: 'Mémoire', icon: 'database', color: '#eb2f96' };

// Planning
for (const k of ['search_tools', 'get_tool_details', 'get_templates', 'get_template_details',
  'list_graph', 'get_output_options', 'get_node_schema', 'get_output_schema', 'get_node_info',
  'list_predecessors', 'get_predecessor_context', 'search_predecessors', 'get_scenarios',
  'get_msgin_preview', 'list_providers', 'search_workflows', 'get_form_schema', 'get_field_types',
  'search_forms', 'load_form', 'get_deployment_status', 'list_runs', 'get_run_stats'])
  TOOL_CATEGORIES[k] = CAT_PLAN;
// Question
TOOL_CATEGORIES['ask_user'] = CAT_QUESTION;
// Building
for (const k of ['create_flow', 'ensure_start', 'add_node', 'remove_node', 'replace_node',
  'connect_nodes', 'disconnect_nodes', 'connect_by_output_name',
  'set_node_args', 'set_node_description', 'create_start_form', 'build_schema',
  'propose_context_mapping', 'set_form_schema', 'add_field', 'update_field', 'remove_field',
  'add_section', 'update_section', 'update_form_settings', 'reorder_fields', 'create_form'])
  TOOL_CATEGORIES[k] = CAT_BUILD;
// Execution
for (const k of ['execute_tool', 'run_workflow', 'deploy_flow', 'undeploy_flow', 'start_run']) TOOL_CATEGORIES[k] = CAT_EXEC;
// Validation
for (const k of ['validate_flow', 'auto_layout', 'save_flow', 'save_form']) TOOL_CATEGORIES[k] = CAT_VALID;
// Memory
for (const k of ['save_memory', 'get_memory', 'enrich_context']) TOOL_CATEGORIES[k] = CAT_MEM;

@Component({
  selector: 'ai-message',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzTagModule, NzPopoverModule, NodeExecResultDialogComponent],
  template: `
    <div class="ai-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
      <div class="avatar">
        <span *ngIf="msg.role === 'user'" nz-icon nzType="user" nzTheme="outline"></span>
        <span *ngIf="msg.role === 'assistant'" nz-icon nzType="robot" nzTheme="outline"></span>
      </div>

      <div class="body">
        <!-- Segments mode: reasoning blocks with text + tools, final text at end -->
        <ng-container *ngIf="msg.segments?.length; else flatLayout">
          <ng-container *ngFor="let ps of getProcessedSegments()">
            <!-- Final response text -->
            <div class="content" *ngIf="ps.type === 'text' && ps.content"
                 [innerHTML]="renderMarkdown(ps.content)"></div>
            <!-- Reasoning block: optional text + tool groups -->
            <div class="reasoning-block" *ngIf="ps.type === 'reasoning'">
              <div class="reasoning-header">
                <span nz-icon nzType="bulb" nzTheme="outline"></span>
                <span>Raisonnement</span>
              </div>
              <div class="reasoning-text" *ngIf="ps.reasoningText" [innerHTML]="renderMarkdown(ps.reasoningText)"></div>
              <ng-container *ngFor="let group of groupTools(ps.toolCalls || [])">
                <div class="tool-group">
                  <div class="tool-group-header" [style.color]="group.color">
                    <span nz-icon [nzType]="group.icon" nzTheme="outline" class="group-icon"></span>
                    <span class="group-label">{{ group.category }}</span>
                  </div>
                  <div class="tool-tags">
                    <ng-container *ngFor="let tc of group.tools">
                      <ng-container *ngTemplateOutlet="toolTagTpl; context: { $implicit: tc }"></ng-container>
                    </ng-container>
                  </div>
                </div>
              </ng-container>
            </div>
          </ng-container>
        </ng-container>

        <!-- Flat layout: content + tools (for DB-loaded messages without segments) -->
        <ng-template #flatLayout>
          <div class="content" *ngIf="msg.content" [innerHTML]="renderMarkdown(msg.content)"></div>
          <div class="reasoning-block" *ngIf="msg.toolCalls?.length">
            <div class="reasoning-header">
              <span nz-icon nzType="bulb" nzTheme="outline"></span>
              <span>Raisonnement</span>
            </div>
            <ng-container *ngFor="let group of groupTools(msg.toolCalls!)">
              <div class="tool-group">
                <div class="tool-group-header" [style.color]="group.color">
                  <span nz-icon [nzType]="group.icon" nzTheme="outline" class="group-icon"></span>
                  <span class="group-label">{{ group.category }}</span>
                </div>
                <div class="tool-tags">
                  <ng-container *ngFor="let tc of group.tools">
                    <ng-container *ngTemplateOutlet="toolTagTpl; context: { $implicit: tc }"></ng-container>
                  </ng-container>
                </div>
              </div>
            </ng-container>
          </div>
        </ng-template>

        <!-- Reusable tool tag template -->
        <ng-template #toolTagTpl let-tc>
          <nz-tag
            class="tool-tag"
            [nzColor]="!tc.status ? 'processing' : (tc.status === 'error' ? 'red' : 'green')"
            nz-popover
            [nzPopoverContent]="popoverTpl"
            nzPopoverTrigger="hover"
            nzPopoverPlacement="topLeft"
            [nzPopoverOverlayStyle]="{ maxWidth: '500px' }"
            (click)="openToolResult(tc)">
            <span nz-icon [nzType]="!tc.status ? 'loading' : (tc.status === 'error' ? 'close-circle' : 'check-circle')" nzTheme="outline" class="tag-icon" [class.spinning]="!tc.status"></span>
            {{ toolLabel(tc.name) }}
            <span class="tag-extra" *ngIf="toolExtra(tc)">{{ toolExtra(tc) }}</span>
            <span class="tag-dur" *ngIf="tc.duration">{{ tc.duration }}ms</span>
          </nz-tag>
          <ng-template #popoverTpl>
            <div class="popover-content">
              <div class="popover-section" *ngIf="tc.args">
                <div class="popover-label">Arguments</div>
                <pre class="popover-json">{{ tc.args | json }}</pre>
              </div>
              <div class="popover-section" *ngIf="tc.result !== undefined && tc.result !== null">
                <div class="popover-label">Résultat</div>
                <pre class="popover-json">{{ truncateJson(tc.result) }}</pre>
              </div>
              <div class="popover-section" *ngIf="tc.status === 'error' && !tc.result">
                <div class="popover-label">Erreur</div>
                <pre class="popover-json error-text">Erreur inconnue</pre>
              </div>
            </div>
          </ng-template>
        </ng-template>

        <!-- Tool result dialog -->
        <node-exec-result-dialog
          *ngIf="selectedToolResult"
          [attempts]="selectedToolAttempts"
          [template]="selectedToolTemplate"
          [nodeTitle]="selectedToolTitle"
          (close)="selectedToolResult = null">
        </node-exec-result-dialog>
      </div>
    </div>
  `,
  styles: [`
    .ai-msg { display: flex; gap: 10px; padding: 8px 0; }
    .ai-msg.user { flex-direction: row-reverse; }
    .ai-msg.user .body { align-items: flex-end; }
    .ai-msg.user .content { background: #e6f4ff; border-radius: 12px 12px 2px 12px; padding: 8px 14px; }
    .ai-msg.assistant .content { background: #f5f5f5; border-radius: 12px 12px 12px 2px; padding: 8px 14px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .ai-msg.assistant .avatar { background: #e6f4ff; color: #1677ff; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .content { max-width: 85%; word-break: break-word; line-height: 1.5; }
    .content :host ::ng-deep p { margin: 0 0 4px; }
    .content :host ::ng-deep p:last-child { margin: 0; }
    .content :host ::ng-deep code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .content :host ::ng-deep pre { background: #f0f0f0; padding: 8px; border-radius: 6px; overflow-x: auto; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; opacity: 0.5; max-width: 85%; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-text { font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 6px; word-break: break-word; }
    .reasoning-text ::ng-deep p { margin: 0 0 4px; }
    .reasoning-text ::ng-deep p:last-child { margin: 0; }
    .reasoning-text ::ng-deep code { background: #e8e8e8; padding: 1px 3px; border-radius: 2px; font-size: 11px; }
    .reasoning-text ::ng-deep ul, .reasoning-text ::ng-deep ol { margin: 2px 0; padding-left: 18px; }
    .reasoning-text ::ng-deep li { margin: 1px 0; }
    .tool-group { margin: 2px 0; }
    .tool-group-header { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; margin-bottom: 2px; opacity: 0.85; }
    .group-icon { font-size: 12px; }
    .group-label { text-transform: uppercase; letter-spacing: 0.5px; }
    .tool-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tool-tag { cursor: pointer; display: inline-flex; align-items: center; gap: 3px; font-size: 12px; margin: 0; }
    .tag-icon { font-size: 11px; }
    .tag-icon.spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tag-extra { opacity: 0.7; font-size: 11px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag-dur { opacity: 0.6; font-size: 10px; margin-left: 2px; }
    .popover-content { max-height: 400px; overflow-y: auto; }
    .popover-section { margin-bottom: 8px; }
    .popover-section:last-child { margin-bottom: 0; }
    .popover-label { font-weight: 600; font-size: 12px; color: #666; margin-bottom: 4px; }
    .popover-json { font-size: 11px; background: #f5f5f5; padding: 6px 8px; border-radius: 4px; margin: 0; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
    .error-text { color: #ff4d4f; }
  `]
})
export class AiMessageComponent {
  @Input() msg!: AiMessage;
  private ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);

  // Tool result dialog state
  selectedToolResult: AiToolCall | null = null;
  selectedToolAttempts: any[] = [];
  selectedToolTitle = '';
  selectedToolTemplate: any = null;

  private _groupCache = new WeakMap<AiToolCall[], ToolGroup[]>();
  private _processedCache = new WeakMap<AiMessageSegment[], ProcessedSegment[]>();

  /** Open tool result dialog when clicking on a tool tag */
  openToolResult(tc: AiToolCall) {
    if (!tc.result && tc.status !== 'error') return; // No result yet (still running)
    this.selectedToolResult = tc;
    this.selectedToolTitle = this.toolLabel(tc.name);
    this.selectedToolAttempts = [{
      status: tc.status || 'success',
      durationMs: tc.duration,
      result: tc.result,
    }];
    this.selectedToolTemplate = null;

    // For execute_tool, load the template to get output schema + real title
    if (tc.name === 'execute_tool' && tc.args?.key) {
      this.ai.getTemplateDetails(tc.args.key).subscribe({
        next: (tpl: any) => {
          if (tpl) {
            this.selectedToolTemplate = tpl;
            this.selectedToolTitle = tpl.name || tpl.title || this.selectedToolTitle;
            this.cdr.detectChanges();
          }
        },
        error: () => {},
      });
    }
  }

  /** Process raw segments: merge text-before-tools into reasoning blocks, keep only final text as content */
  getProcessedSegments(): ProcessedSegment[] {
    const segs = this.msg.segments;
    if (!segs?.length) return [];
    if (this._processedCache.has(segs)) return this._processedCache.get(segs)!;

    const result: ProcessedSegment[] = [];
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.type === 'tools') {
        // Look back for preceding text segment → absorb as reasoning
        const prev = i > 0 ? segs[i - 1] : null;
        const reasoningText = (prev && prev.type === 'text') ? prev.content : undefined;
        result.push({ type: 'reasoning', reasoningText: reasoningText || undefined, toolCalls: seg.toolCalls });
      } else if (seg.type === 'text') {
        // Check if next is tools → skip, will be absorbed by next reasoning block
        const next = i < segs.length - 1 ? segs[i + 1] : null;
        if (next && next.type === 'tools') continue;
        // No tools after → this is final response text
        if (seg.content?.trim()) {
          result.push({ type: 'text', content: seg.content });
        }
      }
    }

    this._processedCache.set(segs, result);
    return result;
  }

  renderMarkdown(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      });
    } catch { return src; }
  }

  /** Group consecutive tools by category, preserving execution order */
  groupTools(toolCalls: AiToolCall[]): ToolGroup[] {
    if (this._groupCache.has(toolCalls)) return this._groupCache.get(toolCalls)!;

    const groups: ToolGroup[] = [];
    for (const tc of toolCalls) {
      const cat = TOOL_CATEGORIES[tc.name] || { category: 'Autre', icon: 'api', color: '#666' };
      const last = groups[groups.length - 1];
      if (last && last.category === cat.category) {
        last.tools.push(tc);
      } else {
        groups.push({ category: cat.category, icon: cat.icon, color: cat.color, tools: [tc] });
      }
    }

    this._groupCache.set(toolCalls, groups);
    return groups;
  }

  toolLabel(name: string): string {
    return TOOL_LABELS[name] || name;
  }

  toolExtra(tc: AiToolCall): string {
    if (!tc.args) return '';
    if (tc.name === 'execute_tool' && tc.args.key) return tc.args.key;
    if (tc.name === 'search_tools' && tc.args.query) return `"${tc.args.query}"`;
    if (tc.name === 'get_tool_details' && tc.args.key) return tc.args.key;
    if (tc.name === 'get_template_details' && tc.args.key) return tc.args.key;
    if (tc.name === 'add_node' && tc.args.templateKey) return tc.args.templateKey;
    if (tc.name === 'connect_nodes') return `${tc.args.sourceId?.slice(-8) || '?'} → ${tc.args.targetId?.slice(-8) || '?'}`;
    if (tc.name === 'get_templates' && tc.args.query) return `"${tc.args.query}"`;
    if (tc.name === 'set_node_args' && tc.args.nodeId) return tc.args.nodeId.slice(-8);
    return '';
  }

  truncateJson(val: any): string {
    try {
      const txt = JSON.stringify(val, null, 2);
      return txt.length > 800 ? txt.slice(0, 800) + '\n...' : txt;
    } catch { return String(val); }
  }
}
