import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AiMessage, AiMessageSegment, AiToolCall, AiQuestionOption, AiService, AiAttachment } from './ai.service';
import { NodeExecResultDialogComponent } from '../flow/node-exec-result-dialog.component';
import { AiPermissionRequestCardComponent } from './permissions/ai-permission-request-card.component';
import { AiCacheSyncRequestCardComponent } from './permissions/ai-cache-sync-request-card.component';
import { AiPlanProposalCardComponent } from './plan/ai-plan-proposal-card.component';
import { AiDiagramRendererComponent } from './diagram/ai-diagram-renderer.component';
import { AiStructuredMessageComponent } from './structured/ai-structured-message.component';
import { AiInlineImageComponent } from './images/ai-inline-image.component';
import { AiAgentReportCardComponent } from './agent-reports/ai-agent-report-card.component';
import { AiWidgetActionsComponent, WidgetAction, WidgetActionId } from './widgets/ai-widget-actions.component';
import { AiWidgetModalComponent, WidgetType, WidgetModalData } from './widgets/ai-widget-modal.component';
import { WidgetExportService } from './widgets/widget-export.service';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  project_list_dir: 'Liste dossier projet', project_tree: 'Arborescence projet',
  project_read_file: 'Lecture fichier projet', project_read_batch: 'Lecture multiple',
  project_grep: 'Recherche texte', project_search: 'Recherche fichiers',
  project_write_file: 'Écriture fichier', project_create_folder: 'Création dossier',
  project_delete: 'Suppression fichier', project_move: 'Déplacement fichier',
  project_refresh_tree: 'Actualisation arbo', project_sync_remote: 'Synchronisation distant',
  web_search: 'Recherche web', web_fetch: 'Lecture page web', research_deep: 'Recherche approfondie', web_download: 'Téléchargement web',
  execute_code: 'Exécution code', prepare_code_environment: 'Préparation environnement',
  spawn_subagent: 'Sous-agent',
  install_package: 'Installation package', display_image: 'Affichage image',
  skill_list: 'Liste skills', skill_get: 'Détails skill', skill_execute: 'Exécution skill',
  generate_document: 'Génération document', edit_document: 'Édition document',
  render_html_preview: 'Aperçu HTML', build_website: 'Construction site',
  enrich_context: 'Contexte', open_element: 'Ouverture', list_credentials: 'Lister les identifiants', open_credentials: 'Identifiants',
  save_project_memory: 'Mémoire projet', get_project_memory: 'Mémoire projet',
  set_project_knowledge: 'Mise à jour mémoire projet', get_project_knowledge: 'Mémoire projet',
  compact_and_transfer: 'Transfert', activate_capsule: 'Activation outils',
  propose_plan: 'Plan d\'action', generate_diagram: 'Diagramme',
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
  render_structured: 'Affichage structuré',
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
  propose_plan: { summary: 'Résumé', steps: 'Étapes', risks: 'Risques' },
  generate_diagram: { type: 'Type', title: 'Titre', mermaid: 'Code' },
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
  imports: [CommonModule, NzButtonModule, NzIconModule, NzTagModule, NodeExecResultDialogComponent, AiPermissionRequestCardComponent, AiCacheSyncRequestCardComponent, AiStructuredMessageComponent, AiPlanProposalCardComponent, AiDiagramRendererComponent, AiInlineImageComponent, AiWidgetActionsComponent, AiAgentReportCardComponent],
  template: `
    <div class="ai-msg" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'" [class.compact]="compact">
      <div class="avatar" *ngIf="!compact">
        <span *ngIf="msg.role === 'user'" nz-icon nzType="user" nzTheme="outline"></span>
        <span *ngIf="msg.role === 'assistant'" nz-icon nzType="robot" nzTheme="outline"></span>
      </div>
      <div class="avatar avatar-spacer" *ngIf="compact" aria-hidden="true"></div>

      <div class="body" [attr.data-kind]="msg.metadata?.kind || null" [attr.data-job-id]="msg.metadata?.jobId || null">
        <!-- V2 special message kinds -->
        <ng-container [ngSwitch]="msg.metadata?.kind">
          <ai-permission-request-card
            *ngSwitchCase="'permission_request'"
            [request]="msg.metadata!.permissionRequest!"
            (answered)="onPermissionAnswer($event)">
          </ai-permission-request-card>
          <ai-cache-sync-request-card
            *ngSwitchCase="'cache_sync_request'"
            [request]="msg.metadata!.cacheSyncRequest!"
            (answered)="onCacheSyncAnswer($event)">
          </ai-cache-sync-request-card>
          <div *ngSwitchCase="'structured'" class="widget-bubble widget-wrap">
            <ai-structured-message [data]="msg.metadata!.structured!"></ai-structured-message>
            <div class="widget-overlay">
              <ai-widget-actions
                [actions]="structuredActions"
                (action)="onWidgetAction($event, 'structured', msg.metadata!.structured)">
              </ai-widget-actions>
            </div>
          </div>
          <div *ngSwitchCase="'plan_proposal'" class="widget-bubble widget-wrap">
            <ai-plan-proposal-card
              [proposal]="msg.metadata!.planProposal!"
              (answered)="onPlanAnswer($event)">
            </ai-plan-proposal-card>
            <div class="widget-overlay">
              <ai-widget-actions
                [actions]="planActions"
                (action)="onWidgetAction($event, 'plan_proposal', msg.metadata!.planProposal)">
              </ai-widget-actions>
            </div>
          </div>
          <div *ngSwitchCase="'diagram'" class="diagram-bubble widget-bubble widget-wrap">
            <div class="diagram-bubble-head">
              <span nz-icon nzType="deployment-unit" nzTheme="outline" class="diagram-bubble-icon"></span>
              <span class="diagram-bubble-title">{{ msg.metadata?.diagram?.title || 'Diagramme' }}</span>
              <nz-tag nzColor="magenta" class="diagram-bubble-type">{{ msg.metadata?.diagram?.type }}</nz-tag>
            </div>
            <ai-diagram-renderer
              [mermaid]="msg.metadata?.diagram?.mermaid || ''"
              [title]="msg.metadata?.diagram?.title || ''"
              [interactive]="false">
            </ai-diagram-renderer>
            <button nz-button nzSize="small" nzType="link" class="diagram-open-canvas" (click)="openDiagramInCanvas()">
              <span nz-icon nzType="fullscreen" nzTheme="outline"></span> Ouvrir dans canvas
            </button>
            <div class="widget-overlay">
              <ai-widget-actions
                [actions]="diagramActions"
                (action)="onWidgetAction($event, 'diagram', msg.metadata!.diagram)">
              </ai-widget-actions>
            </div>
          </div>
          <div *ngSwitchCase="'image_inline'" class="widget-bubble image-inline-wrap">
            <ai-inline-image [data]="msg.metadata!.imageInline!"></ai-inline-image>
          </div>
          <div *ngSwitchCase="'agent_report'" class="widget-bubble widget-wrap">
            <ai-agent-report-card [report]="msg.metadata!.agentReport!"></ai-agent-report-card>
          </div>
          <div *ngSwitchCase="'system_hint'" class="system-hint">
            <span nz-icon nzType="bulb" nzTheme="outline" class="system-hint-icon"></span>
            <div class="system-hint-content">
              <div class="system-hint-text">{{ msg.content }}</div>
              <button *ngIf="isMemoryPendingHint(msg)" nz-button nzType="link" nzSize="small" (click)="openKnowledgePending()">
                Voir les suggestions
                <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
              </button>
            </div>
          </div>
          <div *ngSwitchCase="'comment'" class="comment-msg">
            <nz-tag nzColor="purple">
              <span nz-icon nzType="comment" nzTheme="outline"></span> Commentaire
            </nz-tag>
            <div class="comment-content" [innerHTML]="renderMarkdown(msg.content)"></div>
          </div>
        </ng-container>

        <!-- User message attachments -->
        <div class="msg-attachments" *ngIf="msg.role === 'user' && msg.attachments?.length && !msg.metadata?.kind">
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

        <!-- Standard rendering (skipped for special metadata kinds) -->
        <ng-container *ngIf="!msg.metadata?.kind">
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
        </ng-container>

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
    .ai-msg.user .content { background: #fdf2f8; border-radius: 14px 14px 2px 14px; padding: 10px 16px; }
    .ai-msg.assistant .content { background: #ebebeb; border-radius: 14px 14px 14px 2px; padding: 10px 16px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .ai-msg.assistant .avatar { background: #fdf2f8; color: #e61982; }
    .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .content { max-width: 85%; min-width: 0; overflow: hidden; word-break: break-word; line-height: 1.5; }
    .content :host ::ng-deep p { margin: 0 0 4px; }
    .content :host ::ng-deep p:last-child { margin: 0; }
    .content :host ::ng-deep code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .content :host ::ng-deep pre { background: #f0f0f0; padding: 8px; border-radius: 6px; max-width: 100%; overflow-x: auto; }
    .content ::ng-deep img { max-width: 100%; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; }
    .content ::ng-deep img:hover { opacity: 0.85; }
    .content ::ng-deep .md-table-wrap {
      margin: 8px 0;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .content ::ng-deep .md-table-wrap > table {
      border-collapse: collapse;
      width: max-content;
      min-width: 100%;
      margin: 0;
      font-size: 13px;
    }
    .content ::ng-deep table { border-collapse: collapse; width: max-content; min-width: 100%; margin: 8px 0; font-size: 13px; }
    .content ::ng-deep th, .content ::ng-deep td { border: 1px solid #e8e8e8; padding: 6px 10px; text-align: left; white-space: nowrap; }
    .content ::ng-deep th { background: #fafafa; font-weight: 600; font-size: 12px; }
    .content ::ng-deep tr:nth-child(even) { background: #fafafa; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; opacity: 0.85; max-width: 85%; min-width: 0; overflow: hidden; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-text { font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 6px; word-break: break-word; overflow: hidden; }
    .reasoning-text ::ng-deep p { margin: 0 0 4px; }
    .reasoning-text ::ng-deep p:last-child { margin: 0; }
    .reasoning-text ::ng-deep code { background: #e8e8e8; padding: 1px 3px; border-radius: 2px; font-size: 11px; }
    .reasoning-text ::ng-deep pre { max-width: 100%; overflow-x: auto; }
    .reasoning-text ::ng-deep .md-table-wrap {
      margin: 8px 0;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .reasoning-text ::ng-deep .md-table-wrap > table {
      width: max-content;
      min-width: 100%;
      margin: 0;
    }
    .reasoning-text ::ng-deep table { width: max-content; min-width: 100%; }
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
    .args-expand-toggle { display: inline-block; font-size: 10px; color: #e61982; cursor: pointer; margin-top: 1px; }
    .args-expand-toggle:hover { text-decoration: underline; }
    .answered-question { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; margin: 4px 0; max-width: 85%; }
    .aq-text { font-size: 12px; color: #666; margin-bottom: 6px; }
    .aq-options { display: flex; flex-wrap: wrap; gap: 4px; }
    .aq-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; padding: 2px 10px; border-radius: 12px; background: #f0f0f0; color: #999; }
    .aq-chip.selected { background: #e6f4ff; color: #e61982; border: 1px solid #91caff; font-weight: 500; }
    .aq-check { font-size: 10px; }
    .aq-batch { margin: 6px 0; }
    .aq-sub-text { font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500; }
    .cancelled-banner { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .cancelled-tag { color: #ff4d4f; border: 1px solid #ff4d4f; background: transparent; margin: 0; }
    .retry-btn { color: #666; font-size: 12px; }
    .retry-btn:hover { color: #e61982; }
    .msg-attachments { display: flex; flex-wrap: wrap; gap: 6px; max-width: 85%; }
    .msg-att-chip { display: inline-flex; }
    .msg-att-img { max-width: 200px; max-height: 150px; border-radius: 8px; cursor: pointer; object-fit: cover; border: 1px solid #e8e8e8; transition: opacity 0.2s; }
    .msg-att-img:hover { opacity: 0.85; }
    .msg-att-file { display: inline-flex; align-items: center; gap: 4px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #333; text-decoration: none; transition: border-color 0.2s; }
    .msg-att-file:hover { border-color: #e61982; color: #e61982; }
    .msg-att-size { color: #999; font-size: 10px; }
    .comment-msg { background: #faf5ff; border-left: 3px solid #722ed1; border-radius: 0 8px 8px 0; padding: 8px 12px; margin: 4px 0; max-width: 85%; }
    .comment-msg .comment-content { margin-top: 4px; font-size: 13px; color: #333; line-height: 1.5; }
    .comment-msg nz-tag { margin-bottom: 4px; }
    .system-hint {
      display: flex; align-items: flex-start; gap: 10px;
      background: #fffbe6; border: 1px solid #ffe58f; border-radius: 10px;
      padding: 10px 14px; margin: 6px 0; max-width: 90%;
      font-size: 13px; color: #614700;
    }
    .system-hint-icon { color: #faad14; font-size: 18px; flex-shrink: 0; margin-top: 2px; }
    .system-hint-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .system-hint-text { line-height: 1.5; }
    .system-hint .ant-btn-link { padding: 0; height: auto; font-size: 12px; color: #d48806; align-self: flex-start; }
    .system-hint .ant-btn-link:hover { color: #faad14; }
    .tool-files { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .tool-file-img { max-width: 200px; max-height: 150px; border-radius: 6px; object-fit: cover; border: 1px solid #e8e8e8; }
    .tool-file-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #e61982; }
    /* Wrapper unifié pour TOUS les widgets assistant — même max-width que les messages texte */
    .widget-bubble { max-width: min(720px, 85%); min-width: 0; display: block; margin: 4px 0; }
    @media (max-width: 640px) { .widget-bubble { max-width: 100%; } }
    .widget-bubble :host ::ng-deep > * { max-width: 100%; }
    .diagram-bubble { background: #fff; border: 1px solid #f0f0f0; border-left: 3px solid #e61982; border-radius: 0 8px 8px 0; padding: 8px 10px; }
    .diagram-bubble-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .diagram-bubble-icon { color: #e61982; font-size: 16px; }
    .diagram-bubble-title { font-weight: 600; font-size: 13px; color: #262626; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 32px; }
    .diagram-bubble-type { margin: 0; font-size: 10px; }
    .diagram-open-canvas { padding: 0; margin-top: 4px; font-size: 12px; }
    /* Widget action menu overlay (top-right) */
    .widget-wrap { position: relative; }
    .widget-wrap .widget-overlay {
      position: absolute; top: 8px; right: 8px; z-index: 10;
      display: flex; gap: 4px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 6px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      opacity: 0.85; transition: opacity 0.15s, box-shadow 0.15s;
    }
    .widget-wrap:hover .widget-overlay { opacity: 1; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }
    .image-inline-wrap { display: inline-block; }
    /* Compact mode — used when message is grouped with previous assistant message */
    .ai-msg.compact { padding-top: 0; padding-bottom: 2px; }
    .ai-msg.compact .avatar.avatar-spacer { background: transparent; }
  `]
})
export class AiMessageComponent {
  @Input() msg!: AiMessage;
  @Input() compact = false;
  @Output() retryClick = new EventEmitter<void>();
  public ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);
  private modal = inject(NzModalService);
  private msgSvc = inject(NzMessageService);
  private widgetExp = inject(WidgetExportService);

  // Widget action presets (same list used inline + in the modal)
  readonly structuredActions: WidgetAction[] = [
    { id: 'fullscreen', label: 'Ouvrir en grand', icon: 'fullscreen' },
    { id: 'copy', label: 'Copier les données', icon: 'copy' },
    { id: 'export:json', label: 'Télécharger JSON', icon: 'code' },
    { id: 'export:csv', label: 'Télécharger CSV', icon: 'file-text' },
    { id: 'export:xlsx', label: 'Télécharger Excel', icon: 'file-excel' },
    { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
  ];
  readonly planActions: WidgetAction[] = [
    { id: 'fullscreen', label: 'Ouvrir en grand', icon: 'fullscreen' },
    { id: 'copy', label: 'Copier les données', icon: 'copy' },
    { id: 'export:json', label: 'Télécharger JSON', icon: 'code' },
    { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
  ];
  readonly diagramActions: WidgetAction[] = [
    { id: 'fullscreen', label: 'Ouvrir en grand', icon: 'fullscreen' },
    { id: 'copy', label: 'Copier le code', icon: 'copy' },
    { id: 'export:svg', label: 'Télécharger SVG', icon: 'file-image' },
    { id: 'export:png', label: 'Télécharger PNG', icon: 'picture' },
    { id: 'export:pdf', label: 'Télécharger PDF', icon: 'file-pdf' },
  ];

  // ── System hint helpers (ex: memory_pending) ──
  isMemoryPendingHint(msg: AiMessage): boolean {
    return msg?.metadata?.['kind'] === 'system_hint'
      && msg?.metadata?.['extra']?.hintType === 'memory_pending';
  }

  openKnowledgePending(): void {
    this.ai.openKnowledgePending$.next();
  }

  async onWidgetAction(id: WidgetActionId, widgetType: WidgetType, widgetData: any): Promise<void> {
    if (!widgetData) return;
    if (id === 'fullscreen') {
      this.openWidgetModal(widgetType, widgetData);
      return;
    }
    const baseName = this.widgetFilename(widgetType, widgetData);
    try {
      switch (id) {
        case 'copy': {
          const payload = widgetType === 'diagram' ? (widgetData?.mermaid || '') : JSON.stringify(widgetData, null, 2);
          const ok = await this.widgetExp.copyText(payload);
          this.msgSvc[ok ? 'success' : 'error'](ok ? 'Copié' : 'Copie impossible');
          return;
        }
        case 'export:json': this.widgetExp.exportAsJson(widgetData, baseName); return;
        case 'export:csv': {
          const { rows, cols } = this.extractTable(widgetType, widgetData);
          if (!rows.length) { this.msgSvc.warning('Aucune ligne exportable'); return; }
          this.widgetExp.exportAsCsv(rows, cols, baseName);
          return;
        }
        case 'export:xlsx': {
          const { rows, cols } = this.extractTable(widgetType, widgetData);
          if (!rows.length) { this.msgSvc.warning('Aucune ligne exportable'); return; }
          await this.widgetExp.exportAsXlsx(rows, cols, baseName);
          return;
        }
        case 'export:svg':
        case 'export:png':
        case 'export:pdf': {
          // For SVG/PNG/PDF, need DOM — open the modal to guarantee a rendered widget then export it
          this.openWidgetModal(widgetType, widgetData, id);
          return;
        }
      }
    } catch (e: any) {
      this.msgSvc.error('Export échoué: ' + (e?.message || 'erreur'));
    }
  }

  private openWidgetModal(widgetType: WidgetType, widgetData: any, deferredAction?: WidgetActionId) {
    const title = widgetData?.title || widgetData?.summary || undefined;
    const ref = this.modal.create<AiWidgetModalComponent, WidgetModalData>({
      nzContent: AiWidgetModalComponent,
      nzData: { widgetType, widgetData, title },
      nzWidth: '90vw',
      nzFooter: null,
      nzMaskClosable: true,
      nzCloseIcon: undefined,
      nzClosable: false,
      nzBodyStyle: { padding: '16px 20px' },
      nzClassName: 'ai-widget-modal-shell',
    });
    if (deferredAction) {
      // Wait a tick for render then trigger the action on modal
      ref.afterOpen.subscribe(() => {
        const instance = ref.getContentComponent();
        setTimeout(() => instance?.onAction(deferredAction), 200);
      });
    }
  }

  private widgetFilename(t: WidgetType, data: any): string {
    const raw = data?.title || data?.summary || t;
    return String(raw).slice(0, 60) || t;
  }

  private extractTable(t: WidgetType, wd: any): { rows: any[]; cols: { key: string; label?: string }[] } {
    if (t === 'structured') {
      const data = wd?.data;
      if (wd?.layout === 'comparison_table' && data?.columns && data?.rows) {
        return {
          rows: data.rows,
          cols: (data.columns || []).map((c: any) => ({
            key: c.key || c.id || c.label, label: c.label || c.key || c.id,
          })),
        };
      }
      if (Array.isArray(data?.rows)) return { rows: data.rows, cols: [] };
      if (Array.isArray(data?.items)) return { rows: data.items, cols: [] };
      if (Array.isArray(data)) return { rows: data, cols: [] };
    }
    if (t === 'plan_proposal') {
      const steps = (wd?.steps || []).map((s: any) => ({
        id: s.id, title: s.title, rationale: s.rationale || '',
        tools: (s.tools || []).join(', '),
        duration_estimate: s.duration_estimate || '',
        dependsOn: (s.dependsOn || []).join(', '),
      }));
      return {
        rows: steps,
        cols: [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Titre' },
          { key: 'rationale', label: 'Raison' },
          { key: 'tools', label: 'Outils' },
          { key: 'duration_estimate', label: 'Durée' },
          { key: 'dependsOn', label: 'Dépend de' },
        ],
      };
    }
    return { rows: [], cols: [] };
  }

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

  /** V2 — handle permission card response */
  onPermissionAnswer(evt: { decision: string; pathPattern?: string }) {
    const req = this.msg.metadata?.permissionRequest;
    const jobId = (this.msg.metadata as any)?.jobId;
    if (!req || !jobId) return;
    this.ai.respondToPermission(jobId, req.requestId, evt.decision, evt.pathPattern).subscribe({
      next: () => {
        // Optimistic local update
        if (this.msg.metadata?.permissionRequest) {
          this.msg.metadata.permissionRequest.answer = evt.decision;
          this.msg.metadata.permissionRequest.answeredAt = new Date().toISOString();
        }
        this.cdr.markForCheck();
      },
    });
  }

  /** V2 — handle plan proposal card response */
  onPlanAnswer(evt: { decision: 'approve' | 'reject' | 'modify'; approvedSteps?: string[]; modifiedSteps?: any[]; missingInfoAnswers?: Record<string, string> }) {
    const prop = this.msg.metadata?.planProposal;
    const threadId = this.msg.threadId;
    if (!prop || !threadId) return;
    this.ai.respondToPlan(
      threadId,
      prop.requestId,
      evt.decision,
      evt.approvedSteps,
      evt.modifiedSteps as any,
      evt.missingInfoAnswers,
    ).subscribe({
      next: () => {
        if (this.msg.metadata?.planProposal) {
          this.msg.metadata.planProposal.answer = evt.decision;
          this.msg.metadata.planProposal.answeredAt = new Date().toISOString();
          if (evt.approvedSteps) this.msg.metadata.planProposal.approvedSteps = evt.approvedSteps;
          if (evt.modifiedSteps) this.msg.metadata.planProposal.modifiedSteps = evt.modifiedSteps as any;
          if (evt.missingInfoAnswers) this.msg.metadata.planProposal.missingInfoAnswers = evt.missingInfoAnswers;
        }
        this.cdr.markForCheck();
      },
    });
  }

  /** Open current diagram in the canvas panel (reuses canvas.document state) */
  openDiagramInCanvas() {
    const d = this.msg.metadata?.diagram;
    if (!d) return;
    // Push current diagram into canvas state so the canvas document renders it
    const cur = this.ai.canvasState() || { threadId: this.msg.threadId || '', activeTab: 'document' as const };
    this.ai.canvasState.set({
      ...cur,
      activeTab: 'document',
      document: {
        ...(cur.document || {}),
        format: 'mermaid' as any,
        title: d.title || 'Diagramme',
        rawMermaid: d.mermaid,
        updatedAt: new Date().toISOString(),
      },
    });
    this.ai.canvasOpen.set(true);
  }

  /** V2 — handle cache sync card response */
  onCacheSyncAnswer(evt: { decision: string }) {
    const req = this.msg.metadata?.cacheSyncRequest;
    const jobId = (this.msg.metadata as any)?.jobId;
    const requestId = (this.msg.metadata as any)?.requestId;
    if (!req || !jobId || !requestId) return;
    this.ai.respondToCacheSync(jobId, requestId, evt.decision).subscribe({
      next: () => {
        if (this.msg.metadata?.cacheSyncRequest) {
          this.msg.metadata.cacheSyncRequest.answer = evt.decision;
          this.msg.metadata.cacheSyncRequest.answeredAt = new Date().toISOString();
        }
        this.cdr.markForCheck();
      },
    });
  }

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
      const wrapped = this.wrapTablesForScroll(html);
      return DOMPurify.sanitize(wrapped, {
        ALLOWED_TAGS: ['div', 'p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'br', 'span', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'loading', 'width', 'height'],
      });
    } catch { return src; }
  }

  private wrapTablesForScroll(html: string): string {
    return String(html || '')
      .replace(/<table(\b[^>]*)>/gi, '<div class="md-table-wrap"><table$1>')
      .replace(/<\/table>/gi, '</table></div>');
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
