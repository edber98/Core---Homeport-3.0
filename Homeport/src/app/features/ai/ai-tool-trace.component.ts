import { ChangeDetectionStrategy, Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';

/** Readable labels for internal tool names */
const TOOL_LABELS: Record<string, string> = {
  search_tools: "Recherche d'outils",
  get_tool_details: "Détails de l'outil",
  execute_tool: 'Exécution',
  list_providers: 'Providers disponibles',
  ask_user: 'Question',
  search_workflows: 'Recherche de workflows',
  run_workflow: 'Lancement workflow',
  save_memory: 'Sauvegarde mémoire',
  get_memory: 'Lecture mémoire',
  save_project_memory: 'Mémoire projet',
  get_project_memory: 'Mémoire projet',
  set_project_knowledge: 'Mise à jour mémoire projet',
  get_project_knowledge: 'Mémoire projet',
  enrich_context: 'Enrichissement contexte',
  propose_plan: "Plan d'action",
  generate_diagram: 'Diagramme',
  project_list_dir: 'Liste dossier', project_tree: 'Arborescence',
  project_read_file: 'Lecture fichier', project_read_batch: 'Lecture multiple',
  project_grep: 'Recherche texte', project_search: 'Recherche fichiers',
  project_write_file: 'Écriture fichier', project_create_folder: 'Création dossier',
  project_delete: 'Suppression', project_move: 'Déplacement',
  project_refresh_tree: 'Actualisation arbo', project_sync_remote: 'Sync distant',
  project_stage_for_sandbox: 'Préparation sandbox',
  web_search: 'Recherche web', web_fetch: 'Lecture page', research_deep: 'Recherche approfondie',
  web_download: 'Téléchargement',
  execute_code: 'Exécution code', prepare_code_environment: 'Préparation env',
  spawn_subagent: 'Sous-agent',
  send_message_to_agent: 'Message au sous-agent',
  install_package: 'Installation package',
  display_image: 'Image affichée', display_file: 'Fichier affiché',
  render_interactive_canvas: 'Canvas interactif',
  skill_list: 'Liste skills', skill_get: 'Détails skill', skill_execute: 'Exécution skill',
  generate_document: 'Génération document', edit_document: 'Édition document',
  render_html_preview: 'Aperçu HTML', build_website: 'Site web',
  render_structured: 'Affichage structuré',
  // Workflow tools
  create_flow: 'Création flow', list_graph: 'Lecture graphe',
  get_templates: 'Templates', get_template_details: 'Détails template',
  ensure_start: 'Nœud de démarrage', add_node: 'Ajout nœud',
  remove_node: 'Suppression nœud', replace_node: 'Remplacement',
  connect_nodes: 'Connexion', disconnect_nodes: 'Déconnexion',
  connect_by_output_name: 'Connexion sortie', get_output_options: 'Options sortie',
  set_node_args: 'Config args', set_node_description: 'Description nœud',
  validate_flow: 'Validation', auto_layout: 'Mise en page',
  save_flow: 'Sauvegarde', create_start_form: 'Formulaire',
  propose_context_mapping: 'Mapping contexte',
  get_node_schema: 'Schéma nœud', get_node_info: 'Info nœud',
  list_predecessors: 'Prédécesseurs', get_predecessor_context: 'Contexte prédécesseur',
  search_predecessors: 'Recherche prédécesseurs', get_scenarios: 'Scénarios',
  get_msgin_preview: 'Aperçu msgIn',
  get_form_schema: 'Schéma form', set_form_schema: 'Mise à jour schéma',
  add_field: 'Ajout champ', update_field: 'Modif champ',
  remove_field: 'Suppr. champ', add_section: 'Ajout section',
  reorder_fields: 'Réordre', get_field_types: 'Types de champs',
  create_form: 'Création form', save_form: 'Sauvegarde form',
  get_output_schema: 'Schéma sortie',
};

/** Map tool name → compact icon (ant-design) */
const TOOL_ICONS: Record<string, string> = {
  web_search: 'search', web_fetch: 'global', research_deep: 'experiment', web_download: 'cloud-download',
  execute_code: 'code', install_package: 'appstore-add', prepare_code_environment: 'tool',
  project_read_file: 'file-text', project_read_batch: 'file-text', project_write_file: 'edit',
  project_list_dir: 'folder', project_tree: 'apartment', project_grep: 'file-search',
  project_search: 'search', project_delete: 'delete', project_move: 'drag',
  project_create_folder: 'folder-add', project_stage_for_sandbox: 'container',
  spawn_subagent: 'team', send_message_to_agent: 'message',
  display_image: 'picture', display_file: 'file-done',
  render_interactive_canvas: 'layout', render_structured: 'table',
  generate_diagram: 'partition', generate_document: 'file-word',
  ask_user: 'question-circle', propose_plan: 'compass',
  save_memory: 'save', get_memory: 'database',
  save_project_memory: 'book', get_project_memory: 'book',
  set_project_knowledge: 'book', get_project_knowledge: 'book',
  enrich_context: 'thunderbolt',
  skill_list: 'appstore', skill_get: 'appstore', skill_execute: 'thunderbolt',
  execute_tool: 'play-circle', search_tools: 'search',
  add_node: 'plus-square', remove_node: 'minus-square',
  connect_nodes: 'link', disconnect_nodes: 'disconnect',
  validate_flow: 'check-square', save_flow: 'save',
  create_flow: 'plus', list_graph: 'branches',
};

/**
 * Trace compacte d'un tool call : 1 ligne dense et scannable.
 *
 * État visuel :
 * - running : spinner rose, fond blanc avec bordure rose
 * - success : checkmark discret, texte neutre, fond transparent
 * - error   : icône rouge, fond rose très clair
 *
 * Clic → expand panel avec args + result formatés.
 */
@Component({
  selector: 'ai-tool-trace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule],
  template: `
    <div class="trace" [class.running]="running" [class.error]="status === 'error'" [class.expanded]="expanded()">
      <button type="button" class="trace-head" (click)="toggleExpand($event)">
        <span class="ico" [class.spin]="running">
          <span nz-icon [nzType]="iconFor()" nzTheme="outline"></span>
        </span>
        <span class="label">{{ displayLabel }}</span>
        <span class="hint" *ngIf="contextHint()">{{ contextHint() }}</span>
        <span class="meta" *ngIf="!running">
          <span class="dur" *ngIf="duration">{{ formatDuration(duration) }}</span>
          <span *ngIf="resultBadge()" class="badge" [class.badge-err]="status === 'error'">{{ resultBadge() }}</span>
        </span>
        <span class="chev" *ngIf="!running">
          <span nz-icon [nzType]="expanded() ? 'up' : 'down'" nzTheme="outline"></span>
        </span>
      </button>
      <div class="trace-body" *ngIf="expanded()">
        <div class="kv" *ngIf="args">
          <div class="k">Arguments</div>
          <pre class="v">{{ formatJson(args) }}</pre>
        </div>
        <div class="kv" *ngIf="result != null">
          <div class="k">Résultat</div>
          <pre class="v">{{ formatJson(result) }}</pre>
        </div>
        <div class="kv" *ngIf="!args && result == null"><div class="v empty">(aucun argument ni résultat)</div></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .trace {
      display: block;
      margin: 2px 0;
      border-radius: 8px;
      background: transparent;
      transition: background .12s;
    }
    .trace.expanded { background: #fafafa; border: 1px solid #f0f0f0; }
    .trace.running { background: #fff5fa; border: 1px solid #ffd6e7; }
    .trace.error { background: #fff2f0; border: 1px solid #ffccc7; }

    .trace-head {
      width: 100%;
      display: flex; align-items: center; gap: 8px;
      padding: 4px 10px;
      background: transparent;
      border: 0;
      cursor: pointer;
      font-size: 12px;
      color: #595959;
      text-align: left;
      border-radius: 8px;
      transition: color .12s;
    }
    .trace-head:hover { color: #e61982; }
    .trace.running .trace-head { color: #e61982; font-weight: 500; }
    .trace.error .trace-head { color: #cf1322; }

    .ico {
      flex: 0 0 auto;
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px;
      font-size: 12px;
      color: #bfbfbf;
    }
    .trace-head:hover .ico { color: #e61982; }
    .trace.running .ico { color: #e61982; }
    .trace.error .ico { color: #cf1322; }
    .ico.spin [nz-icon] { animation: traceSpin 1.2s linear infinite; }
    @keyframes traceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .label {
      flex: 0 0 auto;
      font-weight: 500;
      max-width: 220px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hint {
      flex: 1;
      min-width: 0;
      color: #8c8c8c;
      font-size: 11px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
    }
    .meta {
      flex: 0 0 auto;
      display: inline-flex; align-items: center; gap: 6px;
      color: #bfbfbf;
      font-size: 11px;
    }
    .dur { font-variant-numeric: tabular-nums; }
    .badge {
      display: inline-flex; align-items: center; gap: 2px;
      padding: 0 5px; border-radius: 3px;
      background: #f0f0f0;
      color: #595959;
      font-size: 10px; font-weight: 600;
      line-height: 14px;
    }
    .badge-err { background: #ffebe6; color: #cf1322; }
    .chev { color: #d9d9d9; font-size: 10px; flex: 0 0 auto; }
    .trace-head:hover .chev { color: #e61982; }

    .trace-body {
      padding: 4px 10px 10px;
      animation: traceBodyIn 160ms ease-out;
    }
    @keyframes traceBodyIn {
      from { opacity: 0; max-height: 0; }
      to   { opacity: 1; max-height: 600px; }
    }
    .kv { margin-top: 6px; }
    .k {
      font-size: 10px; font-weight: 600; color: #8c8c8c;
      text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 3px;
    }
    .v {
      margin: 0;
      font-size: 11px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      background: #fff;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #f0f0f0;
      max-height: 240px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      color: #262626;
    }
    .v.empty { background: transparent; border: 0; color: #bfbfbf; font-style: italic; padding: 4px 0; }
  `],
})
export class AiToolTraceComponent {
  @Input() name = '';
  @Input() status: 'running' | 'success' | 'error' = 'running';
  @Input() duration?: number;
  @Input() args?: any;
  @Input() result?: any;

  expanded = signal(false);

  get running() { return this.status === 'running'; }

  get displayLabel(): string {
    return TOOL_LABELS[this.name] || this.name;
  }

  iconFor(): string {
    return TOOL_ICONS[this.name] || 'api';
  }

  /** Hint contextuel court à partir des arguments (requête, path, etc.). */
  contextHint = computed(() => {
    const a: any = this.args;
    if (!a) return '';
    if (typeof a === 'string') return a.slice(0, 80);
    if (a.query) return `"${String(a.query).slice(0, 60)}"`;
    if (a.url) return String(a.url).replace(/^https?:\/\//, '').slice(0, 60);
    if (a.path) return String(a.path).slice(0, 60);
    if (a.fileId) return a.fileId;
    if (a.key) return a.key;
    if (a.subagent_type) return a.subagent_type;
    if (a.templateKey) return a.templateKey;
    if (a.to) return a.to;
    if (a.language && a.code) return `${a.language} (${String(a.code).length} chars)`;
    return '';
  });

  /** Résumé du résultat si disponible (ex: "3 items", "✓ file created"). */
  resultBadge = computed(() => {
    const r: any = this.result;
    if (!r) return '';
    if (this.status === 'error') return 'Erreur';
    if (typeof r === 'object') {
      if (r.ok === false) return 'Erreur';
      if (Array.isArray(r)) return `${r.length} résultats`;
      if (Array.isArray(r.results)) return `${r.results.length} résultats`;
      if (Array.isArray(r.items)) return `${r.items.length} items`;
      if (r.count != null) return `${r.count}`;
      if (r.fileId) return '📎';
      if (r.ok) return '';
    }
    return '';
  });

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
    const min = Math.floor(ms / 60_000);
    const sec = Math.round((ms % 60_000) / 1000);
    return sec ? `${min}m${sec}s` : `${min}m`;
  }

  formatJson(v: any): string {
    try {
      const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
      return s.length > 4000 ? s.slice(0, 4000) + '\n… (tronqué)' : s;
    } catch {
      return String(v);
    }
  }

  toggleExpand(event: Event) {
    if (this.running) return;
    event.stopPropagation();
    this.expanded.update(v => !v);
  }
}
