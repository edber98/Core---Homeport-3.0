import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

/** Readable labels for internal tool names */
const TOOL_LABELS: Record<string, string> = {
  search_tools: 'Recherche d\'outils',
  get_tool_details: 'Détails de l\'outil',
  execute_tool: 'Exécution',
  list_providers: 'Providers disponibles',
  ask_user: 'Question',
  search_workflows: 'Recherche de workflows',
  run_workflow: 'Lancement workflow',
  save_memory: 'Sauvegarde mémoire',
  get_memory: 'Lecture mémoire',
  enrich_context: 'Enrichissement contexte',
  // Workflow tools
  create_flow: 'Création flow',
  list_graph: 'Lecture du graphe',
  get_templates: 'Recherche templates',
  get_template_details: 'Détails template',
  ensure_start: 'Nœud de démarrage',
  add_node: 'Ajout nœud',
  remove_node: 'Suppression nœud',
  replace_node: 'Remplacement nœud',
  connect_nodes: 'Connexion',
  disconnect_nodes: 'Déconnexion',
  connect_by_output_name: 'Connexion par sortie',
  get_output_options: 'Options de sortie',
  set_node_args: 'Configuration args',
  set_node_description: 'Description nœud',
  validate_flow: 'Validation',
  auto_layout: 'Mise en page auto',
  save_flow: 'Sauvegarde flow',
  create_start_form: 'Formulaire de démarrage',
  propose_context_mapping: 'Mapping contextuel',
  // Node args tools
  get_node_schema: 'Schéma du nœud',
  get_node_info: 'Info nœud',
  list_predecessors: 'Nœuds précédents',
  get_predecessor_context: 'Contexte prédécesseur',
  search_predecessors: 'Recherche prédécesseurs',
  get_scenarios: 'Scénarios',
  get_msgin_preview: 'Aperçu msgIn',
  // Form tools
  get_form_schema: 'Schéma formulaire',
  set_form_schema: 'Mise à jour schéma',
  add_field: 'Ajout champ',
  update_field: 'Modification champ',
  remove_field: 'Suppression champ',
  add_section: 'Ajout section',
  reorder_fields: 'Réordonnancement',
  get_field_types: 'Types de champs',
  create_form: 'Création formulaire',
  save_form: 'Sauvegarde formulaire',
  get_output_schema: 'Schéma de sortie',
};

@Component({
  selector: 'ai-tool-trace',
  standalone: true,
  imports: [CommonModule, NzTagModule, NzIconModule, NzToolTipModule],
  template: `
    <div class="trace" [class.running]="running" [class.error]="status === 'error'">
      <span nz-icon [nzType]="icon" nzTheme="outline" [nzSpin]="running"></span>
      <span class="label" nz-tooltip [nzTooltipTitle]="detailsText">{{ displayLabel }}</span>
      <span class="extra" *ngIf="extraInfo">{{ extraInfo }}</span>
      <nz-tag *ngIf="status === 'success'" nzColor="green" class="tag">OK</nz-tag>
      <nz-tag *ngIf="status === 'error'" nzColor="red" class="tag">Erreur</nz-tag>
      <span class="dur" *ngIf="duration">{{ duration }}ms</span>
    </div>
  `,
  styles: [`
    .trace { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; font-size: 12px; color: #666; margin: 2px 0; }
    .trace.running { color: #e61982; border-color: #91caff; background: #e6f4ff; }
    .trace.error { color: #ff4d4f; border-color: #ffa39e; background: #fff2f0; }
    .label { font-weight: 500; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .extra { color: #999; font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dur { color: #999; font-size: 11px; }
    .tag { margin: 0; font-size: 10px; line-height: 14px; height: 16px; padding: 0 4px; }
  `]
})
export class AiToolTraceComponent {
  @Input() name = '';
  @Input() status: 'running' | 'success' | 'error' = 'running';
  @Input() duration?: number;
  @Input() args?: any;
  @Input() result?: any;

  get running() { return this.status === 'running'; }
  get icon() {
    if (this.status === 'success') return 'check-circle';
    if (this.status === 'error') return 'close-circle';
    return 'loading';
  }

  get displayLabel(): string {
    return TOOL_LABELS[this.name] || this.name;
  }

  /** Short contextual info extracted from args */
  get extraInfo(): string {
    if (!this.args) return '';
    // Show the most relevant arg as context
    if (this.name === 'execute_tool' && this.args.key) return this.args.key;
    if (this.name === 'search_tools' && this.args.query) return `"${this.args.query}"`;
    if (this.name === 'get_tool_details' && this.args.key) return this.args.key;
    if (this.name === 'add_node' && this.args.templateKey) return this.args.templateKey;
    if (this.name === 'connect_nodes') return `${this.args.sourceId || '?'} → ${this.args.targetId || '?'}`;
    if (this.name === 'get_templates' && this.args.query) return `"${this.args.query}"`;
    return '';
  }

  get detailsText(): string {
    const parts: string[] = [];
    if (this.name) parts.push(`Tool: ${this.name}`);
    if (this.args) {
      try { parts.push(`Args: ${JSON.stringify(this.args, null, 2)}`); } catch {}
    }
    if (this.result && this.status !== 'running') {
      try {
        const txt = JSON.stringify(this.result, null, 2);
        parts.push(`Result: ${txt.length > 500 ? txt.slice(0, 500) + '...' : txt}`);
      } catch {}
    }
    return parts.join('\n\n');
  }
}
