import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { AiInlineFileComponent } from './files/ai-inline-file.component';
import { AiTodoListComponent } from './todo-list/ai-todo-list.component';
import { AiAgentBadgeComponent } from './agents/ai-agent-badge.component';
import { resolveAgentProfile } from './agents/ai-roster';
import { AiCanvasHtmlComponent } from './canvas-html/ai-canvas-html.component';
import { AiAgentReportCardComponent } from './agent-reports/ai-agent-report-card.component';
import { AiWidgetActionsComponent, WidgetAction, WidgetActionId } from './widgets/ai-widget-actions.component';
import { AiWidgetModalComponent, WidgetType, WidgetModalData } from './widgets/ai-widget-modal.component';
import { WidgetExportService } from './widgets/widget-export.service';
import { AiInlineWidgetCollapseComponent } from './widgets/ai-inline-widget-collapse.component';

/** Segment interne du rendu d'un message : texte markdown ou widget inline. */
export interface ContentRenderSegment {
  type: 'text' | 'widget';
  html?: string;         // si type=text : HTML markdown rendu
  widget?: AiMessage;    // si type=widget : message-widget référencé par [[WIDGET:id]]
  widgetId?: string;     // si type=widget : id pour trackBy
}

const WIDGET_MARKER_REGEX = /\[\[WIDGET:([a-zA-Z0-9_\-.]{1,60})\]\]/g;

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
  project_stage_for_sandbox: 'Préparation fichier sandbox',
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
  suggest_memory_entries: 'Suggestion mémoire projet',
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
  todo_write: 'Checklist', send_message_to_agent: 'Message agent',
  display_file: 'Aperçu fichier', render_interactive_canvas: 'Canvas interactif',
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
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzTagModule, NzToolTipModule, NzBadgeModule, NzInputModule, NodeExecResultDialogComponent, AiPermissionRequestCardComponent, AiCacheSyncRequestCardComponent, AiStructuredMessageComponent, AiPlanProposalCardComponent, AiDiagramRendererComponent, AiInlineImageComponent, AiInlineFileComponent, AiTodoListComponent, AiCanvasHtmlComponent, AiWidgetActionsComponent, AiAgentReportCardComponent, AiAgentBadgeComponent, AiInlineWidgetCollapseComponent],
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
          <div *ngSwitchCase="'permission_request'" class="widget-bubble perm-request-bubble">
            <ai-permission-request-card
              [request]="msg.metadata!.permissionRequest!"
              (answered)="onPermissionAnswer($event)">
            </ai-permission-request-card>
          </div>
          <div *ngSwitchCase="'cache_sync_request'" class="widget-bubble">
            <ai-cache-sync-request-card
              [request]="msg.metadata!.cacheSyncRequest!"
              (answered)="onCacheSyncAnswer($event)">
            </ai-cache-sync-request-card>
          </div>
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
          <div *ngSwitchCase="'file_inline'" class="widget-bubble widget-wrap">
            <ai-inline-file [data]="msg.metadata!.fileInline!"></ai-inline-file>
          </div>
          <div *ngSwitchCase="'todo_list'" class="widget-bubble widget-wrap">
            <ai-todo-list [data]="msg.metadata!['todoList']!"></ai-todo-list>
          </div>
          <div *ngSwitchCase="'canvas_html'" class="canvas-html-bubble widget-bubble widget-wrap">
            <ai-canvas-html [data]="msg.metadata!['canvasHtml']!"></ai-canvas-html>
          </div>
          <!-- agent_report masqué s'il est déjà référencé par un todo_list du thread
               (évite le doublon : une fois dans la todo, une fois en bas du chat) -->
          <div *ngSwitchCase="'agent_report'" class="widget-bubble widget-wrap"
               [class.report-absorbed]="isReportAbsorbedByTodo(msg)">
            <ai-agent-report-card *ngIf="!isReportAbsorbedByTodo(msg)" [report]="msg.metadata!.agentReport!"></ai-agent-report-card>
          </div>
          <div *ngSwitchCase="'system_hint'" class="system-hint-hidden"></div>
          <div *ngSwitchCase="'system_note'" class="system-hint-hidden"></div>
          <div *ngSwitchCase="'comment'" class="comment-msg" [class.subagent-ping]="isSubagentComment(msg)">
            <div class="comment-head" *ngIf="isSubagentComment(msg); else regularComment">
              <ai-agent-badge [agent]="subagentCommentAgent(msg)" [compact]="true"></ai-agent-badge>
              <span class="comment-label">a un message pour toi</span>
            </div>
            <ng-template #regularComment>
              <nz-tag nzColor="purple">
                <span nz-icon nzType="comment" nzTheme="outline"></span> Commentaire
              </nz-tag>
            </ng-template>
            <div class="comment-content" [innerHTML]="renderMarkdown(msg.content)"></div>
          </div>
        </ng-container>

        <!-- User message attachments -->
        <div class="msg-attachments" *ngIf="msg.role === 'user' && msg.attachments?.length && !msg.metadata?.kind && !editing">
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

        <!-- Inline edit (user messages) -->
        <div class="edit-wrap" *ngIf="msg.role === 'user' && editing">
          <textarea nz-input [(ngModel)]="editedText" [nzAutosize]="{ minRows: 2, maxRows: 10 }" class="edit-ta"></textarea>
          <div class="edit-actions">
            <button nz-button nzType="default" nzSize="small" (click)="cancelEdit()">Annuler</button>
            <button nz-button nzType="primary" nzSize="small" (click)="saveEdit()" [disabled]="!editedText.trim() || editedText.trim() === msg.content?.trim()">
              <span nz-icon nzType="send" nzTheme="outline"></span> Renvoyer
            </button>
          </div>
          <div class="edit-hint">Les réponses ultérieures seront supprimées et recalculées.</div>
        </div>

        <!-- Edit button (user message, hover) -->
        <button *ngIf="msg.role === 'user' && !editing && !msg.metadata?.kind && msg._id"
                nz-button nzType="text" nzSize="small" class="user-edit-btn"
                (click)="startEdit()"
                nz-tooltip nzTooltipTitle="Modifier et re-générer à partir d'ici">
          <span nz-icon nzType="edit" nzTheme="outline"></span>
        </button>

        <!-- Standard rendering (skipped for special metadata kinds) -->
        <ng-container *ngIf="!msg.metadata?.kind">
        <!-- Segments mode: reasoning blocks with text + tools, final text at end -->
        <ng-container *ngIf="msg.segments?.length; else flatLayout">
          <ng-container *ngFor="let ps of getProcessedSegments()">
            <!-- Final response text — découpé pour intégrer les widgets inline [[WIDGET:id]] -->
            <ng-container *ngIf="ps.type === 'text' && ps.content">
              <ng-container *ngFor="let seg of contentSegments(ps.content); trackBy: trackSegment">
                <div class="content" *ngIf="seg.type === 'text'" [innerHTML]="seg.html"></div>
                <ai-inline-widget-collapse
                  *ngIf="seg.type === 'widget' && seg.widget"
                  [widget]="seg.widget">
                </ai-inline-widget-collapse>
              </ng-container>
            </ng-container>
            <!-- Reasoning block: optional text + collapsible tool summary -->
            <div class="reasoning-block" *ngIf="ps.type === 'reasoning'">
              <!-- Live widgets en construction : affichés inline en tête du reasoning,
                   dans l'ordre de création. Remplacent le rendu "top of tools" pour
                   que le widget apparaisse à la place naturelle du flux. -->
              <ng-container *ngFor="let bw of buildingWidgets(ps); trackBy: trackBuildingWidget">
                <ai-inline-widget-collapse
                  *ngIf="!widgetsById?.has(bw.widgetId)"
                  [widget]="bw.placeholder">
                </ai-inline-widget-collapse>
              </ng-container>
              <div class="reasoning-header" *ngIf="ps.reasoningText"
                   (click)="toggleReasoningExpand(ps)"
                   [class.clickable]="true">
                <span nz-icon nzType="bulb" nzTheme="outline"></span>
                <span>Raisonnement</span>
                <span class="reasoning-preview" *ngIf="!isReasoningExpanded(ps)">— {{ reasoningPreview(ps) }}</span>
                <span class="reasoning-chev">
                  <span nz-icon [nzType]="isReasoningExpanded(ps) ? 'up' : 'down'" nzTheme="outline"></span>
                </span>
              </div>
              <div class="reasoning-text"
                   *ngIf="ps.reasoningText && isReasoningExpanded(ps)"
                   [innerHTML]="renderMarkdown(ps.reasoningText)"></div>
              <div class="tool-summary" *ngIf="ps.toolCalls?.length">
                <!-- Summary textuel affiché quand 2+ groupes OU quand expanded (pour re-close) -->
                <span class="summary-toggle"
                      *ngIf="groupedToolCalls(ps.toolCalls!).length > 1 || expandedTools.has(ps)"
                      (click)="toggleToolExpand(ps)">
                  <span nz-icon [nzType]="expandedTools.has(ps) ? 'down' : 'right'" nzTheme="outline"></span>
                  {{ toolGroupSummary(ps.toolCalls!) }}
                </span>
                <!-- Pills visibles UNIQUEMENT quand collapsed (quand expand, on voit le détail en dessous) -->
                <div class="tool-groups" *ngIf="!expandedTools.has(ps)">
                  <span class="tool-group-pill" *ngFor="let g of groupedToolCalls(ps.toolCalls!); trackBy: trackToolGroup"
                        [class.group-err]="g.hasError"
                        (click)="toggleToolExpand(ps)">
                    <span nz-icon [nzType]="g.icon" nzTheme="outline"></span>
                    <span *ngIf="g.count > 1" class="group-count">×{{ g.count }}</span>
                    <span class="group-label">{{ g.label }}</span>
                  </span>
                </div>
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
          <ng-container *ngIf="msg.content">
            <ng-container *ngFor="let seg of contentSegments(msg.content); trackBy: trackSegment">
              <div class="content" *ngIf="seg.type === 'text'" [innerHTML]="seg.html"></div>
              <ai-inline-widget-collapse
                *ngIf="seg.type === 'widget' && seg.widget"
                [widget]="seg.widget">
              </ai-inline-widget-collapse>
            </ng-container>
          </ng-container>
          <div class="reasoning-block" *ngIf="msg.toolCalls?.length">
            <div class="tool-summary">
              <span class="summary-toggle"
                    *ngIf="groupedToolCalls(msg.toolCalls!).length > 1 || expandedTools.has(msg)"
                    (click)="toggleToolExpand(msg)">
                <span nz-icon [nzType]="expandedTools.has(msg) ? 'down' : 'right'" nzTheme="outline"></span>
                {{ toolGroupSummary(msg.toolCalls!) }}
              </span>
              <div class="tool-groups" *ngIf="!expandedTools.has(msg)">
                <span class="tool-group-pill" *ngFor="let g of groupedToolCalls(msg.toolCalls!); trackBy: trackToolGroup"
                      [class.group-err]="g.hasError"
                      (click)="toggleToolExpand(msg)">
                  <span nz-icon [nzType]="g.icon" nzTheme="outline"></span>
                  <span *ngIf="g.count > 1" class="group-count">×{{ g.count }}</span>
                  <span class="group-label">{{ g.label }}</span>
                </span>
              </div>
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

        <!-- Footer actions : icônes discrètes sous le message assistant (copy, memory, etc.) -->
        <div class="msg-actions" *ngIf="msg.role === 'assistant' && !msg.cancelled && showActions()">
          <button nz-button nzType="text" nzSize="small" class="msg-action-btn"
                  (click)="copyContent()"
                  nz-tooltip [nzTooltipTitle]="copied ? 'Copié !' : 'Copier'">
            <span nz-icon [nzType]="copied ? 'check' : 'copy'" nzTheme="outline"></span>
          </button>
          <button *ngIf="showMemoryHint()" nz-button nzType="text" nzSize="small" class="msg-action-btn msg-action-bulb"
                  (click)="openKnowledgePending()"
                  nz-tooltip [nzTooltipTitle]="memoryTooltip()">
            <nz-badge [nzCount]="ai.pendingKnowledgeCount()" [nzOverflowCount]="9" nzSize="small">
              <span nz-icon nzType="bulb" nzTheme="outline"></span>
            </nz-badge>
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
    /* Body vide (widget-only sans texte ni actions) : pas de place perdue */
    .body:empty, .body:has(> .system-hint-hidden:only-child) { display: none; }
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
    .reasoning-header.clickable { cursor: pointer; user-select: none; transition: color .12s; }
    .reasoning-header.clickable:hover { color: #e61982; }
    .reasoning-preview { text-transform: none; letter-spacing: 0; font-weight: 400; color: #8c8c8c; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; max-width: 480px; }
    .reasoning-chev { margin-left: auto; font-size: 10px; color: #bfbfbf; }
    .reasoning-header.clickable:hover .reasoning-chev { color: #e61982; }

    /* Groupes de tools consécutifs (style Claude Code : pills horizontales) */
    .tool-groups {
      display: flex; flex-wrap: wrap; gap: 4px;
      margin-top: 4px;
    }
    .tool-group-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px;
      background: #fafafa; border: 1px solid #f0f0f0;
      border-radius: 10px;
      font-size: 11px; color: #595959;
      cursor: pointer;
      transition: all .15s;
      line-height: 1.5;
    }
    .tool-group-pill:hover {
      background: #fff5fa; border-color: #ffd6e7; color: #e61982;
    }
    .tool-group-pill.active { background: #fff5fa; border-color: #e61982; color: #e61982; }
    .tool-group-pill.active [nz-icon] { color: #e61982; }
    .tool-group-pill.active .group-count { color: #e61982; }
    .tool-group-pill.group-err { background: #fff2f0; border-color: #ffccc7; color: #cf1322; }
    .tool-group-pill [nz-icon] { font-size: 11px; color: #8c8c8c; }
    .tool-group-pill:hover [nz-icon] { color: #e61982; }
    .tool-group-pill.group-err [nz-icon] { color: #cf1322; }
    .tool-group-pill .group-count { font-weight: 700; color: #262626; font-variant-numeric: tabular-nums; }
    .tool-group-pill.group-err .group-count { color: #cf1322; }
    .tool-group-pill .group-label { opacity: 0.85; }
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
    .user-edit-btn { position: absolute; top: 4px; right: 4px; color: #bfbfbf; opacity: 0; transition: opacity .15s; }
    .ai-msg:hover .user-edit-btn { opacity: 1; }
    .user-edit-btn:hover { color: #1890ff; background: rgba(24,144,255,0.08); }
    .ai-msg.user { position: relative; }
    .edit-wrap { display: flex; flex-direction: column; gap: 6px; background: #f8f9fa; border: 1px solid #d9d9d9; border-radius: 8px; padding: 8px; min-width: 280px; max-width: 85%; }
    .edit-ta { font-size: 13px; font-family: inherit; }
    .edit-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .edit-hint { font-size: 11px; color: #8c8c8c; font-style: italic; }
    .aq-text { font-size: 12px; color: #666; margin-bottom: 6px; }
    .aq-options { display: flex; flex-wrap: wrap; gap: 4px; }
    /* Actions à DROITE du message (pas en-dessous) : absolute alignée verticalement
       sur le haut du message, visible au hover. Ne prend plus de hauteur verticale. */
    :host { position: relative; }
    .msg-actions {
      position: absolute;
      top: 4px;
      right: -4px;
      transform: translateX(100%);
      display: flex; flex-direction: column; gap: 2px;
      opacity: 0;
      transition: opacity .15s;
      z-index: 5;
      pointer-events: none;
    }
    :host(:hover) .msg-actions,
    .msg-actions:has(.msg-action-bulb) {
      opacity: 1;
      pointer-events: auto;
    }
    .msg-action-btn {
      color: #bfbfbf;
      width: 26px; height: 26px; padding: 0 !important;
      border-radius: 6px !important;
      background: transparent;
    }
    .msg-action-btn:hover { color: #e61982; background: rgba(230,25,130,0.08) !important; }
    .msg-action-bulb { color: #faad14; }
    .msg-action-bulb:hover { color: #d48806; background: rgba(250,173,20,0.1) !important; }
    /* Sur petit écran : repasse en row sous le msg pour éviter overflow horizontal */
    @media (max-width: 720px) {
      .msg-actions {
        position: static;
        transform: none;
        flex-direction: row;
        justify-content: flex-end;
        margin-top: 4px;
      }
    }
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
    /* Message venant d'un subagent → charte rose + animation d'arrivée */
    .comment-msg.subagent-ping {
      background: #fff5fa;
      border-left-color: #e61982;
      border-radius: 10px;
      animation: pingIn 300ms cubic-bezier(.2,.8,.2,1);
    }
    @keyframes pingIn {
      from { opacity: 0; transform: translateY(6px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .comment-msg.subagent-ping .comment-head {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .comment-msg.subagent-ping .comment-label { color: #8c8c8c; font-weight: 500; }
    /* Bubble absorbée par une todo : pas de place visuelle dans le chat */
    .widget-bubble.report-absorbed { display: none; }
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
    /* Widgets inline : même largeur que le texte (85%), pas de card séparée.
       Visuellement intégrés dans le flux du message comme dans Claude.ai. */
    .widget-bubble {
      max-width: 85%;
      min-width: 0;
      display: block;
      margin: 8px 0;
      background: transparent;
      border: 0;
      box-shadow: none;
    }
    @media (max-width: 640px) { .widget-bubble { max-width: 100%; } }
    .perm-request-bubble { max-width: min(560px, 85%); animation: perm-pulse 2s ease-in-out 2; }
    @keyframes perm-pulse {
      0%, 100% { box-shadow: 0 0 0 rgba(114, 46, 209, 0); }
      50% { box-shadow: 0 0 0 6px rgba(114, 46, 209, 0.18); border-radius: 10px; }
    }
    @media (max-width: 640px) { .widget-bubble { max-width: 100%; } }
    .widget-bubble :host ::ng-deep > * { max-width: 100%; }
    /* Diagrammes : bubble plus large (pleine largeur dispo) pour que le mermaid respire */
    .diagram-bubble { background: #fff; border: 1px solid #f0f0f0; border-left: 3px solid #e61982; border-radius: 0 8px 8px 0; padding: 8px 10px; max-width: min(1100px, 100%); width: 100%; }
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
  @Input() isLast = false;
  /** Map widgetId → AiMessage pour le rendu inline [[WIDGET:id]]. Fourni par ai-chat. */
  @Input() widgetsById: Map<string, AiMessage> | null = null;
  @Output() retryClick = new EventEmitter<void>();
  public ai = inject(AiService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);
  private modal = inject(NzModalService);
  private msgSvc = inject(NzMessageService);
  private widgetExp = inject(WidgetExportService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  copied = false;
  editing = false;
  editedText = '';

  startEdit() {
    this.editedText = this.msg.content || '';
    this.editing = true;
    this.cdr.markForCheck?.();
  }

  cancelEdit() {
    this.editing = false;
    this.editedText = '';
    this.cdr.markForCheck?.();
  }

  async saveEdit() {
    const newText = (this.editedText || '').trim();
    if (!newText || !this.msg._id) return;
    const id = this.msg._id;
    this.editing = false;
    try {
      await this.ai.editAndResendUserMessage(id, newText);
    } catch (e: any) {
      this.msgSvc.error(e?.message || 'Édition échouée');
    }
    this.cdr.markForCheck?.();
  }

  showActions(): boolean {
    // Pas d'actions sur les widgets (ils ont leur propre barre) ni sur les reports
    const kind = (this.msg.metadata as any)?.kind;
    if (kind && ['structured', 'plan_proposal', 'diagram', 'image_inline', 'file_inline', 'todo_list', 'canvas_html', 'agent_report', 'comment'].includes(kind)) {
      return false;
    }
    return !!this.msg.content;
  }

  showMemoryHint(): boolean {
    if (!this.isLast) return false;
    if (this.ai.currentThread()?.mode !== 'project') return false;
    return (this.ai.pendingKnowledgeCount() || 0) > 0;
  }

  memoryTooltip(): string {
    const n = this.ai.pendingKnowledgeCount() || 0;
    return `${n} info${n > 1 ? 's' : ''} à valider dans la mémoire projet`;
  }

  copyContent(): void {
    const text = this.msg.content || '';
    try {
      navigator.clipboard.writeText(text).then(() => {
        this.copied = true;
        this.cdr.markForCheck?.();
        setTimeout(() => { this.copied = false; this.cdr.markForCheck?.(); }, 1500);
      }).catch(() => this.msgSvc.error('Copie échouée'));
    } catch { this.msgSvc.error('Copie échouée'); }
  }

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
    // Via URL queryParams — ai-fullpage écoute et ouvre settings + tab Connaissances.
    // Réutilise aussi openKnowledgePending$ en fallback (si ai-settings déjà monté).
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { settings: 'knowledge', filter: 'pending' },
      queryParamsHandling: 'merge',
    });
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
    // Cas escalation subagent → utilise childJobId. Sinon job classique → metadata.jobId.
    const jobId = (req as any)?.childJobId || (this.msg.metadata as any)?.jobId;
    if (!req || !jobId) return;
    this.ai.respondToPermission(jobId, req.requestId, evt.decision, evt.pathPattern, req.toolName, req.risk).subscribe({
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

  /** Détecte si un message 'comment' vient d'un subagent (via send_message_to_agent to:'user') */
  isSubagentComment(msg: any): boolean {
    const extra = msg?.metadata?.['extra'];
    return !!(extra?.fromSubagent);
  }

  /** Le rapport subagent est-il déjà référencé par un session-todos du thread ?
   *  Si oui, on le masque de la chat principale (il est rendu DANS la todo). */
  isReportAbsorbedByTodo(msg: any): boolean {
    const jobId = msg?.metadata?.agentReport?.jobId;
    if (!jobId) return false;
    const allMessages = this.ai.messages();
    for (const m of allMessages) {
      if (m.metadata?.kind !== 'todo_list') continue;
      const todos = (m.metadata as any)?.todoList?.todos || [];
      for (const item of todos) {
        const tcs = item?.toolCalls || [];
        if (tcs.some((tc: any) => tc?.spawnedJobId === jobId)) return true;
      }
    }
    return false;
  }

  /**
   * Groupe les tool calls consécutifs de même nom en pills compactes.
   * Ex: [web_search, web_search, web_search, web_fetch] → [{name:web_search, count:3}, {name:web_fetch, count:1}]
   */
  groupedToolCalls(tools: AiToolCall[]): Array<{name: string; count: number; label: string; icon: string; hasError: boolean}> {
    if (!tools?.length) return [];
    const groups: Array<{name: string; count: number; label: string; icon: string; hasError: boolean}> = [];
    let current: any = null;
    for (const tc of tools) {
      const name = tc.name;
      if (current && current.name === name) {
        current.count++;
        if (tc.status === 'error') current.hasError = true;
      } else {
        current = {
          name,
          count: 1,
          label: this.toolLabel(name),
          icon: this.iconForTool(name),
          hasError: tc.status === 'error',
        };
        groups.push(current);
      }
    }
    return groups;
  }

  trackToolGroup(i: number, g: any): string { return g.name + ':' + i; }

  toolGroupSummary(tools: AiToolCall[]): string {
    const groups = this.groupedToolCalls(tools);
    if (!groups.length) return '0 outil';
    if (groups.length === 1) {
      const g = groups[0];
      return g.count > 1 ? `${g.count} × ${g.label}` : g.label;
    }
    return `${tools.length} actions · ${groups.length} outils différents`;
  }

  iconForTool(name: string): string {
    const map: Record<string, string> = {
      web_search: 'search', web_fetch: 'global', research_deep: 'experiment', web_download: 'cloud-download',
      execute_code: 'code', install_package: 'appstore-add',
      project_read_file: 'file-text', project_read_batch: 'file-text', project_write_file: 'edit',
      project_list_dir: 'folder', project_tree: 'apartment', project_grep: 'file-search',
      project_search: 'search', project_delete: 'delete', project_move: 'drag',
      project_create_folder: 'folder-add', project_stage_for_sandbox: 'container',
      spawn_subagent: 'team', send_message_to_agent: 'message',
      display_image: 'picture', display_file: 'file-done',
      render_interactive_canvas: 'layout', render_structured: 'table',
      generate_diagram: 'partition', generate_document: 'file-word',
      ask_user: 'question-circle', propose_plan: 'compass',
      todo_write: 'unordered-list',
      save_memory: 'save', get_memory: 'database',
      set_project_knowledge: 'book', get_project_knowledge: 'book',
      skill_list: 'appstore', skill_get: 'appstore', skill_execute: 'thunderbolt',
      execute_tool: 'play-circle', search_tools: 'search',
    };
    return map[name] || 'api';
  }

  /** Reasoning collapse : collapsed par défaut, click pour expand */
  expandedReasonings = new WeakSet<object>();
  isReasoningExpanded(ps: any): boolean {
    return this.expandedReasonings.has(ps);
  }
  toggleReasoningExpand(ps: any): void {
    if (this.expandedReasonings.has(ps)) this.expandedReasonings.delete(ps);
    else this.expandedReasonings.add(ps);
  }
  /** 80 premiers chars du reasoning en preview dans le header collapsed */
  reasoningPreview(ps: any): string {
    const txt = String(ps?.reasoningText || '').replace(/\s+/g, ' ').trim();
    return txt.length > 90 ? txt.slice(0, 90) + '…' : txt;
  }

  /** Extrait les infos roster pour afficher le badge d'un comment venu d'un subagent */
  subagentCommentAgent(msg: any) {
    const extra = msg?.metadata?.['extra'] || {};
    return {
      subagentType: extra.subagentType,
      agentName: extra.agentName,
      agentEmoji: extra.agentEmoji,
      agentColor: extra.agentColor,
      agentFigure: extra.agentFigure,
    };
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

  /**
   * Extrait les widgets actuellement en construction (livePreview sur tool call
   * avec widgetId dans les args). Rendu inline en tête du reasoning block pour
   * que le widget apparaisse à sa position naturelle dans le flux de génération,
   * plutôt qu'en haut des tools. Disparaît automatiquement dès que le widget
   * est persisté (widgetsById contient son widgetId).
   */
  buildingWidgets(ps: ProcessedSegment): Array<{ widgetId: string; placeholder: AiMessage }> {
    const tools = ps?.toolCalls || [];
    if (!tools.length) return [];
    const WIDGET_TOOL_NAMES = new Set([
      'render_structured', 'render_interactive_canvas', 'generate_diagram',
      'display_image', 'display_file',
    ]);
    const TOOL_TO_KIND: Record<string, string> = {
      render_structured: 'structured',
      render_interactive_canvas: 'canvas_html',
      generate_diagram: 'diagram',
      display_image: 'image_inline',
      display_file: 'file_inline',
    };
    const KIND_PAYLOAD_KEY: Record<string, string> = {
      structured: 'structured',
      canvas_html: 'canvasHtml',
      diagram: 'diagram',
      image_inline: 'imageInline',
      file_inline: 'fileInline',
    };
    const out: Array<{ widgetId: string; placeholder: AiMessage }> = [];
    for (const tc of tools) {
      if (!WIDGET_TOOL_NAMES.has(tc.name)) continue;
      const widgetId = tc.args?.widgetId || (tc as any).livePreview?.data?.widgetId;
      if (!widgetId) continue;
      // tc.status peut être 'building' | 'running' (pendant stream) en plus de
      // 'success' | 'error' (persistés). Cast string pour couvrir les 2 états stream.
      const status = String(tc.status || '');
      if (status !== 'building' && status !== 'running') continue;
      const kind = TOOL_TO_KIND[tc.name];
      const payloadKey = KIND_PAYLOAD_KEY[kind];
      const livePreviewData = (tc as any).livePreview?.data || {};
      const placeholder: AiMessage = {
        threadId: this.msg.threadId,
        role: 'assistant',
        content: tc.args?.title || tc.args?.caption || 'Construction en cours…',
        metadata: {
          kind: kind as any,
          widgetId,
          [payloadKey]: { ...(tc.args || {}), ...livePreviewData },
          collapse: {
            collapsed: tc.args?.collapsed === true,
            collapseTitle: tc.args?.collapseTitle,
          },
        },
      };
      out.push({ widgetId, placeholder });
    }
    return out;
  }

  trackBuildingWidget(_: number, bw: { widgetId: string }): string {
    return bw.widgetId;
  }

  /**
   * Découpe le contenu markdown en segments alternant texte et widgets inline.
   * Cherche les marqueurs `[[WIDGET:id]]` et les résout via `widgetsById`.
   * Si le widget n'est pas trouvé, le marqueur est silencieusement retiré.
   */
  contentSegments(src: string): ContentRenderSegment[] {
    const text = String(src || '');
    if (!text) return [];
    if (!text.includes('[[WIDGET:')) {
      return [{ type: 'text', html: this.renderMarkdown(text) }];
    }
    const segments: ContentRenderSegment[] = [];
    let lastIdx = 0;
    const re = new RegExp(WIDGET_MARKER_REGEX.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const before = text.slice(lastIdx, match.index);
      if (before.trim()) {
        segments.push({ type: 'text', html: this.renderMarkdown(before) });
      }
      const widgetId = match[1];
      const widget = this.widgetsById?.get(widgetId) || null;
      if (widget) {
        segments.push({ type: 'widget', widget, widgetId });
      }
      lastIdx = match.index + match[0].length;
    }
    const tail = text.slice(lastIdx);
    if (tail.trim()) {
      segments.push({ type: 'text', html: this.renderMarkdown(tail) });
    }
    return segments;
  }

  trackSegment(i: number, s: ContentRenderSegment): string {
    return s.type === 'widget' ? `w:${s.widgetId}` : `t:${i}`;
  }

  private wrapTablesForScroll(html: string): string {
    return String(html || '')
      .replace(/<table(\b[^>]*)>/gi, '<div class="md-table-wrap"><table$1>')
      .replace(/<\/table>/gi, '</table></div>');
  }

  toolDisplayName(tc: AiToolCall): string {
    if (tc.displayTitle) return tc.displayTitle;
    if (tc.name === 'execute_tool' && tc.args?.key) return tc.args.key;
    // spawn_subagent → affiche le prénom du roster au lieu de "Sous-agent" générique
    if (tc.name === 'spawn_subagent' && tc.args?.subagent_type) {
      const profile = resolveAgentProfile({ subagentType: tc.args.subagent_type });
      if (profile) return `Lance ${profile.emoji} ${profile.name}`;
    }
    if (tc.name === 'send_message_to_agent') {
      const to = tc.args?.to;
      if (to === 'user') return '💬 Message à l\'utilisateur';
      if (to === 'parent') return '💬 Message au parent';
      if (to) {
        const p = resolveAgentProfile({ subagentType: typeof to === 'string' ? to.toLowerCase() : undefined });
        if (p) return `💬 Message à ${p.emoji} ${p.name}`;
        return `💬 Message à ${to}`;
      }
    }
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
