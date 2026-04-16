import { Component, ElementRef, ViewChild, ChangeDetectorRef, effect, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiStreamEvent, AiAttachment, AI_MAX_FILES, AI_MAX_FILE_SIZE } from './ai.service';
import { AiAudioService } from './ai-audio.service';
import { AiMessageComponent } from './ai-message.component';
import { AiQuestionComponent } from './ai-question.component';
import { AiStructuredMessageComponent } from './structured/ai-structured-message.component';
import { AiDiagramRendererComponent } from './diagram/ai-diagram-renderer.component';
import { AiLivePreviewComponent, detectPreviewType, LivePreviewType } from './live-preview/ai-live-preview.component';
import { PreviewParserService, ParsedPreview } from './live-preview/preview-parser.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { jsonrepair } from 'jsonrepair';

const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils', get_tool_details: 'Détails outil', execute_tool: 'Exécution',
  list_providers: 'Providers', ask_user: 'Question', search_workflows: 'Recherche workflows',
  run_workflow: 'Lancement workflow', save_memory: 'Mémoire', get_memory: 'Mémoire',
  enrich_context: 'Contexte', open_element: 'Ouverture', list_credentials: 'Lister les identifiants', open_credentials: 'Identifiants',
  save_project_memory: 'Mémoire projet', get_project_memory: 'Mémoire projet',
  set_project_knowledge: 'Mise à jour mémoire projet', get_project_knowledge: 'Mémoire projet',
  compact_and_transfer: 'Transfert', activate_capsule: 'Activation outils',
  propose_plan: 'Plan d\'action', generate_diagram: 'Diagramme',
  read_file: 'Lecture fichier', search_manual: 'Manuel', get_manual_section: 'Manuel',
  create_flow: 'Création flow', list_graph: 'Graphe', get_templates: 'Templates',
  get_template_details: 'Détails template', ensure_start: 'Démarrage', add_node: 'Ajout noeud',
  remove_node: 'Suppression', replace_node: 'Remplacement', connect_nodes: 'Connexion',
  disconnect_nodes: 'Déconnexion', connect_by_output_name: 'Connexion sortie',
  get_output_options: 'Sorties', set_node_args: 'Config args', set_node_description: 'Description',
  validate_flow: 'Validation', auto_layout: 'Layout', save_flow: 'Sauvegarde',
  create_start_form: 'Formulaire start', propose_context_mapping: 'Mapping',
  get_node_schema: 'Schéma noeud', get_node_info: 'Info noeud', list_predecessors: 'Prédécesseurs',
  get_predecessor_context: 'Contexte préd.', search_predecessors: 'Recherche préd.',
  get_scenarios: 'Scénarios', get_msgin_preview: 'Aperçu msgIn',
  get_form_schema: 'Schéma form', set_form_schema: 'MAJ schéma', add_field: 'Ajout champ',
  update_field: 'Modif champ', remove_field: 'Suppr champ', create_form: 'Création form',
  save_form: 'Sauvegarde form', get_output_schema: 'Schéma sortie', build_schema: 'Construction schéma',
  add_section: 'Ajout section', update_section: 'Modif section', reorder_fields: 'Réordonnancement',
  get_field_types: 'Types champs', search_forms: 'Recherche forms', load_form: 'Chargement form',
  update_form_settings: 'Paramètres form',
  deploy_flow: 'Déploiement', undeploy_flow: 'Arrêt production',
  get_deployment_status: 'Statut déploiement', start_run: 'Lancement exécution',
  list_runs: 'Historique', get_run_stats: 'Statistiques',
  // Project FS tools
  project_list_dir: 'Liste dossier projet', project_tree: 'Arborescence projet',
  project_read_file: 'Lecture fichier projet', project_read_batch: 'Lecture multiple',
  project_grep: 'Recherche texte', project_search: 'Recherche fichiers',
  project_write_file: 'Écriture fichier', project_create_folder: 'Création dossier',
  project_delete: 'Suppression fichier', project_move: 'Déplacement fichier',
  project_refresh_tree: 'Actualisation arbo', project_sync_remote: 'Synchronisation distant',
  // Web tools
  web_search: 'Recherche web', web_fetch: 'Lecture page web', research_deep: 'Recherche approfondie', web_download: 'Téléchargement web',
  // Code execution
  execute_code: 'Exécution code', prepare_code_environment: 'Préparation environnement',
  // Subagents
  spawn_subagent: 'Sous-agent',
  install_package: 'Installation package', display_image: 'Affichage image',
  // Skills
  skill_list: 'Liste skills', skill_get: 'Détails skill', skill_execute: 'Exécution skill',
  // Document generation
  generate_document: 'Génération document', edit_document: 'Édition document',
  render_html_preview: 'Aperçu HTML', build_website: 'Construction site',
  // Structured interactive messages
  render_structured: 'Affichage structuré',
  render_interactive_canvas: 'Canvas interactif',
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

interface StreamSegment {
  type: 'text' | 'tools';
  html?: string;            // rendered markdown HTML for text segments
  rawText?: string;          // raw text for accumulation
  tools?: StreamTool[];      // tools in a tools segment
  reasoningText?: string;    // raw reasoning text accumulated during tools phase
  reasoningHtml?: string;    // rendered HTML for reasoning text
}

interface StreamTool {
  id: string; name: string;
  status: 'building' | 'running' | 'success' | 'error';
  duration?: number; args?: any; result?: any;
  inputJson?: string; displayTitle?: string;
  argsSchema?: { key: string; label: string }[];
  parsedArgs?: Record<string, any>;
  changedKeys?: Set<string>;
  /** Live preview state (incremental, mis à jour via worker + ui.preview.update) */
  livePreview?: { type: LivePreviewType; data: any };
}

@Component({
  selector: 'ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzButtonModule, NzIconModule, NzEmptyModule, NzTagModule, NzToolTipModule, AiMessageComponent, AiQuestionComponent, AiStructuredMessageComponent, AiDiagramRendererComponent, AiLivePreviewComponent],
  animations: [
    trigger('toolRotate', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ position: 'absolute', width: '100%' }),
        animate('200ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 })),
      ]),
    ]),
    trigger('argsExpand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('250ms cubic-bezier(0.16, 1, 0.3, 1)', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    <!-- Messages -->
    <div class="messages" #scrollContainer (scroll)="onScroll()">
      <ng-container *ngIf="ai.messages().length === 0 && !ai.streaming()">
        <div class="empty">
          <nz-empty nzNotFoundContent="Commencez une conversation"></nz-empty>
        </div>
      </ng-container>

      <ng-container *ngFor="let msg of ai.messages(); let i = index">
        <!-- System context message (transferred context) — sauf hint qui passe par ai-message -->
        <div class="system-msg" *ngIf="msg.role === 'system' && msg.metadata?.kind !== 'system_hint'">
          <div class="system-context">
            <span nz-icon nzType="info-circle" nzTheme="outline"></span>
            <span class="system-label">Contexte transféré</span>
            <button nz-button nzType="text" nzSize="small" (click)="toggleExpanded(msg)">
              {{ expandedMsgs.has(msg) ? 'Masquer' : 'Voir' }}
            </button>
          </div>
          <div class="system-content" *ngIf="expandedMsgs.has(msg)" [innerHTML]="renderMd(msg.content)"></div>
        </div>
        <!-- Regular message (with contiguous assistant grouping) OU system_hint -->
        <div *ngIf="msg.role !== 'system' || msg.metadata?.kind === 'system_hint'"
             class="msg-wrap"
             [class.grouped]="isGroupedWithPrevious(msg, ai.messages()[i-1] || null)">
          <ai-message
            [msg]="msg"
            [compact]="isGroupedWithPrevious(msg, ai.messages()[i-1] || null)"
            [isLast]="i === ai.messages().length - 1"
            (retryClick)="retry()">
          </ai-message>
        </div>
      </ng-container>

      <!-- Waiting for first token / thinking between iterations -->
      <div class="streaming-msg" *ngIf="ai.streaming() && !segments.length && !streamError">
        <div class="ai-msg assistant">
          <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <div class="thinking-indicator" *ngIf="thinkingIteration > 1">
              <span nz-icon nzType="loading" nzTheme="outline" class="thinking-spin"></span>
              <span class="thinking-text">Réflexion en cours...</span>
            </div>
            <div class="typing-indicator" *ngIf="thinkingIteration <= 1">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stream error -->
      <div class="streaming-msg" *ngIf="streamError">
        <div class="ai-msg assistant">
          <div class="avatar avatar-error"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <div class="content content-error">
              <span nz-icon nzType="close-circle" nzTheme="fill" style="margin-right:6px"></span>
              <strong>Erreur :</strong> {{ streamError }}
            </div>
          </div>
        </div>
      </div>

      <!-- Streaming: interleaved text + tools -->
      <div class="streaming-msg" *ngIf="segments.length">
        <div class="ai-msg assistant">
          <div class="avatar"><span nz-icon nzType="robot" nzTheme="outline"></span></div>
          <div class="body">
            <ng-container *ngFor="let seg of segments; let i = index; trackBy: trackSeg">
              <!-- Text segment -->
              <div class="content" *ngIf="seg.type === 'text' && seg.html"
                   [innerHTML]="seg.html"></div>

              <!-- Tools segment -->
              <div class="reasoning-block" *ngIf="seg.type === 'tools' && (seg.tools?.length || seg.reasoningHtml)"
                   [class.reasoning-active]="isLastSegment(i) && ai.streaming()">
                <div class="reasoning-header" *ngIf="seg.reasoningHtml">
                  <span nz-icon [nzType]="isLastSegment(i) && ai.streaming() ? 'loading' : 'bulb'" nzTheme="outline"></span>
                  <span>Raisonnement</span>
                </div>
                <div class="reasoning-text" *ngIf="seg.reasoningHtml" [innerHTML]="seg.reasoningHtml"></div>

                <!-- During streaming: collapsible for completed tools + rotator for current -->
                <ng-container *ngIf="isLastSegment(i) && ai.streaming() && seg.tools?.length">
                  <!-- Collapsible for completed tools (all except last) -->
                  <div class="tool-summary" *ngIf="completedTools(seg.tools!).length > 0">
                    <span class="summary-toggle" (click)="toggleToolExpand(seg)">
                      <span nz-icon [nzType]="expandedTools.has(seg) ? 'down' : 'right'" nzTheme="outline"></span>
                      {{ completedTools(seg.tools!).length }} outil{{ completedTools(seg.tools!).length > 1 ? 's' : '' }} exécuté{{ completedTools(seg.tools!).length > 1 ? 's' : '' }}
                    </span>
                    <div class="tool-list" *ngIf="expandedTools.has(seg)">
                      <div *ngFor="let t of completedTools(seg.tools!)" class="tool-item-wrap">
                        <div class="tool-list-item"
                             [class.item-success]="t.status === 'success'"
                             [class.item-error]="t.status === 'error'"
                             [class.item-expandable]="hasVisibleArgs(t)"
                             (click)="hasVisibleArgs(t) && toggleToolItemExpand(t)">
                          <span nz-icon [nzType]="t.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline"></span>
                          <span>{{ toolDisplayName(t) }}</span>
                          <span class="item-dur" *ngIf="t.duration">{{ t.duration }}ms</span>
                          <span nz-icon *ngIf="hasVisibleArgs(t)" class="item-chevron"
                                [nzType]="expandedToolItems.has(t.id) ? 'down' : 'right'" nzTheme="outline"></span>
                        </div>
                        <div class="args-tree args-tree-done" *ngIf="expandedToolItems.has(t.id) && hasVisibleArgs(t)">
                          <div *ngFor="let field of getArgsFields(t); trackBy: trackArgField" class="args-row">
                            <span class="args-label">{{ field.label }}</span>
                            <div class="args-value-wrap">
                              <span class="args-value"
                                    [class.args-value-clamped]="!expandedArgValues.has(t.id + ':' + field.key)"
                                    #valRef>{{ formatArgValue(field.value) }}</span>
                              <span class="args-expand-toggle" *ngIf="valRef.scrollHeight > valRef.clientHeight || expandedArgValues.has(t.id + ':' + field.key)"
                                    (click)="toggleArgExpand(t.id, field.key)">{{ expandedArgValues.has(t.id + ':' + field.key) ? 'voir moins' : 'voir plus' }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Rotator / Tree View for latest tool -->
                  <ng-container *ngIf="latestToolArray(seg.tools!).length">
                    <div *ngFor="let t of latestToolArray(seg.tools!); trackBy: trackToolRotate"
                         @toolRotate class="tool-viewer">
                      <div class="tool-viewer-header claude-style"
                           [class.tool-building]="t.status === 'building'"
                           [class.tool-running]="t.status === 'running'"
                           [class.tool-success]="t.status === 'success'"
                           [class.tool-error]="t.status === 'error'"
                           [class.tool-clickable]="t.status === 'running' && hasVisibleArgs(t)"
                           (click)="t.status === 'running' && hasVisibleArgs(t) && toggleRunningArgs(t.id)">
                        <span nz-icon
                          [nzType]="t.status === 'building' ? 'tool' : t.status === 'running' ? 'loading' : t.status === 'error' ? 'close-circle' : 'check-circle'"
                          nzTheme="outline" [nzSpin]="t.status === 'running'"
                          class="viewer-ico"></span>
                        <span class="viewer-title">{{ toolDisplayName(t) }}</span>
                        <!-- Signature inline (Claude Code style): args compact sur 1 ligne
                             avec shimmer pendant streaming des arguments -->
                        <span class="viewer-sig"
                              *ngIf="toolInlineSignature(t) as sig"
                              [class.shimmer]="t.status === 'building' || t.status === 'running'">{{ sig }}</span>
                        <span class="viewer-dur" *ngIf="t.duration && t.status !== 'running' && t.status !== 'building'">{{ t.duration }}ms</span>
                        <span nz-icon *ngIf="t.status === 'running' && hasVisibleArgs(t)" class="item-chevron"
                              [nzType]="runningArgsExpanded.has(t.id) ? 'down' : 'right'" nzTheme="outline"></span>
                      </div>
                      <!-- Live preview universel (structured/diagram/plan/document/research/subagent/download/code) -->
                      <div class="live-preview-wrap" *ngIf="hasLivePreview(t)">
                        <ai-live-preview
                          [previewType]="t.livePreview!.type"
                          [data]="t.livePreview!.data"
                          [status]="t.status">
                        </ai-live-preview>
                      </div>
                      <div class="args-tree" *ngIf="!hasLivePreview(t) && (t.status === 'building' || (t.status === 'running' && runningArgsExpanded.has(t.id))) && hasVisibleArgs(t)" @argsExpand>
                        <div *ngFor="let field of getArgsFields(t); trackBy: trackArgField" class="args-row"
                             [class.args-row-new]="t.changedKeys?.has(field.key)">
                          <span class="args-label">{{ field.label }}</span>
                          <div class="args-value-wrap">
                            <span class="args-value"
                                  [class.fade-token]="t.changedKeys?.has(field.key)"
                                  [class.args-value-clamped]="!expandedArgValues.has(t.id + ':' + field.key)"
                                  #valRef>{{ formatArgValue(field.value) }}</span>
                            <span class="args-expand-toggle" *ngIf="valRef.scrollHeight > valRef.clientHeight || expandedArgValues.has(t.id + ':' + field.key)"
                                  (click)="$event.stopPropagation(); toggleArgExpand(t.id, field.key)">{{ expandedArgValues.has(t.id + ':' + field.key) ? 'voir moins' : 'voir plus' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ng-container>
                </ng-container>

                <!-- Segment done (not streaming): full collapsible summary -->
                <div class="tool-summary" *ngIf="!(isLastSegment(i) && ai.streaming()) && seg.tools?.length">
                  <span class="summary-toggle" (click)="toggleToolExpand(seg)">
                    <span nz-icon [nzType]="expandedTools.has(seg) ? 'down' : 'right'" nzTheme="outline"></span>
                    {{ seg.tools!.length }} outil{{ seg.tools!.length > 1 ? 's' : '' }} exécuté{{ seg.tools!.length > 1 ? 's' : '' }}
                  </span>
                  <div class="tool-list" *ngIf="expandedTools.has(seg)">
                    <div *ngFor="let t of seg.tools" class="tool-item-wrap">
                      <div class="tool-list-item"
                           [class.item-success]="t.status === 'success'"
                           [class.item-error]="t.status === 'error'"
                           [class.item-expandable]="hasVisibleArgs(t)"
                           (click)="hasVisibleArgs(t) && toggleToolItemExpand(t)">
                        <span nz-icon [nzType]="t.status === 'error' ? 'close-circle' : 'check-circle'" nzTheme="outline"></span>
                        <span>{{ toolDisplayName(t) }}</span>
                        <span class="item-dur" *ngIf="t.duration">{{ t.duration }}ms</span>
                        <span nz-icon *ngIf="hasVisibleArgs(t)" class="item-chevron"
                              [nzType]="expandedToolItems.has(t.id) ? 'down' : 'right'" nzTheme="outline"></span>
                      </div>
                      <div class="args-tree args-tree-done" *ngIf="expandedToolItems.has(t.id) && hasVisibleArgs(t)">
                        <div *ngFor="let field of getArgsFields(t); trackBy: trackArgField" class="args-row">
                          <span class="args-label">{{ field.label }}</span>
                          <div class="args-value-wrap">
                            <span class="args-value"
                                  [class.args-value-clamped]="!expandedArgValues.has(t.id + ':' + field.key)"
                                  #valRef>{{ formatArgValue(field.value) }}</span>
                            <span class="args-expand-toggle" *ngIf="valRef.scrollHeight > valRef.clientHeight || expandedArgValues.has(t.id + ':' + field.key)"
                                  (click)="toggleArgExpand(t.id, field.key)">{{ expandedArgValues.has(t.id + ':' + field.key) ? 'voir moins' : 'voir plus' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
            <!-- Thinking indicator between tool completion and next LLM response (not during text streaming) -->
            <div class="thinking-inline" *ngIf="thinkingIteration > 1 && ai.streaming() && !isLastSegmentText()">
              <span nz-icon nzType="loading" nzTheme="outline" class="thinking-spin"></span>
              <span class="thinking-text">Analyse...</span>
            </div>
          </div>
        </div>
        <!-- Interrupted tag -->
        <div class="interrupted-tag" *ngIf="interrupted && segments.length">
          <nz-tag nzColor="orange">
            <span nz-icon nzType="pause-circle" nzTheme="outline"></span> Interrompu
          </nz-tag>
        </div>
      </div>

    </div>

    <!-- Indicateur subagents en cours : petite card compacte, toujours visible
         tant qu'au moins 1 subagent est actif. Click → ouvre le canvas Agents. -->
    <div class="subagent-live-indicator" *ngIf="ai.activeSubagents().length && !ai.pendingQuestion()"
         (click)="openAgentsCanvas()">
      <span class="sli-pulse"></span>
      <span class="sli-count">{{ ai.activeSubagents().length }}</span>
      <span class="sli-label">
        sous-agent{{ ai.activeSubagents().length > 1 ? 's' : '' }} en cours
      </span>
      <span class="sli-names">
        <span *ngFor="let s of activeSubagentsPreview(); trackBy: trackSubagent" class="sli-mini"
              [style.background]="s.agentColor || '#e61982'"
              [title]="(s.agentName || s.subagentType) + ' — ' + s.status">
          {{ s.agentEmoji || '🤖' }}
        </span>
      </span>
      <span class="sli-arrow">
        <span nz-icon nzType="arrow-right" nzTheme="outline"></span>
      </span>
    </div>

    <!-- Pending question — ANCRÉ AU-DESSUS DE L'INPUT (sticky bas) -->
    <div class="pending-question-pinned" *ngIf="ai.pendingQuestion()">
      <!-- Contexte : texte assistant qui précédait la question -->
      <div class="pq-context" *ngIf="ai.pendingQuestionContext() as ctx">
        <div class="pq-context-body" [innerHTML]="renderPqContext(ctx)"></div>
      </div>
      <div class="pq-head">
        <span nz-icon nzType="question-circle" nzTheme="outline" class="pq-ico"></span>
        <span class="pq-title">Une réponse est attendue</span>
        <button nz-button nzType="text" nzSize="small" class="pq-close"
                (click)="cancelQuestion()"
                nz-tooltip nzTooltipTitle="Annuler — continue sans répondre">
          <span nz-icon nzType="close" nzTheme="outline"></span>
        </button>
      </div>
      <ai-question
        [question]="ai.pendingQuestion()!"
        (answered)="onAnswer($event)">
      </ai-question>
    </div>

    <!-- Input -->
    <div class="input-bar" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)"
         [class.drag-over]="isDragOver"
         [class.input-disabled]="!!ai.pendingQuestion()">
      <!-- Attachment previews -->
      <div class="att-previews" *ngIf="pendingAttachments.length">
        <div class="att-chip" *ngFor="let att of pendingAttachments; let i = index"
             [class.att-uploading]="att.uploading" [class.att-error]="!!att.error">
          <img *ngIf="att.previewUrl && isImage(att.mimeType)" [src]="att.previewUrl" class="att-thumb" />
          <span *ngIf="!att.previewUrl || !isImage(att.mimeType)" nz-icon nzType="file" nzTheme="outline" class="att-icon"></span>
          <span class="att-name" [title]="att.name">{{ att.name }}</span>
          <span class="att-size">{{ formatFileSize(att.size) }}</span>
          <span nz-icon *ngIf="att.uploading" nzType="loading" nzTheme="outline" class="att-loading"></span>
          <span nz-icon *ngIf="att.error" nzType="warning" nzTheme="outline" class="att-warn" [title]="att.error"></span>
          <button nz-button nzType="text" nzSize="small" class="att-remove" (click)="removeAttachment(i)">
            <span nz-icon nzType="close" nzTheme="outline"></span>
          </button>
        </div>
      </div>
      <!-- Suggestions auto selon type de fichier : affichées uniquement si input vide -->
      <div class="att-suggestions" *ngIf="pendingAttachments.length && !inputText.trim() && !ai.streaming()">
        <span class="sug-hint">Suggestions :</span>
        <button *ngFor="let s of attachmentSuggestions()"
                nz-button nzType="default" nzSize="small" class="sug-chip"
                (click)="applySuggestion(s.prompt)">
          <span nz-icon [nzType]="s.icon" nzTheme="outline"></span> {{ s.label }}
        </button>
      </div>
      <!-- Normal text input -->
      <div class="input-row" *ngIf="!audio.recording()">
        <div class="input-prefix">
          <button nz-button nzType="text" nzSize="small" nzShape="circle" class="voice-btn"
            (click)="toggleMic()"
            [disabled]="ai.streaming() || audio.transcribing()"
            nz-tooltip nzTooltipTitle="Enregistrement vocal">
            <span nz-icon [nzType]="audio.transcribing() ? 'loading' : 'audio'" nzTheme="outline"
              [nzSpin]="audio.transcribing()"></span>
          </button>
          <button nz-button nzType="text" nzSize="small" nzShape="circle" class="attach-btn"
            (click)="fileInput.click()"
            [disabled]="ai.streaming() || pendingAttachments.length >= maxFiles"
            nz-tooltip nzTooltipTitle="Joindre un fichier">
            <span nz-icon nzType="paper-clip" nzTheme="outline"></span>
          </button>
          <input #fileInput type="file" multiple hidden (change)="onFilesSelected($event)" />
        </div>
        <textarea
          nz-input
          [(ngModel)]="inputText"
          [placeholder]="placeholderText()"
          (keydown)="onInputKeydown($event)"
          (paste)="onPaste($event)"
          [nzAutosize]="{ minRows: 1, maxRows: 6 }"
          [disabled]="audio.transcribing() || readOnly()">
        </textarea>
        <div class="input-suffix">
          <button *ngIf="ai.streaming()" nz-button nzType="text" nzSize="small" nzShape="circle" nzDanger (click)="stopStream()">
            <span nz-icon nzType="pause-circle" nzTheme="outline"></span>
          </button>
          <button *ngIf="!ai.streaming()" nz-button nzType="primary" nzSize="small" nzShape="circle" class="chat-send-btn" (click)="send()"
            [disabled]="!inputText.trim() && !pendingAttachments.length">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
        </div>
      </div>
      <!-- Recording waveform -->
      <div class="input-row recording-row" *ngIf="audio.recording()">
        <canvas #waveformCanvas class="waveform-canvas"></canvas>
        <span class="mic-timer">{{ audio.recordingDuration() }}s</span>
        <button nz-button nzType="text" nzShape="circle" nzSize="small" class="rec-btn rec-cancel" (click)="cancelMic()"
          nz-tooltip nzTooltipTitle="Annuler">
          <span nz-icon nzType="close" nzTheme="outline"></span>
        </button>
        <button nz-button nzType="text" nzShape="circle" nzSize="small" class="rec-btn rec-confirm" (click)="confirmMic()"
          nz-tooltip nzTooltipTitle="Envoyer">
          <span nz-icon nzType="check" nzTheme="outline"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-width: 0; overflow-x: hidden; }
    .messages { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
    .empty { flex: 1; display: flex; align-items: center; justify-content: center; }
    /* Grouped assistant messages — collapse space between stacked bubbles */
    .msg-wrap { display: block; }
    .msg-wrap.grouped { margin-top: -6px; }
    .msg-wrap.grouped ::ng-deep .ai-msg { padding-top: 0 !important; padding-bottom: 2px !important; }
    .msg-wrap.grouped ::ng-deep .ai-msg .avatar-spacer { background: transparent !important; }
    .streaming-msg .ai-msg { display: flex; gap: 10px; padding: 8px 0; }
    .streaming-msg .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e6f4ff; color: #e61982; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
    .streaming-msg .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .streaming-msg .content { background: #f5f5f5; border-radius: 12px 12px 12px 2px; padding: 8px 14px; max-width: 85%; min-width: 0; overflow: hidden; word-break: break-word; line-height: 1.5; }
    .streaming-msg .content :host ::ng-deep p { margin: 0 0 4px; }
    .streaming-msg .content :host ::ng-deep p:last-child { margin: 0; }
    .streaming-msg .content :host ::ng-deep code { background: #e8e8e8; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .streaming-msg .content :host ::ng-deep pre { background: #e8e8e8; padding: 8px; border-radius: 6px; max-width: 100%; overflow-x: auto; }
    .streaming-msg .content ::ng-deep .md-table-wrap {
      margin: 8px 0;
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .streaming-msg .content ::ng-deep .md-table-wrap > table {
      border-collapse: collapse;
      width: max-content;
      min-width: 100%;
      margin: 0;
      font-size: 13px;
    }
    .streaming-msg .content ::ng-deep table { border-collapse: collapse; width: max-content; min-width: 100%; margin: 8px 0; font-size: 13px; }
    .streaming-msg .content ::ng-deep th, .streaming-msg .content ::ng-deep td { border: 1px solid #e8e8e8; padding: 6px 10px; text-align: left; white-space: nowrap; }
    .streaming-msg .content ::ng-deep th { background: #fafafa; font-weight: 600; font-size: 12px; }
    .streaming-msg .content ::ng-deep tr:nth-child(even) { background: #fafafa; }
    .reasoning-block { border-left: 3px solid #d9d9d9; padding: 6px 12px; margin: 4px 0; border-radius: 0 8px 8px 0; transition: opacity 0.3s ease, border-color 0.3s ease; max-width: 85%; }
    .reasoning-block.reasoning-active { border-left-color: #722ed1; opacity: 0.9; animation: pulse-reason 2s ease-in-out infinite; }
    .reasoning-block:not(.reasoning-active) { opacity: 0.85; }
    .reasoning-header { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #999; margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; }
    .reasoning-text { font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 6px; word-break: break-word; }
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
    @keyframes pulse-reason { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.75; } }
    .tool-viewer { margin: 2px 0; }
    .tool-viewer-header { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; }
    .viewer-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Claude Code style : 1 ligne compacte, signature inline, shimmer streaming */
    .tool-viewer-header.claude-style {
      padding: 4px 10px;
      background: transparent;
      border-radius: 6px;
      font-size: 12px;
      gap: 7px;
      min-width: 0;
    }
    .tool-viewer-header.claude-style.tool-building,
    .tool-viewer-header.claude-style.tool-running { color: #e61982; font-weight: 500; }
    .tool-viewer-header.claude-style.tool-success { color: #595959; }
    .tool-viewer-header.claude-style.tool-error { color: #cf1322; background: #fff2f0; }
    .tool-viewer-header.claude-style .viewer-ico { font-size: 12px; color: inherit; flex-shrink: 0; }
    .tool-viewer-header.claude-style .viewer-title {
      font-weight: 600;
      color: #262626;
      max-width: 220px;
    }
    .tool-viewer-header.claude-style.tool-building .viewer-title,
    .tool-viewer-header.claude-style.tool-running .viewer-title { color: #e61982; }
    .tool-viewer-header.claude-style.tool-error .viewer-title { color: #cf1322; }

    /* Signature : monospace, color muted, shimmer quand en cours */
    .viewer-sig {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 11px;
      color: #8c8c8c;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 2px;
    }
    .viewer-sig.shimmer {
      background: linear-gradient(90deg, #bfbfbf 0%, #e61982 50%, #bfbfbf 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: sigShimmer 1.5s ease-in-out infinite;
    }
    @keyframes sigShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .viewer-dur {
      font-size: 10px;
      color: #bfbfbf;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    .tool-building { color: #8c8c8c; }
    .tool-running { color: #e61982; }
    .tool-clickable { cursor: pointer; border-radius: 4px; padding: 2px 6px; margin: 0 -6px; transition: background 0.15s; }
    .tool-clickable:hover { background: rgba(230, 25, 130, 0.06); }
    .tool-success { color: #52c41a; }
    .tool-error { color: #ff4d4f; }
    .args-tree { padding: 4px 0 4px 22px; border-left: 2px solid #e8e8e8; margin-left: 7px; }
    .args-row { display: flex; gap: 8px; font-size: 11px; padding: 1px 0; line-height: 1.5; }
    .args-label { color: #999; font-weight: 500; min-width: 80px; flex-shrink: 0; white-space: nowrap; }
    .args-value-wrap { min-width: 0; flex: 1; }
    .args-value { color: #333; word-break: break-word; white-space: pre-wrap; display: block; }
    .args-value-clamped { max-height: calc(4 * 1.5em); overflow: hidden; }
    .args-expand-toggle { display: inline-block; font-size: 10px; color: #e61982; cursor: pointer; margin-top: 1px; }
    .args-expand-toggle:hover { text-decoration: underline; }
    .fade-token { animation: tokenFadeIn 400ms ease-out; }
    @keyframes tokenFadeIn { 0% { opacity: 0.3; color: #e61982; } 100% { opacity: 1; color: #333; } }
    .args-row-new { background: rgba(230, 25, 130, 0.04); border-radius: 3px; }
    .tool-item-wrap { }
    .item-expandable { cursor: default; }
    .item-chevron { font-size: 10px; color: #bbb; margin-left: 4px; cursor: pointer; transition: color 0.2s; }
    .item-chevron:hover { color: #666; }
    .args-tree-done { margin-top: 2px; margin-bottom: 2px; }
    .tool-summary { margin-top: 4px; }
    .summary-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #999; cursor: pointer; transition: color 0.2s; }
    .summary-toggle:hover { color: #666; }
    .tool-list { margin-top: 4px; }
    .tool-list-item { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 2px 0; color: #666; }
    .item-success span[nz-icon] { color: #52c41a; }
    .item-error span[nz-icon] { color: #ff4d4f; }
    .item-error { color: #ff4d4f; }
    .item-dur { color: #bbb; font-size: 10px; margin-left: auto; }
    .typing-indicator { display: flex; align-items: center; gap: 4px; padding: 10px 16px; background: #f5f5f5; border-radius: 12px 12px 12px 2px; max-width: 60px; }
    .typing-indicator .dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: typing-bounce 1.4s ease-in-out infinite; }
    .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
    .thinking-indicator { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f5f5f5; border-radius: 12px 12px 12px 2px; max-width: 200px; }
    .thinking-spin { font-size: 14px; color: #722ed1; }
    .thinking-text { font-size: 12px; color: #999; }
    .thinking-inline { display: flex; align-items: center; gap: 5px; padding: 4px 0; opacity: 0.7; }
    .avatar-error { background: #fff2f0 !important; color: #ff4d4f !important; }
    .content-error { background: #fff2f0 !important; color: #ff4d4f; border: 1px solid #ffccc7; display: flex; align-items: center; }
    .input-bar { width: 100%; margin: 0; padding: 6px 0 12px; box-sizing: border-box; border-top: 1px solid rgba(15, 23, 42, 0.08); }
    .input-row { display: flex; align-items: center; gap: 6px; border: 1px solid #dbe4ef; border-radius: 20px; padding: 5px 12px; margin-inline: clamp(10px, 2vw, 24px); transition: border-color 0.2s, box-shadow 0.2s; background: #fff; }
    .input-row:hover,
    .input-row:focus-within {
      border-color: #e61982;
      box-shadow: 0 0 0 2px rgba(230, 25, 130, 0.15);
    }
    .input-row textarea { flex: 1; min-width: 0; min-height: 30px; border: none !important; outline: none !important; box-shadow: none !important; resize: none; padding: 6px 4px; font-size: 13px; line-height: 1.4; background: transparent; }
    .input-row textarea:focus { box-shadow: none !important; }
    .input-prefix, .input-suffix { display: flex; align-items: center; flex-shrink: 0; gap: 6px; }
    .voice-btn,
    .attach-btn {
      border-radius: 8px;
      transition: background .15s, color .15s, box-shadow .15s, transform .08s;
    }
    .chat-send-btn {
      border-radius: 50% !important;
      width: 30px;
      min-width: 30px;
      height: 30px;
      padding: 0 !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background .15s, color .15s, box-shadow .15s, transform .08s;
    }
    .voice-btn:hover:not(:disabled),
    .voice-btn:focus-visible:not(:disabled),
    .attach-btn:hover:not(:disabled),
    .attach-btn:focus-visible:not(:disabled),
    .chat-send-btn:hover:not(:disabled),
    .chat-send-btn:focus-visible:not(:disabled) {
      background: rgba(230,25,130,0.1) !important;
      color: #e61982 !important;
      box-shadow: 0 4px 12px rgba(230,25,130,0.18);
      transform: translateY(-1px);
    }
    .chat-send-btn.ant-btn-primary,
    .chat-send-btn.ant-btn-primary:not(:disabled) {
      background: #e61982;
      border-color: #e61982;
      color: #fff !important;
    }
    .chat-send-btn.ant-btn-primary:hover,
    .chat-send-btn.ant-btn-primary:focus-visible {
      background: #4096ff;
      border-color: #4096ff;
      color: #fff !important;
    }
    .chat-send-btn.ant-btn-primary:active {
      background: #0958d9;
      border-color: #0958d9;
    }
    .chat-send-btn.ant-btn-primary[disabled],
    .chat-send-btn.ant-btn-primary:disabled {
      background: #91caff;
      border-color: #91caff;
      color: #fff !important;
    }
    .recording-row { align-items: center !important; gap: 8px !important; padding: 6px 12px !important; overflow: hidden; }
    .waveform-canvas { flex: 1; width: 0; height: 32px; min-width: 0; display: block; }
    .mic-timer { font-size: 12px; color: #ff4d4f; font-weight: 600; flex-shrink: 0; min-width: 28px; text-align: center; }
    .rec-btn { flex-shrink: 0; }
    .rec-cancel { color: #999 !important; }
    .rec-cancel:hover { color: #ff4d4f !important; }
    .rec-confirm { color: #52c41a !important; }
    .rec-confirm:hover { color: #389e0d !important; }
    .system-msg { background: #f8f9fa; border-left: 3px solid #d9d9d9; padding: 8px 12px; font-size: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
    .system-context { display: flex; align-items: center; gap: 6px; color: #999; }
    .system-label { font-weight: 500; }
    .system-content { margin-top: 6px; font-size: 12px; color: #666; line-height: 1.5; }
    .system-content ::ng-deep p { margin: 0 0 4px; }
    /* Question ancrée au-dessus de l'input : empêche l'user d'écrire
       librement tant qu'une réponse est attendue. Animation slide-up. */
    .pending-question-pinned {
      position: relative;
      margin: 0 16px;
      background: #fff;
      border: 1px solid #ffd6e7;
      border-radius: 12px 12px 8px 8px;
      padding: 10px 14px 12px;
      box-shadow: 0 -4px 20px rgba(230, 25, 130, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
      animation: pqSlideIn 240ms cubic-bezier(.2,.8,.2,1);
      border-bottom: 0;
    }
    @keyframes pqSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pq-head {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600;
      color: #e61982;
      text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 8px;
    }
    .pq-ico { font-size: 13px; }
    .pq-title { flex: 1; }
    .pq-close {
      margin-left: auto;
      color: #bfbfbf !important;
      padding: 0 6px !important;
      height: 22px !important;
      line-height: 1 !important;
    }
    .pq-close:hover { color: #e61982 !important; background: #fff5fa !important; }

    /* Contexte assistant texte précédant la question */
    .pq-context {
      margin-bottom: 10px;
      padding: 8px 10px;
      background: #fafafa;
      border-left: 2px solid #e8e8e8;
      border-radius: 4px;
      max-height: 96px;
      overflow-y: auto;
    }
    .pq-context-body {
      font-size: 12px; color: #595959; line-height: 1.5;
    }
    .pq-context-body ::ng-deep p { margin: 0 0 4px; }
    .pq-context-body ::ng-deep p:last-child { margin: 0; }
    .pq-context-body ::ng-deep code { background: #f0f0f0; padding: 0 3px; border-radius: 2px; font-size: 11px; }

    /* Indicateur subagents en cours : compacte, 1 ligne, sticky */
    .subagent-live-indicator {
      display: flex; align-items: center; gap: 8px;
      margin: 0 16px 6px;
      padding: 8px 12px;
      background: linear-gradient(90deg, #fff5fa 0%, #fff 100%);
      border: 1px solid #ffd6e7;
      border-radius: 10px;
      font-size: 12px;
      color: #595959;
      cursor: pointer;
      transition: background .15s, border-color .15s, transform .12s;
      animation: sliSlideIn 220ms cubic-bezier(.2,.8,.2,1);
    }
    .subagent-live-indicator:hover {
      background: linear-gradient(90deg, #ffe0ee 0%, #fff5fa 100%);
      border-color: #e61982;
      transform: translateY(-1px);
    }
    @keyframes sliSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .sli-pulse {
      width: 8px; height: 8px; border-radius: 50%;
      background: #e61982;
      box-shadow: 0 0 0 0 rgba(230,25,130,.4);
      animation: sliPulse 1.4s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes sliPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(230,25,130,.4); }
      50%      { box-shadow: 0 0 0 6px rgba(230,25,130,0); }
    }
    .sli-count { font-weight: 700; color: #e61982; font-size: 13px; font-variant-numeric: tabular-nums; }
    .sli-label { flex: 1; color: #595959; }
    .sli-names { display: inline-flex; gap: 3px; }
    .sli-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px;
      background: #e61982; color: #fff;
      border-radius: 50%;
      font-size: 11px;
      line-height: 1;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
    }
    .sli-arrow { color: #e61982; font-size: 11px; }

    /* Input grisé quand une question bloque */
    .input-bar.input-disabled {
      opacity: 0.55;
      pointer-events: none;
      position: relative;
    }
    .input-bar.input-disabled::after {
      content: "Réponds d'abord à la question ci-dessus";
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: #8c8c8c;
      background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.4));
      pointer-events: none;
    }
    .interrupted-tag { padding: 4px 0; }
    .drag-over { border-color: #e61982 !important; background: rgba(230, 25, 130, 0.04); }
    .att-previews { display: flex; flex-wrap: wrap; gap: 6px; padding: 0px 24px 2px; }
    .att-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 24px 4px; align-items: center; }
    .att-suggestions .sug-hint { font-size: 11px; color: #8c8c8c; font-weight: 500; }
    .att-suggestions .sug-chip { font-size: 12px; height: 26px; padding: 0 10px; border-radius: 14px; color: #e61982; border-color: rgba(230,25,130,0.3); }
    .att-suggestions .sug-chip:hover { background: rgba(230,25,130,0.08); border-color: #e61982; }
    .att-chip { display: inline-flex; align-items: center; gap: 4px; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px; padding: 3px 6px; font-size: 12px; max-width: 200px; }
    .att-chip.att-uploading { opacity: 0.7; }
    .att-chip.att-error { border-color: #ff4d4f; background: #fff2f0; }
    .att-thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
    .att-icon { font-size: 16px; color: #999; flex-shrink: 0; }
    .att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px; color: #333; }
    .att-size { color: #999; font-size: 10px; flex-shrink: 0; }
    .att-loading { font-size: 12px; color: #e61982; flex-shrink: 0; }
    .att-warn { font-size: 12px; color: #ff4d4f; flex-shrink: 0; }
    .att-remove { padding: 0 !important; min-width: auto !important; height: auto !important; color: #999 !important; font-size: 10px !important; }
    .att-remove:hover { color: #ff4d4f !important; }
  `]
})
export class AiChatComponent implements AfterViewInit {
  inputText = '';
  segments: StreamSegment[] = [];
  streamError: string | null = null;
  expandedMsgs = new Set<any>();
  expandedTools = new Set<StreamSegment>();
  expandedToolItems = new Set<string>(); // track individual tool id expansion
  expandedArgValues = new Set<string>(); // track expanded arg values (key = toolId:fieldKey)
  runningArgsExpanded = new Set<string>(); // track running tools with args open
  thinkingIteration = 0;
  interrupted = false;

  // Attachment state
  pendingAttachments: AiAttachment[] = [];
  isDragOver = false;
  maxFiles = AI_MAX_FILES;

  // V2 — permission-based chat behavior
  readOnly(): boolean {
    const t = this.ai.currentThread() as any;
    return t?._sharedPermission === 'view';
  }
  commentMode(): boolean {
    const t = this.ai.currentThread() as any;
    return t?._sharedPermission === 'comment';
  }
  placeholderText(): string {
    if (this.readOnly()) return "Vous n'avez pas l'autorisation de répondre";
    if (this.commentMode()) return 'Écrire un commentaire...';
    return 'Écris un message...';
  }

  // Auto-scroll: only scroll if user is near the bottom
  private _userAtBottom = true;
  private readonly SCROLL_THRESHOLD = 60; // px from bottom to consider "at bottom"

  // Rotator: minimum display time per tool (avoids flashing for fast tools)
  private readonly ROTATOR_MIN_MS = 400;
  private _rotatorId: string | null = null;
  private _rotatorTimer: any = null;
  private _rotatorSwitchedAt = 0;
  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('waveformCanvas') waveformCanvas?: ElementRef<HTMLCanvasElement>;

  private stopFn?: () => void;

  private nzMsg = inject(NzMessageService);
  private previewParser = inject(PreviewParserService);
  // Souscriptions worker par toolId (pour cleanup)
  private _previewSubs = new Map<string, { unsub: () => void }>();

  constructor(public ai: AiService, public audio: AiAudioService, private cdr: ChangeDetectorRef) {
    // Prompt templates : insertion dans input chat
    this.ai.promptTemplateApply$.subscribe((prompt: string) => {
      if (!prompt) return;
      this.inputText = prompt;
      this.cdr.detectChanges();
      setTimeout(() => {
        try {
          const ta = document.querySelector('ai-chat textarea') as HTMLTextAreaElement | null;
          if (ta) { ta.focus(); ta.setSelectionRange?.(prompt.length, prompt.length); }
        } catch {}
      }, 30);
    });
    // Reset auto-scroll when switching threads
    effect(() => {
      this.ai.currentThread();
      this._userAtBottom = true;
    });
    // Scroll on message changes (conditional — respects user scroll position)
    effect(() => {
      this.ai.messages();
      this.scrollToBottom();
    });
    // Draw waveform when recording
    effect(() => {
      const data = this.audio.waveformData();
      if (data.length && this.waveformCanvas?.nativeElement) {
        this.drawWaveform(data, this.waveformCanvas.nativeElement);
      }
    });
  }

  ngAfterViewInit() {
    // Ensure initial render lands on the latest messages when the chat view mounts.
    if (this.ai.messages().length) this.forceScrollToBottom();
  }

  private drawWaveform(data: Uint8Array, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Draw bars from the center
    const barCount = 64;
    const step = Math.floor(data.length / barCount);
    const barWidth = Math.max(1.5, (w / barCount) * 0.6);
    const gap = w / barCount;
    const midY = h / 2;

    ctx.fillStyle = '#333';
    for (let i = 0; i < barCount; i++) {
      const sample = data[i * step] || 128;
      const amplitude = Math.abs(sample - 128) / 128;
      const barH = Math.max(2, amplitude * (h * 0.9));
      const x = i * gap + (gap - barWidth) / 2;
      ctx.fillRect(x, midY - barH / 2, barWidth, barH);
    }
  }

  onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  async send() {
    const text = (this.inputText || '').trim();
    const hasAttachments = this.pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || this.ai.streaming()) return;

    // Wait for all uploads to complete
    const stillUploading = this.pendingAttachments.some(a => a.uploading);
    if (stillUploading) {
      this.nzMsg.warning('Uploads en cours, patiente...');
      return;
    }

    // Check for upload errors
    const withErrors = this.pendingAttachments.filter(a => a.error);
    if (withErrors.length) {
      this.nzMsg.warning('Certains fichiers ont échoué. Retire-les avant d\'envoyer.');
      return;
    }

    const attachments = hasAttachments ? [...this.pendingAttachments] : undefined;
    this.inputText = '';
    this.pendingAttachments = [];
    this.segments = [];
    this.streamError = null;
    this.thinkingIteration = 0;
    this.interrupted = false;
    this.resetRotator();
    this.forceScrollToBottom();

    const { events$, stop } = await this.ai.quickSend(text, undefined, attachments);
    this.stopFn = stop;
    this.handleStream(events$);
  }

  // ── File attachment handling ──

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
      input.value = ''; // reset for re-selecting same file
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    if (event.dataTransfer?.files?.length) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      event.preventDefault();
      this.addFiles(files);
    }
  }

  addFiles(files: File[]) {
    const remaining = AI_MAX_FILES - this.pendingAttachments.length;
    if (remaining <= 0) {
      this.nzMsg.warning(`Maximum ${AI_MAX_FILES} fichiers par message`);
      return;
    }
    const toAdd = files.slice(0, remaining);
    for (const file of toAdd) {
      if (file.size > AI_MAX_FILE_SIZE) {
        this.nzMsg.error(`"${file.name}" dépasse la limite de 20 Mo`);
        continue;
      }
      const att: AiAttachment = {
        fileId: '',
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploading: true,
        previewUrl: this.isImage(file.type) ? URL.createObjectURL(file) : undefined,
      };
      this.pendingAttachments = [...this.pendingAttachments, att];
      const idx = this.pendingAttachments.length - 1;

      this.ai.uploadFile(file).subscribe({
        next: (ref) => {
          this.pendingAttachments = this.pendingAttachments.map((a, i) =>
            i === idx ? { ...a, fileId: ref.fileId, uploading: false } : a
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.pendingAttachments = this.pendingAttachments.map((a, i) =>
            i === idx ? { ...a, uploading: false, error: err?.message || 'Échec upload' } : a
          );
          this.cdr.detectChanges();
        },
      });
    }
    this.cdr.detectChanges();
  }

  /** Suggestions de prompt selon les types de fichiers attachés. */
  attachmentSuggestions(): Array<{ label: string; prompt: string; icon: string }> {
    const out: Array<{ label: string; prompt: string; icon: string }> = [];
    const mimes = this.pendingAttachments.filter(a => !a.uploading && !a.error).map(a => a.mimeType || '');
    if (!mimes.length) return out;
    const hasImage = mimes.some(m => m.startsWith('image/'));
    const hasPdf = mimes.some(m => m === 'application/pdf');
    const hasXlsx = mimes.some(m => /spreadsheet|excel|csv/i.test(m));
    const hasDocx = mimes.some(m => /wordprocessing|msword/i.test(m));
    const hasAudio = mimes.some(m => m.startsWith('audio/'));
    const hasVideo = mimes.some(m => m.startsWith('video/'));
    const hasCode = mimes.some(m => /javascript|typescript|json|xml|yaml/i.test(m));
    if (hasImage) {
      out.push({ label: 'Décrire', prompt: 'Décris précisément ce que tu vois sur cette image.', icon: 'eye' });
      out.push({ label: 'Extraire le texte', prompt: "Extrais tout le texte visible sur cette image (OCR).", icon: 'scan' });
    }
    if (hasPdf) {
      out.push({ label: 'Résumer', prompt: 'Lis ce PDF et fais-moi un résumé structuré des points clés.', icon: 'file-text' });
      out.push({ label: 'Extraire données', prompt: 'Extrais les données structurées de ce PDF (dates, montants, noms, tableaux).', icon: 'table' });
    }
    if (hasXlsx) {
      out.push({ label: 'Analyser', prompt: 'Analyse ce tableau et donne-moi les insights principaux avec éventuellement un graphique.', icon: 'bar-chart' });
    }
    if (hasDocx) {
      out.push({ label: 'Résumer', prompt: 'Lis ce document et fais-moi un résumé.', icon: 'file-text' });
    }
    if (hasAudio) {
      out.push({ label: 'Transcrire', prompt: 'Transcris cet enregistrement audio en texte.', icon: 'audio' });
    }
    if (hasVideo) {
      out.push({ label: 'Analyser', prompt: 'Analyse cette vidéo et décris ce qui s\'y passe.', icon: 'video-camera' });
    }
    if (hasCode) {
      out.push({ label: 'Expliquer', prompt: 'Explique ce que fait ce code et suggère des améliorations.', icon: 'code' });
    }
    return out.slice(0, 3);
  }

  applySuggestion(prompt: string) {
    this.inputText = prompt;
    this.cdr.detectChanges();
    setTimeout(() => {
      try {
        const textarea = document.querySelector('ai-chat textarea') as HTMLTextAreaElement | null;
        if (textarea) { textarea.focus(); textarea.setSelectionRange?.(prompt.length, prompt.length); }
      } catch {}
    }, 30);
  }

  removeAttachment(index: number) {
    const att = this.pendingAttachments[index];
    if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
    this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
  }

  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/') || false;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  async toggleMic() {
    if (!this.audio.recording()) {
      try {
        await this.audio.startRecording();
        this.cdr.detectChanges();
      } catch (e: any) {
        console.error('[ai-chat] mic error:', e);
        this.cdr.detectChanges();
      }
    }
  }

  cancelMic() {
    this.audio.cancelRecording();
    this.cdr.detectChanges();
  }

  async confirmMic() {
    try {
      const blob = await this.audio.stopAndGetBlob();
      this.cdr.detectChanges();
      this.audio.transcribe(blob).subscribe({
        next: (text: string) => {
          if (text.trim()) {
            this.inputText = text;
            this.cdr.detectChanges();
            this.send();
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        },
      });
    } catch { this.cdr.detectChanges(); }
  }

  stopStream() {
    this.stopFn?.();
    this.stopFn = undefined;
    this.interrupted = true;
  }

  retry() {
    const msgs = this.ai.messages();
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].content) {
        this.inputText = msgs[i].content;
        this.send();
        return;
      }
    }
  }

  onAnswer(answer: any) {
    this.segments = [];
    this.streamError = null;
    this.thinkingIteration = 0;
    this.interrupted = false;
    this.forceScrollToBottom();
    const result = this.ai.answerQuestion(answer);
    if (!result) return;
    const { events$, stop } = result;
    this.stopFn = stop;
    this.handleStream(events$);
  }

  /** Annule la question pinned sans envoyer de réponse (l'agent reste en attente
   *  côté backend mais le chat est débloqué côté user). */
  cancelQuestion(): void {
    this.ai.pendingQuestion.set(null);
    this.ai.pendingQuestionContext.set(null);
  }

  /** Preview (max 4) des subagents actifs pour l'indicateur live */
  activeSubagentsPreview(): any[] {
    return this.ai.activeSubagents().slice(0, 4);
  }

  trackSubagent(_i: number, s: any): string {
    return s.jobId || s.id || _i.toString();
  }

  /** Ouvre le canvas Agents quand l'utilisateur clique sur l'indicateur live */
  openAgentsCanvas(): void {
    try {
      (this.ai as any).sideEvents$?.next({ type: 'canvas.agents.open' });
      this.ai.canvasOpen.set(true);
    } catch { /* non-fatal */ }
  }

  /** Render markdown-lite pour le contexte (clamp à ~2 lignes via CSS) */
  renderPqContext(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'a', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } catch { return String(src || ''); }
  }

  private handleStream(events$: any) {
    events$.subscribe({
      next: (ev: AiStreamEvent) => {
        try {
          this.processStreamEvent(ev);
        } catch (e) {
          console.error('[ai-chat] stream event error:', e);
        }
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('[ai-chat] stream error:', err);
        this.streamError = err?.message || 'Connexion échouée';
        this.stopFn = undefined;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        this.segments = [];
        this.stopFn = undefined;
        this.cdr.detectChanges();
      },
    });
  }

  /** Process a single stream event — fully immutable segment updates */
  private processStreamEvent(ev: AiStreamEvent) {
    // Filtre : les events `tool.*` et `message` issus d'un SOUS-AGENT (tag
    // `_subagentEvent: true` + `_parentJobId` par le backend) ne doivent PAS
    // apparaître dans le chat principal — ils sont affichés dans le canvas
    // « Agents » uniquement. Seuls les events de l'agent principal (et l'appel
    // à spawn_subagent lui-même) s'affichent ici.
    const evAny = ev as any;
    const isSubagentEvent = evAny?._subagentEvent === true || !!evAny?._parentJobId;
    const evType = (ev as any).type as string;
    if (isSubagentEvent && (
      evType === 'tool.start' ||
      evType === 'tool.end' ||
      evType === 'tool.input_delta' ||
      evType === 'tool.meta' ||
      evType === 'tool.building_done' ||
      evType === 'message'
    )) {
      return;
    }
    switch (ev.type) {
      case 'message': {
        this.resetRotator(); // Text streaming → collapse tools immediately
        const text = (ev as any).text || '';
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'text') {
          // Append to existing text segment
          const raw = (last.rawText || '') + text;
          const updated: StreamSegment = { type: 'text', rawText: raw, html: this.renderMd(raw) };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else {
          // New text segment (after tools segment or at start)
          this.segments = [...this.segments, { type: 'text', rawText: text, html: this.renderMd(text) }];
        }
        break;
      }
      case 'tool.start': {
        const tool: StreamTool = { id: (ev as any).id, name: (ev as any).name, status: 'building' };
        const last = this.segments[this.segments.length - 1];
        if (last && last.type === 'tools') {
          // Add tool to existing tools segment
          const updated: StreamSegment = { ...last, tools: [...(last.tools || []), tool] };
          this.segments = [...this.segments.slice(0, -1), updated];
        } else if (last && last.type === 'text') {
          // Absorb preceding text as reasoning into new tools segment
          const reasoningText = last.rawText || '';
          const newSeg: StreamSegment = {
            type: 'tools',
            tools: [tool],
            reasoningText: reasoningText || undefined,
            reasoningHtml: reasoningText ? this.renderMd(reasoningText) : undefined,
          };
          this.segments = [...this.segments.slice(0, -1), newSeg];
        } else {
          this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
        }
        this.updateRotator();
        break;
      }
      case 'tool.input_delta': {
        // Accumulate partial JSON on the tool
        const deltaId = (ev as any).id;
        const deltaName = (ev as any).name || '';
        const deltaText = (ev as any).text || '';
        let deltaFound = false;
        const deltaUpdated = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === deltaId);
          if (idx < 0) return seg;
          deltaFound = true;
          const updatedTools = seg.tools.map((t, i) =>
            i === idx ? { ...t, inputJson: (t.inputJson || '') + deltaText } : t
          );
          return { ...seg, tools: updatedTools };
        });
        if (deltaFound) {
          this.segments = deltaUpdated;
        } else if (deltaId) {
          // tool.start was missed — create the tool entry from input_delta
          const tool: StreamTool = { id: deltaId, name: deltaName, status: 'building', inputJson: deltaText };
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'tools') {
            this.segments = [...this.segments.slice(0, -1), { ...last, tools: [...(last.tools || []), tool] }];
          } else {
            this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
          }
        }
        // Parse partial args via Web Worker (fallback main thread si worker indispo)
        // pour éviter tout jank sur gros JSON. On démarre la session à la volée.
        if (deltaId && !this._previewSubs.has(deltaId)) {
          const obs = this.previewParser.startSession(deltaId, deltaName);
          const sub = obs.subscribe((parsed: ParsedPreview) => this.onWorkerParsed(deltaId, parsed));
          this._previewSubs.set(deltaId, { unsub: () => sub.unsubscribe() });
        }
        if (deltaId) this.previewParser.feed(deltaId, deltaText);
        this.updateRotator();
        break;
      }
      case 'tool.meta': {
        const metaId = (ev as any).id;
        const metaTitle = (ev as any).displayTitle;
        const metaSchema = (ev as any).argsSchema;
        this.segments = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === metaId);
          if (idx < 0) return seg;
          return { ...seg, tools: seg.tools.map((t, i) =>
            i === idx ? { ...t, displayTitle: metaTitle, argsSchema: metaSchema || t.argsSchema } : t
          )};
        });
        this.updateRotator();
        break;
      }
      case 'tool.building_done': {
        const bdId = (ev as any).id;
        this.segments = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === bdId);
          if (idx < 0) return seg;
          return { ...seg, tools: seg.tools.map((t, i) =>
            i === idx ? { ...t, status: 'running' as const } : t
          )};
        });
        break;
      }
      case 'tool.end': {
        const evId = (ev as any).id;
        const evName = (ev as any).name || '';
        const evStatus = ((ev as any).status || 'success') as 'running' | 'success' | 'error';
        const evDuration = (ev as any).duration;
        const evArgs = (ev as any).args;
        const evResult = (ev as any).result;
        const evDisplayTitle = (ev as any).displayTitle;
        // Close running args with animation before status change
        this.runningArgsExpanded.delete(evId);
        // Find and update the tool — create NEW segment + tools array
        let found = false;
        const updated = this.segments.map(seg => {
          if (seg.type !== 'tools' || !seg.tools) return seg;
          const idx = seg.tools.findIndex(t => t.id === evId);
          if (idx < 0) return seg;
          found = true;
          const updatedTools = seg.tools.map((t, i) =>
            i === idx ? { ...t, status: evStatus, duration: evDuration, args: evArgs, result: evResult, displayTitle: evDisplayTitle || t.displayTitle } : t
          );
          return { ...seg, tools: updatedTools };
        });
        if (found) {
          this.segments = updated;
        } else {
          // tool.start was missed — create the tool entry directly
          const tool: StreamTool = { id: evId, name: evName, status: evStatus, duration: evDuration, args: evArgs, result: evResult, displayTitle: evDisplayTitle };
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'tools') {
            this.segments = [...this.segments.slice(0, -1), { ...last, tools: [...(last.tools || []), tool] }];
          } else {
            this.segments = [...this.segments, { type: 'tools', tools: [tool] }];
          }
        }
        // Cleanup worker session pour ce tool
        {
          const entry = this._previewSubs.get(evId);
          if (entry) { try { entry.unsub(); } catch {} ; this._previewSubs.delete(evId); }
          try { this.previewParser.closeSession(evId); } catch {}
        }
        // Quand un tool crée un AiMessage inline (structured/plan/diagram), le front doit
        // recharger les messages pour que le widget s'affiche naturellement dans le flux.
        if (['render_structured', 'propose_plan', 'generate_diagram', 'display_image', 'render_interactive_canvas'].includes(evName) && evStatus === 'success') {
          try { this.ai.reloadThreadMessages?.(); } catch {}
        }
        this.updateRotator();
        break;
      }
      case 'error': {
        const errMsg = (ev as any).message || 'Une erreur est survenue';
        if (this.segments.length) {
          // Error during streaming — append to segments
          const errHtml = `<p style="color:#ff4d4f"><strong>Erreur :</strong> ${errMsg}</p>`;
          const last = this.segments[this.segments.length - 1];
          if (last && last.type === 'text') {
            const raw = (last.rawText || '') + '\n\n**Erreur :** ' + errMsg;
            this.segments = [...this.segments.slice(0, -1), { type: 'text', rawText: raw, html: this.renderMd(raw) } as StreamSegment];
          } else {
            this.segments = [...this.segments, { type: 'text', rawText: '**Erreur :** ' + errMsg, html: errHtml } as StreamSegment];
          }
        } else {
          // Error before any content — show red error indicator
          this.streamError = errMsg;
        }
        break;
      }
      case 'done':
        this.resetRotator();
        // Cleanup toutes les sessions preview pending
        for (const [toolId, entry] of this._previewSubs.entries()) {
          try { entry.unsub(); } catch {}
          try { this.previewParser.closeSession(toolId); } catch {}
        }
        this._previewSubs.clear();
        // Clear segments immediately to avoid duplication with final message from messages signal
        this.segments = [];
        this.thinkingIteration = 0;
        break;
      case 'ui.preview.start' as any: {
        const pId = (ev as any).toolId;
        const pType = (ev as any).previewType as LivePreviewType;
        if (pId && pType) {
          this.ensureLivePreview(pId, pType);
        }
        break;
      }
      case 'ui.preview.delta' as any: {
        const pId = (ev as any).toolId;
        const pType = (ev as any).previewType as LivePreviewType;
        const pState = (ev as any).state;
        if (!pId || !pType) break;
        // Le backend envoie déjà l'état reconstitué — on l'utilise directement
        // (le worker frontend sert pour les tool.input_delta non-preview, en fallback).
        this.applyLivePreviewState(pId, pType, pState);
        break;
      }
      case 'ui.preview.building_done' as any: {
        const pId = (ev as any).toolId;
        const pType = (ev as any).previewType as LivePreviewType;
        const pState = (ev as any).state;
        if (pId && pType && pState != null) {
          this.applyLivePreviewState(pId, pType, pState);
        }
        break;
      }
      case 'ui.preview.update' as any: {
        // Émis par les exécuteurs pendant l'exécution (research_deep steps, web_download progress,
        // execute_code stdout lines, spawn_subagent status). `patch` est un tableau
        // d'ops JSON-patch simplifiées : [{op, path, value?}].
        const pId = (ev as any).toolId;
        const pName = (ev as any).toolName;
        const patch = (ev as any).patch as Array<{ op: string; path: string; value?: any }>;
        if (!pId || !Array.isArray(patch)) break;
        const pType = detectPreviewType(pName);
        if (!pType) break;
        this.applyLivePreviewPatch(pId, pType, patch);
        break;
      }
      case 'thinking' as any:
        this.thinkingIteration = (ev as any).iteration || 0;
        break;
      // Forward builder-relevant events (patch, snapshot, args, desc, form.update)
      case 'patch':
      case 'snapshot':
      case 'args':
      case 'desc':
        console.log('[ai-chat] forwarding side event:', ev.type, ev);
        this.ai.emitSideEvent(ev);
        break;
    }
    // Forward form and flow events too
    if ((ev as any).type?.startsWith?.('form.') || (ev as any).type?.startsWith?.('flow.')) {
      console.log('[ai-chat] forwarding form/flow event:', (ev as any).type, ev);
      this.ai.emitSideEvent(ev);
    }
  }

  renderMd(src: string): string {
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

  // trackBy functions to avoid DOM thrashing during streaming
  trackSeg(i: number, seg: StreamSegment): string { return `${i}-${seg.type}`; }
  trackTool(i: number, t: StreamTool): string { return t.id; }

  isLastSegment(i: number): boolean { return i === this.segments.length - 1; }
  isLastSegmentText(): boolean { const last = this.segments[this.segments.length - 1]; return last?.type === 'text'; }

  toggleExpanded(msg: any) {
    if (this.expandedMsgs.has(msg)) this.expandedMsgs.delete(msg);
    else this.expandedMsgs.add(msg);
  }

  /**
   * Returns true if `msg` should be visually grouped with `prev` (same author, close in time).
   * Used to collapse consecutive assistant messages into a single bubble stack with one avatar.
   */
  isGroupedWithPrevious(msg: any, prev: any): boolean {
    if (!prev || !msg) return false;
    if (msg.role !== 'assistant' || prev.role !== 'assistant') return false;
    const t1 = new Date(msg.createdAt || 0).getTime();
    const t2 = new Date(prev.createdAt || 0).getTime();
    if (!t1 || !t2) return false;
    return Math.abs(t1 - t2) < 10_000; // 10s window
  }

  toolLabel(name: string): string {
    return TOOL_LABELS[name] || name;
  }

  toolExtra(t: StreamTool): string {
    if (!t.args) return '';
    if (t.name === 'execute_tool' && t.args.key) return t.args.key;
    if (t.name === 'search_tools' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'get_tool_details' && t.args.key) return t.args.key;
    if (t.name === 'get_template_details' && t.args.key) return t.args.key;
    if (t.name === 'add_node' && t.args.templateKey) return t.args.templateKey;
    if (t.name === 'connect_nodes') return `${t.args.sourceId?.slice(-8) || '?'} → ${t.args.targetId?.slice(-8) || '?'}`;
    if (t.name === 'get_templates' && t.args.query) return `"${t.args.query}"`;
    if (t.name === 'set_node_args' && t.args.nodeId) return t.args.nodeId.slice(-8);
    return '';
  }

  /** All completed tools excluding the one currently in the rotator — for collapsible during streaming */
  completedTools(tools: StreamTool[]): StreamTool[] {
    return tools.filter(t => t.status !== 'building' && t.status !== 'running' && t.id !== this._rotatorId);
  }

  /** Returns single-element array for the rotator *ngFor — uses delayed switching for min display time */
  latestToolArray(tools: StreamTool[]): StreamTool[] {
    if (!this._rotatorId) return [];
    const tool = tools.find(t => t.id === this._rotatorId);
    return tool ? [tool] : [];
  }

  /** Evaluate which tool should be in the rotator — called after tool events */
  private updateRotator() {
    const lastSeg = this.segments[this.segments.length - 1];
    if (lastSeg?.type !== 'tools' || !lastSeg.tools?.length) return;

    const tools = lastSeg.tools;
    // Find the best target tool to display — always show the latest tool
    let targetId: string | null = null;
    for (let i = tools.length - 1; i >= 0; i--) {
      targetId = tools[i].id;
      break;
    }

    if (!targetId || targetId === this._rotatorId) return;

    const now = Date.now();
    const elapsed = now - this._rotatorSwitchedAt;

    if (!this._rotatorId || elapsed >= this.ROTATOR_MIN_MS) {
      // Switch immediately
      this._rotatorId = targetId;
      this._rotatorSwitchedAt = now;
      clearTimeout(this._rotatorTimer);
    } else {
      // Queue switch after remaining time
      clearTimeout(this._rotatorTimer);
      this._rotatorTimer = setTimeout(() => {
        this.updateRotator();
        this.cdr.detectChanges();
        this.scrollToBottom();
      }, this.ROTATOR_MIN_MS - elapsed);
    }
  }

  /** Reset rotator state (on stream end or text start) */
  private resetRotator() {
    clearTimeout(this._rotatorTimer);
    this._rotatorId = null;
    this._rotatorSwitchedAt = 0;
    this.runningArgsExpanded.clear();
  }

  trackToolRotate(_i: number, t: StreamTool): string { return t.id; }
  trackArgField(_i: number, f: { key: string }): string { return f.key; }

  /**
   * Signature inline style Claude Code : extrait l'arg le plus pertinent et
   * le formate en 1 ligne compacte. Retourne '' si pas d'arg à montrer.
   * Ex:
   *   web_search({query:"iPaaS"}) → '"iPaaS"'
   *   execute_code({language:"python", code:"..."}) → 'python (215c)'
   *   spawn_subagent({subagent_type:"research"}) → 'research'
   *   project_read_file({path:"/src/app.ts"}) → '/src/app.ts'
   */
  toolInlineSignature(t: StreamTool): string {
    const a: any = t.args;
    if (!a || typeof a !== 'object') {
      // Pendant le streaming, on n'a que le JSON partiel
      if (t.inputJson) {
        const q = t.inputJson.match(/"(?:query|url|path|key|prompt|to|subagent_type)"\s*:\s*"([^"]{1,80})/);
        if (q) return `"${q[1]}${q[1].length >= 60 ? '…' : ''}"`;
      }
      return '';
    }
    if (t.name === 'web_search' && a.query) return `"${String(a.query).slice(0, 70)}${String(a.query).length > 70 ? '…' : ''}"`;
    if (t.name === 'web_fetch' && a.url) return String(a.url).replace(/^https?:\/\//, '').slice(0, 70);
    if (t.name === 'web_download' && a.url) return String(a.url).replace(/^https?:\/\//, '').slice(0, 70);
    if (t.name === 'execute_code') {
      const lang = a.language || '';
      const len = a.code ? String(a.code).length : 0;
      return len ? `${lang} (${len}c)` : lang;
    }
    if (t.name === 'project_read_file' && a.path) return String(a.path);
    if (t.name === 'project_write_file' && a.path) return String(a.path);
    if (t.name === 'project_grep' && a.pattern) return `/${String(a.pattern).slice(0, 50)}/`;
    if (t.name === 'spawn_subagent' && a.subagent_type) return String(a.subagent_type);
    if (t.name === 'send_message_to_agent' && a.to) return `→ ${a.to}`;
    if (t.name === 'todo_write' && Array.isArray(a.todos)) return `${a.todos.length} item${a.todos.length > 1 ? 's' : ''}`;
    if (t.name === 'display_file' && a.fileId) return a.fileId;
    if (t.name === 'display_image' && (a.fileId || a.url)) return a.fileId || String(a.url).replace(/^https?:\/\//, '').slice(0, 50);
    if (t.name === 'render_structured' && a.layout) return String(a.layout);
    if (t.name === 'generate_diagram' && a.type) return String(a.type);
    if (t.name === 'render_interactive_canvas' && a.title) return `"${String(a.title).slice(0, 50)}"`;
    // Fallback : première string significative
    for (const k of ['query', 'url', 'path', 'key', 'prompt', 'to', 'title']) {
      if (typeof a[k] === 'string' && a[k]) return String(a[k]).slice(0, 60);
    }
    return '';
  }

  toolDisplayName(t: StreamTool): string {
    if (t.displayTitle) return t.displayTitle;
    if (t.name === 'execute_tool') {
      if (t.args?.key) return t.args.key;
      if (t.inputJson) {
        const m = t.inputJson.match(/"key"\s*:\s*"([^"]+)"/);
        if (m) return m[1];
      }
      return 'Exécution...';
    }
    const label = this.toolLabel(t.name);
    const extra = this.toolExtra(t) || this.extraFromInputJson(t);
    return extra ? `${label} — ${extra}` : label;
  }

  /** Extract tool extra info from partial inputJson during streaming (before args are available) */
  private extraFromInputJson(t: StreamTool): string {
    if (!t.inputJson) return '';
    if (t.name === 'search_tools') {
      const m = t.inputJson.match(/"query"\s*:\s*"([^"]+)"/);
      if (m) return `"${m[1]}"`;
    }
    if (t.name === 'get_tool_details' || t.name === 'get_template_details') {
      const m = t.inputJson.match(/"key"\s*:\s*"([^"]+)"/);
      if (m) return m[1];
    }
    return '';
  }

  /** Parse partial JSON via jsonrepair. For execute_tool, extract inner args. */
  private parsePartialArgs(tool: StreamTool): Record<string, any> | null {
    if (!tool.inputJson) return null;
    try {
      const repaired = jsonrepair(tool.inputJson);
      const parsed = JSON.parse(repaired);
      if (tool.name === 'execute_tool' && parsed.args && typeof parsed.args === 'object') {
        return parsed.args;
      }
      return parsed;
    } catch { return null; }
  }

  /** Check if tool has args to display in tree */
  hasVisibleArgs(t: StreamTool): boolean {
    return this.getArgsFields(t).length > 0;
  }

  /** Rendu live render_structured : dès qu'on a layout + data partiel on affiche */
  isStructuredLive(t: StreamTool): boolean {
    if (t.name !== 'render_structured') return false;
    const pa: any = t.parsedArgs;
    return !!(pa && pa.layout && pa.data && typeof pa.data === 'object');
  }

  /** Rendu live generate_diagram : dès qu'on a mermaid (même partiel valide) */
  isDiagramLive(t: StreamTool): boolean {
    if (t.name !== 'generate_diagram') return false;
    const pa: any = t.parsedArgs;
    return !!(pa && typeof pa.mermaid === 'string' && pa.mermaid.trim().length > 10);
  }

  /** Callback depuis le worker : set parsedArgs + changedKeys sur le tool correspondant. */
  private onWorkerParsed(toolId: string, res: ParsedPreview): void {
    const parsed = res.parsed;
    if (!parsed || typeof parsed !== 'object') return;
    const changedKeys = new Set<string>(res.diffKeys || []);
    this.segments = this.segments.map(seg => {
      if (seg.type !== 'tools' || !seg.tools) return seg;
      const idx = seg.tools.findIndex(t => t.id === toolId);
      if (idx < 0) return seg;
      return {
        ...seg,
        tools: seg.tools.map((t, i) => i === idx
          ? { ...t, parsedArgs: parsed, changedKeys: changedKeys.size ? changedKeys : t.changedKeys }
          : t),
      };
    });
    this.cdr.markForCheck();
  }

  /** Initialise la structure livePreview pour un tool (sans écraser data si déjà là). */
  private ensureLivePreview(toolId: string, type: LivePreviewType): void {
    this.segments = this.segments.map(seg => {
      if (seg.type !== 'tools' || !seg.tools) return seg;
      const idx = seg.tools.findIndex(t => t.id === toolId);
      if (idx < 0) return seg;
      const t = seg.tools[idx];
      if (t.livePreview?.type === type) return seg;
      const tools = seg.tools.map((tt, i) => i === idx ? { ...tt, livePreview: { type, data: t.livePreview?.data || {} } } : tt);
      return { ...seg, tools };
    });
  }

  /** Remplace l'état complet de la live preview d'un tool. */
  private applyLivePreviewState(toolId: string, type: LivePreviewType, state: any): void {
    this.segments = this.segments.map(seg => {
      if (seg.type !== 'tools' || !seg.tools) return seg;
      const idx = seg.tools.findIndex(t => t.id === toolId);
      if (idx < 0) return seg;
      const tools = seg.tools.map((tt, i) => i === idx
        ? { ...tt, livePreview: { type, data: this.cloneShallow(state) } }
        : tt);
      return { ...seg, tools };
    });
  }

  /** Applique un patch JSON-simplifié ({op, path, value?}) sur l'état livePreview. */
  private applyLivePreviewPatch(toolId: string, type: LivePreviewType, patch: Array<{ op: string; path: string; value?: any }>): void {
    this.segments = this.segments.map(seg => {
      if (seg.type !== 'tools' || !seg.tools) return seg;
      const idx = seg.tools.findIndex(t => t.id === toolId);
      if (idx < 0) return seg;
      const t = seg.tools[idx];
      const cur = t.livePreview?.data ? this.cloneShallow(t.livePreview.data) : {};
      let next = cur;
      for (const op of patch) {
        next = this.applyJsonPatchOp(next, op);
      }
      const tools = seg.tools.map((tt, i) => i === idx ? { ...tt, livePreview: { type, data: next } } : tt);
      return { ...seg, tools };
    });
  }

  private cloneShallow<T>(v: T): T {
    if (v == null || typeof v !== 'object') return v;
    try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
  }

  private applyJsonPatchOp(state: any, op: { op: string; path: string; value?: any }): any {
    // Support : paths absolus de type /a/b/0 (RFC 6902 simplifié, séparateur '/')
    const path = String(op.path || '');
    if (!path || path === '/') {
      if (op.op === 'replace' || op.op === 'add') return op.value;
      if (op.op === 'remove') return null;
      return state;
    }
    const segments = path.split('/').slice(1).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    // cloner en copiant les branches touchées
    const root = state == null ? (Number.isInteger(parseInt(segments[0], 10)) ? [] : {}) : state;
    const rootCopy = Array.isArray(root) ? [...root] : { ...root };
    let cur: any = rootCopy;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      const nextKey = segments[i + 1];
      let child = cur[key];
      if (child == null) child = Number.isInteger(parseInt(nextKey, 10)) ? [] : {};
      const childCopy = Array.isArray(child) ? [...child] : { ...child };
      cur[key] = childCopy;
      cur = childCopy;
    }
    const lastKey = segments[segments.length - 1];
    if (op.op === 'add' || op.op === 'replace') {
      cur[lastKey] = op.value;
    } else if (op.op === 'remove') {
      if (Array.isArray(cur)) cur.splice(parseInt(lastKey, 10), 1);
      else delete cur[lastKey];
    }
    return rootCopy;
  }

  /** Indique si le tool a une live preview prête à afficher (état non vide). */
  hasLivePreview(t: StreamTool): boolean {
    const lp = t.livePreview;
    if (!lp || !lp.type) return false;
    const d = lp.data;
    if (d == null) return false;
    if (typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0) return false;
    // Cas spécifique : structured nécessite au moins layout
    if (lp.type === 'structured') return !!d.layout;
    // Cas diagram : attend mermaid non vide
    if (lp.type === 'diagram') return typeof d.mermaid === 'string' && d.mermaid.trim().length > 10;
    return true;
  }

  /** Build field list for template: key, label (from argsSchema → META_TOOL_ARG_LABELS → raw key), value */
  getArgsFields(t: StreamTool): { key: string; label: string; value: any }[] {
    // Use parsedArgs (from jsonrepair during building), or final args from tool.end
    let data = t.parsedArgs;
    if (!data && t.args) {
      // For execute_tool, inner args are in t.args.args; for others, top-level
      data = (t.name === 'execute_tool' && t.args.args && typeof t.args.args === 'object')
        ? t.args.args : t.args;
    }
    if (!data || typeof data !== 'object') return [];
    const labelMap = new Map<string, string>();
    // Priority 1: argsSchema from NodeTemplate (execute_tool)
    if (t.argsSchema) {
      for (const f of t.argsSchema) labelMap.set(f.key, f.label);
    }
    // Priority 2: static meta-tool labels
    const metaLabels = META_TOOL_ARG_LABELS[t.name];
    if (metaLabels) {
      for (const [k, label] of Object.entries(metaLabels)) {
        if (!labelMap.has(k)) labelMap.set(k, label);
      }
    }
    return Object.entries(data)
      .filter(([key]) => key !== 'key' && key !== 'credential_id') // skip meta keys for execute_tool
      .map(([key, value]) => ({
        key,
        label: labelMap.get(key) || key,
        value,
      }));
  }

  /** Format arg value for display (no truncation — CSS handles wrapping) */
  formatArgValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  toggleToolExpand(seg: StreamSegment) {
    if (this.expandedTools.has(seg)) this.expandedTools.delete(seg);
    else this.expandedTools.add(seg);
  }

  toggleToolItemExpand(t: StreamTool) {
    if (this.expandedToolItems.has(t.id)) this.expandedToolItems.delete(t.id);
    else this.expandedToolItems.add(t.id);
  }

  toggleRunningArgs(id: string) {
    if (this.runningArgsExpanded.has(id)) this.runningArgsExpanded.delete(id);
    else this.runningArgsExpanded.add(id);
  }

  toggleArgExpand(toolId: string, fieldKey: string) {
    const k = `${toolId}:${fieldKey}`;
    if (this.expandedArgValues.has(k)) this.expandedArgValues.delete(k);
    else this.expandedArgValues.add(k);
  }

  /** Detect user scroll position — disable auto-scroll if user scrolled up */
  onScroll() {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    this._userAtBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < this.SCROLL_THRESHOLD;
  }

  /** Scroll to bottom only if user was already at the bottom */
  private scrollToBottom() {
    if (!this._userAtBottom) return;
    this.applyScrollToBottomWithRetry(6);
  }

  /** Force scroll to bottom (e.g. when sending a new message) */
  private forceScrollToBottom() {
    this._userAtBottom = true;
    this.applyScrollToBottomWithRetry(8);
  }

  /** Public helper for parent views after thread switch. */
  scrollToLatest() {
    this.forceScrollToBottom();
  }

  private applyScrollToBottomWithRetry(retries: number) {
    try {
      const attempt = (remaining: number) => {
        const el = this.scrollContainer?.nativeElement;
        if (el) {
          el.scrollTop = el.scrollHeight;
          this._userAtBottom = true;
          return;
        }
        if (remaining <= 0) return;
        setTimeout(() => attempt(remaining - 1), 16);
      };
      setTimeout(() => attempt(retries), 0);
    } catch {}
  }
}
