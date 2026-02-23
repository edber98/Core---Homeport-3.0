import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiMessage, AiMessageSegment, AiToolCall, AiQuestionOption, AiService, AiAttachment } from './ai.service';
import { NodeExecResultDialogComponent } from '../flow/node-exec-result-dialog.component';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  enrich_context: 'Contexte', open_element: 'Ouverture', list_credentials: 'Lister les identifiants', open_credentials: 'Identifiants',
  save_project_memory: 'Mémoire projet', get_project_memory: 'Mémoire projet',
  compact_and_transfer: 'Transfert', activate_capsule: 'Activation outils',
  read_file: 'Lecture fichier', search_manual: 'Manuel', get_manual_section: 'Manuel',
  create_flow: 'Création flow', list_graph: 'Graphe',
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

/** Human-readable labels for meta-tool arguments (non-execute_tool tools) */
const META_TOOL_ARG_LABELS: Record<string, Record<string, string>> = {
  search_tools: { query: 'Recherche' },
  get_tool_details: { key: 'Clé du noeud' },
  list_credentials: { providerKey: 'Fournisseur' },
  search_workflows: { query: 'Recherche' },
  run_workflow: { flowId: 'Workflow', input: 'Données d\'entrée' },
  save_memory: { content: 'Contenu' },
  ask_user: { text: 'Question', questionType: 'Type', options: 'Options' },
  activate_capsule: { capsule: 'Capsule', reason: 'Raison' },
  search_manual: { query: 'Recherche' },
  get_manual_section: { sectionId: 'Section' },
  add_node: { templateKey: 'Template', positionAfter: 'Après le noeud' },
  connect_nodes: { sourceId: 'Source', targetId: 'Cible', sourceHandle: 'Sortie', targetHandle: 'Entrée' },
  disconnect_nodes: { sourceId: 'Source', targetId: 'Cible' },
  set_node_args: { nodeId: 'Noeud', args: 'Arguments' },
  set_node_description: { nodeId: 'Noeud', description: 'Description' },
  get_templates: { query: 'Recherche', providerKey: 'Fournisseur' },
  get_template_details: { key: 'Clé du template' },
  get_node_schema: { nodeId: 'Noeud' },
  get_node_info: { nodeId: 'Noeud' },
  remove_node: { nodeId: 'Noeud' },
  replace_node: { nodeId: 'Noeud', newTemplateKey: 'Nouveau template' },
  connect_by_output_name: { sourceId: 'Source', targetId: 'Cible', outputName: 'Nom de sortie' },
  set_form_schema: { schema: 'Schéma' },
  add_field: { sectionKey: 'Section', field: 'Champ' },
  update_field: { fieldKey: 'Champ', updates: 'Modifications' },
  remove_field: { fieldKey: 'Champ' },
  add_section: { section: 'Section' },
  update_section: { sectionKey: 'Section', updates: 'Modifications' },
  search_forms: { query: 'Recherche' },
  deploy_flow: { flowId: 'Workflow' },
  undeploy_flow: { flowId: 'Workflow' },
  start_run: { flowId: 'Workflow', input: 'Données d\'entrée' },
  open_element: { elementType: 'Type', elementId: 'Élément' },
  open_credentials: { providerKey: 'Fournisseur' },
  save_project_memory: { content: 'Contenu' },
  compact_and_transfer: { summary: 'Résumé' },
};

/** Processed segment for display — text-before-tools merged into reasoning blocks */
interface ProcessedSegment {
  type: 'text' | 'reasoning';
  content?: string;          // for text segments (final response)
  reasoningText?: string;    // for reasoning segments (text absorbed from preceding text)
  toolCalls?: AiToolCall[];  // for reasoning segments
}

@Component({
  selector: 'ai-message',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NodeExecResultDialogComponent],
  template: `
    <div class="ai-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
      <div class="avatar">
        <span *ngIf="msg.role === 'user'" nz-icon nzType="user" nzTheme="outline"></span>
        <span *ngIf="msg.role === 'assistant'" nz-icon nzType="robot" nzTheme="outline"></span>
      </div>

      <div class="body">
        <!-- User message attachments -->
        <div class="msg-attachments" *ngIf="msg.role === 'user' && msg.attachments?.length">
          <div class="msg-att-chip" *ngFor="let att of msg.attachments">
            <img *ngIf="isImage(att.mimeType) && att.fileId" [src]="ai.fileUrl(att.fileId)" class="msg-att-img"
                 loading="lazy" (click)="openImagePreview(att)" />
            <a *ngIf="!isImage(att.mimeType) && att.fileId" [href]="ai.fileUrl(att.fileId)" target="_blank" class="msg-att-file">
              <span nz-icon nzType="file" nzTheme="outline"></span>
              <span>{{ att.name }}</span>
              <span class="msg-att-size" *ngIf="att.size">{{ formatFileSize(att.size) }}</span>
            </a>
          </div>
        </div>

        <!-- Segments mode: reasoning blocks with text + tools, final text at end -->
        <ng-container *ngIf="msg.segments?.length; else flatLayout">
          <ng-container *ngFor="let ps of getProcessedSegments()">
            <!-- Final response text -->
            <div class="content" *ngIf="ps.type === 'text' && ps.content"
                 [innerHTML]="renderMarkdown(ps.content)"></div>
            <!-- Reasoning block: optional text + collapsible tool summary -->
            <div class="reasoning-block" *ngIf="ps.type === 'reasoning'">
              <div class="reasoning-header" *ngIf="ps.reasoningText">
                <span nz-icon nzType="bulb" nzTheme="outline"></span>
                <span>Raisonnement</span>
              </div>
              <div class="reasoning-text" *ngIf="ps.reasoningText" [innerHTML]="renderMarkdown(ps.reasoningText)"></div>
              <div class="tool-summary" *ngIf="ps.toolCalls?.length">
                <span class="summary-toggle" (click)="toggleToolExpand(ps)">
                  <span nz-icon [nzType]="expandedTools.has(ps) ? 'down' : 'right'" nzTheme="outline"></span>
                  {{ ps.toolCalls!.length }} outil{{ ps.toolCalls!.length > 1 ? 's' : '' }} exécuté{{ ps.toolCalls!.length > 1 ? 's' : '' }}
                </span>
                <div class="tool-list" *ngIf="expandedTools.has(ps)">
                  <div *ngFor="let tc of ps.toolCalls" class="tool-item-wrap">
                    <div class="tool-list-item"
                         [class.item-success]="tc.status !== 'error'"
                         [class.item-error]="tc.status === 'error'"
                         [class.item-expandable]="hasToolArgs(tc)">
                      <span nz-icon [nzType]="tc.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline"
                            style="cursor: pointer" (click)="openToolResult(tc)"></span>
                      <span style="cursor: pointer" (click)="openToolResult(tc)">{{ toolDisplayName(tc) }}</span>
                      <span class="item-dur" *ngIf="tc.duration">{{ tc.duration }}ms</span>
                      <span nz-icon *ngIf="hasToolArgs(tc)" class="item-chevron" style="cursor: pointer"
                            [nzType]="expandedToolItems.has(tc.id) ? 'down' : 'right'" nzTheme="outline"
                            (click)="toggleToolItemExpand(tc.id)"></span>
                    </div>
                    <div class="args-tree" *ngIf="expandedToolItems.has(tc.id) && hasToolArgs(tc)">
                      <div *ngFor="let field of getToolArgsFields(tc); trackBy: trackArgField" class="args-row">
                        <span class="args-label">{{ field.label }}</span>
                        <div class="args-value-wrap">
                          <span class="args-value"
                                [class.args-value-clamped]="!expandedArgValues.has(tc.id + ':' + field.key)"
                                #valRef>{{ formatArgValue(field.value) }}</span>
                          <span class="args-expand-toggle" *ngIf="valRef.scrollHeight > valRef.clientHeight || expandedArgValues.has(tc.id + ':' + field.key)"
                                (click)="toggleArgExpand(tc.id, field.key)">{{ expandedArgValues.has(tc.id + ':' + field.key) ? 'voir moins' : 'voir plus' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </ng-container>

        <!-- Flat layout: content + tools (for DB-loaded messages without segments) -->
        <ng-template #flatLayout>
          <div class="content" *ngIf="msg.content" [innerHTML]="renderMarkdown(msg.content)"></div>
          <div class="reasoning-block" *ngIf="msg.toolCalls?.length">
            <div class="tool-summary">
              <span class="summary-toggle" (click)="toggleToolExpand(msg)">
                <span nz-icon [nzType]="expandedTools.has(msg) ? 'down' : 'right'" nzTheme="outline"></span>
                {{ msg.toolCalls!.length }} outil{{ msg.toolCalls!.length > 1 ? 's' : '' }} exécuté{{ msg.toolCalls!.length > 1 ? 's' : '' }}
              </span>
              <div class="tool-list" *ngIf="expandedTools.has(msg)">
                <div *ngFor="let tc of msg.toolCalls" class="tool-item-wrap">
                  <div class="tool-list-item"
                       [class.item-success]="tc.status !== 'error'"
                       [class.item-error]="tc.status === 'error'"
                       [class.item-expandable]="hasToolArgs(tc)">
                    <span nz-icon [nzType]="tc.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline"
                          style="cursor: pointer" (click)="openToolResult(tc)"></span>
                    <span style="cursor: pointer" (click)="openToolResult(tc)">{{ toolDisplayName(tc) }}</span>
                    <span class="item-dur" *ngIf="tc.duration">{{ tc.duration }}ms</span>
                    <span nz-icon *ngIf="hasToolArgs(tc)" class="item-chevron" style="cursor: pointer"
                          [nzType]="expandedToolItems.has(tc.id) ? 'down' : 'right'" nzTheme="outline"
                          (click)="toggleToolItemExpand(tc.id)"></span>
                  </div>
                  <div class="args-tree" *ngIf="expandedToolItems.has(tc.id) && hasToolArgs(tc)">
                    <div *ngFor="let field of getToolArgsFields(tc); trackBy: trackArgField" class="args-row">
                      <span class="args-label">{{ field.label }}</span>
                      <span class="args-value">{{ formatArgValue(field.value) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ng-template>

        <!-- Answered question display (only when answered — otherwise ai-question handles it) -->
        <div class="answered-question" *ngIf="msg.question && msg.role === 'assistant' && isQuestionAnswered()">
          <!-- Single question -->
          <ng-container *ngIf="msg.question.questionType !== 'batch'">
            <div class="aq-text">{{ msg.question.text }}</div>
            <div class="aq-options" *ngIf="msg.question.options?.length">
              <span class="aq-chip"
                *ngFor="let opt of msg.question.options"
                [class.selected]="isAnsweredOption(opt)">
                <span nz-icon *ngIf="isAnsweredOption(opt)" nzType="check" nzTheme="outline" class="aq-check"></span>
                {{ opt.label }}
              </span>
            </div>
          </ng-container>

          <!-- Batch questions (QCM) -->
          <ng-container *ngIf="msg.question.questionType === 'batch' && msg.question.questions?.length">
            <div class="aq-text">{{ msg.question.text }}</div>
            <div class="aq-batch" *ngFor="let q of msg.question.questions">
              <div class="aq-sub-text">{{ q.text }}</div>
              <div class="aq-options" *ngIf="q.options?.length">
                <span class="aq-chip"
                  *ngFor="let opt of q.options"
                  [class.selected]="isBatchAnsweredOption(q.id, opt)">
                  <span nz-icon *ngIf="isBatchAnsweredOption(q.id, opt)" nzType="check" nzTheme="outline" class="aq-check"></span>
                  {{ opt.label }}
                </span>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Cancelled response -->
        <div class="cancelled-banner" *ngIf="msg.cancelled">
          <nz-tag class="cancelled-tag">
            <span nz-icon nzType="stop" nzTheme="outline"></span> Réponse annulée
          </nz-tag>
          <button nz-button nzType="text" nzSize="small" (click)="retryClick.emit()" class="retry-btn">
            <span nz-icon nzType="redo" nzTheme="outline"></span> Réessayer
          </button>
        </div>

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
    .content ::ng-deep img { max-width: 100%; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; }
    .content ::ng-deep img:hover { opacity: 0.85; }
    .content ::ng-deep table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 13px; display: block; overflow-x: auto; max-width: 100%; }
    .content ::ng-deep th, .content ::ng-deep td { border: 1px solid #e8e8e8; padding: 6px 10px; text-align: left; white-space: nowrap; }
    .content ::ng-deep th { background: #fafafa; font-weight: 600; font-size: 12px; }
    .content ::ng-deep tr:nth-child(even) { background: #fafafa; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; opacity: 0.85; max-width: 85%; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-text { font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 6px; word-break: break-word; }
    .reasoning-text ::ng-deep p { margin: 0 0 4px; }
    .reasoning-text ::ng-deep p:last-child { margin: 0; }
    .reasoning-text ::ng-deep code { background: #e8e8e8; padding: 1px 3px; border-radius: 2px; font-size: 11px; }
    .reasoning-text ::ng-deep ul, .reasoning-text ::ng-deep ol { margin: 2px 0; padding-left: 18px; }
    .reasoning-text ::ng-deep li { margin: 1px 0; }
    .tool-summary { margin-top: 4px; }
    .summary-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #999; cursor: pointer; transition: color 0.2s; }
    .summary-toggle:hover { color: #666; }
    .tool-list { margin-top: 4px; }
    .tool-list-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; color: #666; }
    .item-success span[nz-icon] { color: #52c41a; }
    .item-error span[nz-icon] { color: #ff4d4f; }
    .item-error { color: #ff4d4f; }
    .item-dur { color: #bbb; font-size: 10px; margin-left: auto; }
    .tool-item-wrap { }
    .item-expandable { cursor: default; }
    .item-chevron { font-size: 10px; color: #bbb; margin-left: 4px; cursor: pointer; transition: color 0.2s; }
    .item-chevron:hover { color: #666; }
    .args-tree { padding: 4px 0 4px 22px; border-left: 2px solid #e8e8e8; margin-left: 7px; }
    .args-row { display: flex; gap: 8px; font-size: 11px; padding: 1px 0; line-height: 1.5; }
    .args-label { color: #999; font-weight: 500; min-width: 80px; flex-shrink: 0; white-space: nowrap; }
    .args-value-wrap { min-width: 0; flex: 1; }
    .args-value { color: #333; word-break: break-word; white-space: pre-wrap; display: block; }
    .args-value-clamped { max-height: calc(4 * 1.5em); overflow: hidden; }
    .args-expand-toggle { display: inline-block; font-size: 10px; color: #1677ff; cursor: pointer; margin-top: 1px; }
    .args-expand-toggle:hover { text-decoration: underline; }
    .answered-question { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; margin: 4px 0; max-width: 85%; }
    .aq-text { font-size: 12px; color: #666; margin-bottom: 6px; }
    .aq-options { display: flex; flex-wrap: wrap; gap: 4px; }
    .aq-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; padding: 2px 10px; border-radius: 12px; background: #f0f0f0; color: #999; }
    .aq-chip.selected { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; font-weight: 500; }
    .aq-check { font-size: 10px; }
    .aq-batch { margin: 6px 0; }
    .aq-sub-text { font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500; }
    .cancelled-banner { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .cancelled-tag { color: #ff4d4f; border: 1px solid #ff4d4f; background: transparent; margin: 0; }
    .retry-btn { color: #666; font-size: 12px; }
    .retry-btn:hover { color: #1677ff; }
    .msg-attachments { display: flex; flex-wrap: wrap; gap: 6px; max-width: 85%; }
    .msg-att-chip { display: inline-flex; }
    .msg-att-img { max-width: 200px; max-height: 150px; border-radius: 8px; cursor: pointer; object-fit: cover; border: 1px solid #e8e8e8; transition: opacity 0.2s; }
    .msg-att-img:hover { opacity: 0.85; }
    .msg-att-file { display: inline-flex; align-items: center; gap: 4px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #333; text-decoration: none; transition: border-color 0.2s; }
    .msg-att-file:hover { border-color: #1677ff; color: #1677ff; }
    .msg-att-size { color: #999; font-size: 10px; }
    .tool-files { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .tool-file-img { max-width: 200px; max-height: 150px; border-radius: 6px; object-fit: cover; border: 1px solid #e8e8e8; }
    .tool-file-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #1677ff; }
  `]
})
export class AiMessageComponent {
  @Input() msg!: AiMessage;
  @Output() retryClick = new EventEmitter<void>();
  public ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);

  /** Intercept clicks on <img> inside .content (markdown-rendered images) to open lightbox */
  @HostListener('click', ['$event'])
  onHostClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && target.closest('.content')) {
      e.preventDefault();
      e.stopPropagation();
      const src = (target as HTMLImageElement).src;
      if (src) this.openImageUrl(src);
    }
  }

  // Tool result dialog state
  selectedToolResult: AiToolCall | null = null;
  selectedToolAttempts: any[] = [];
  selectedToolTitle = '';
  selectedToolTemplate: any = null;

  expandedTools = new Set<any>();
  expandedToolItems = new Set<string>();
  expandedArgValues = new Set<string>();
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
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'loading', 'width', 'height'],
      });
    } catch { return src; }
  }

  toolDisplayName(tc: AiToolCall): string {
    if (tc.displayTitle) return tc.displayTitle;
    if (tc.name === 'execute_tool' && tc.args?.key) return tc.args.key;
    const label = this.toolLabel(tc.name);
    const extra = this.toolExtra(tc);
    return extra ? `${label} — ${extra}` : label;
  }

  toggleToolExpand(item: any) {
    if (this.expandedTools.has(item)) this.expandedTools.delete(item);
    else this.expandedTools.add(item);
  }

  toggleToolItemExpand(id: string) {
    if (this.expandedToolItems.has(id)) this.expandedToolItems.delete(id);
    else this.expandedToolItems.add(id);
  }

  toggleArgExpand(toolId: string, fieldKey: string) {
    const k = `${toolId}:${fieldKey}`;
    if (this.expandedArgValues.has(k)) this.expandedArgValues.delete(k);
    else this.expandedArgValues.add(k);
  }

  hasToolArgs(tc: AiToolCall): boolean {
    return this.getToolArgsFields(tc).length > 0;
  }

  getToolArgsFields(tc: AiToolCall): { key: string; label: string; value: any }[] {
    if (!tc.args || typeof tc.args !== 'object') return [];
    let data = tc.args;
    if (tc.name === 'execute_tool' && tc.args.args && typeof tc.args.args === 'object') {
      data = tc.args.args;
    }
    const labelMap = new Map<string, string>();
    // Priority 1: argsSchema from NodeTemplate (execute_tool)
    if (tc.argsSchema) {
      for (const f of tc.argsSchema) labelMap.set(f.key, f.label);
    }
    // Priority 2: static meta-tool labels
    const metaLabels = META_TOOL_ARG_LABELS[tc.name];
    if (metaLabels) {
      for (const [k, label] of Object.entries(metaLabels)) {
        if (!labelMap.has(k)) labelMap.set(k, label);
      }
    }
    return Object.entries(data)
      .filter(([key]) => key !== 'key' && key !== 'credential_id')
      .map(([key, value]) => ({ key, label: labelMap.get(key) || key, value }));
  }

  trackArgField(_i: number, f: { key: string }): string { return f.key; }

  formatArgValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
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

  /** Check if this question has been answered (a user message follows this assistant message) */
  isQuestionAnswered(): boolean {
    const msgs = this.ai.messages();
    const idx = msgs.indexOf(this.msg);
    if (idx < 0) return false;
    for (let i = idx + 1; i < msgs.length; i++) {
      if (msgs[i].role === 'user') return true;
      break;
    }
    return false;
  }

  /** Check if a batch question option was selected (look at next user message batchAnswers) */
  isBatchAnsweredOption(qId: string, opt: AiQuestionOption): boolean {
    const msgs = this.ai.messages();
    const idx = msgs.indexOf(this.msg);
    if (idx < 0) return false;
    for (let i = idx + 1; i < msgs.length; i++) {
      if (msgs[i].role === 'user') {
        const ans = msgs[i].answer;
        if (ans?.value?.batchAnswers) {
          const val = ans.value.batchAnswers[qId];
          if (val === opt.value) return true;
          if (Array.isArray(val) && val.includes(opt.value)) return true;
        }
        break;
      }
    }
    return false;
  }

  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') || false;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  openImagePreview(att: any) {
    this.openImageUrl(this.ai.fileUrl(att.fileId));
  }

  openImageUrl(url: string) {
    if (!url) return;
    this.closeLightbox();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;animation:aiFadeIn .15s ease';
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.8)" data-ai-close></div>
      <div style="position:relative;max-width:92vw;max-height:92vh;display:flex;align-items:center;justify-content:center">
        <img src="${url}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);background:#fff" />
        <div style="position:absolute;top:-44px;right:0;display:flex;gap:8px">
          <a href="${url}" target="_blank" download style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px;cursor:pointer;border:none" title="Télécharger"><i class="fa-solid fa-download"></i></a>
          <button style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;border:none" data-ai-close title="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
    if (!document.getElementById('ai-lightbox-style')) {
      const s = document.createElement('style');
      s.id = 'ai-lightbox-style';
      s.textContent = '@keyframes aiFadeIn{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(s);
    }
    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-ai-close]')) this.closeLightbox();
    });
    this._onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.closeLightbox(); };
    document.addEventListener('keydown', this._onEsc);
    document.body.appendChild(overlay);
    this._lightboxEl = overlay;
  }

  private _lightboxEl: HTMLElement | null = null;
  private _onEsc: ((e: KeyboardEvent) => void) | null = null;

  closeLightbox() {
    if (this._lightboxEl) { this._lightboxEl.remove(); this._lightboxEl = null; }
    if (this._onEsc) { document.removeEventListener('keydown', this._onEsc); this._onEsc = null; }
  }

  /** Check if an option was the answer selected by the user (look at next user message) */
  isAnsweredOption(opt: AiQuestionOption): boolean {
    const msgs = this.ai.messages();
    const idx = msgs.indexOf(this.msg);
    if (idx < 0) return false;
    // Find next user message after this assistant message
    for (let i = idx + 1; i < msgs.length; i++) {
      if (msgs[i].role === 'user') {
        const ans = msgs[i].answer;
        if (ans?.value) {
          // Single choice: value.value or value.label
          if (ans.value.value === opt.value || ans.value.label === opt.label) return true;
          // Multi choice: value.values array
          if (ans.value.values?.includes(opt.value)) return true;
        }
        break;
      }
    }
    return false;
  }

}
