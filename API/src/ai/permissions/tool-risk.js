// Tool risk classification
// safe        → read-only / non-destructive lookups
// write       → creates/modifies data (reversible)
// destructive → deletes / moves / overwrites (hard to reverse)
// elevated    → spawns processes, executes code, deep recursive research
//
// Extend TOOL_RISK when adding new primitive tools. For dynamic NodeTemplates
// exposed via execute_tool, we fall back to template.metadata.risk → default 'write'.

const TOOL_RISK = {
  // ── project_* filesystem reads ──
  project_list_dir:     'safe',
  project_tree:         'safe',
  project_read_file:    'safe',
  project_read_batch:   'safe',
  project_grep:         'safe',
  project_search:       'safe',
  project_refresh_tree: 'safe',
  project_stage_for_sandbox: 'safe',

  // ── web / generic reads ──
  web_search:           'safe',
  web_fetch:            'safe',
  read_file:            'safe',
  search_manual:        'safe',
  get_manual_section:   'safe',
  search_tools:         'safe',
  get_tool_details:     'safe',
  render_html_preview:  'safe',
  get_project_knowledge: 'safe',
  // Lectures de mémoire (user et projet) : aucun effet de bord, juste lecture
  get_memory: 'safe',
  get_project_memory: 'safe',
  // suggest_memory_entries = écrit juste des entries 'pending' (validées par l'user
  // avant de devenir effectives) → classé safe pour ne PAS déclencher la gate de
  // permission (le memory_extractor tourne en autonomy 'prudent' avec parent
  // éphémère qui ne peut pas répondre à une demande de permission → deadlock 5 min).
  suggest_memory_entries: 'safe',
  render_interactive_canvas: 'safe',
  // Tools de display / planning / orchestration : pas d'action sur des fichiers
  // ou systèmes externes, juste de l'affichage UI inline. Doivent rester safe
  // pour ne pas bloquer les subagents en autonomy 'prudent'.
  propose_plan: 'safe',
  render_structured: 'safe',
  generate_diagram: 'safe',
  ask_user: 'safe',
  enrich_context: 'safe',
  // activate_capsule = juste élargir le toolset disponible (pas d'action externe)
  activate_capsule: 'safe',

  // ── writes (create / edit / sync) ──
  project_write_file:    'write',
  project_create_folder: 'write',
  project_sync_remote:   'write',
  generate_document:     'write',
  edit_document:         'write',
  build_website:         'write',
  save_memory:           'write',
  save_project_memory:   'write',
  set_project_knowledge: 'write',

  // ── destructive ──
  project_delete: 'destructive',
  project_move:   'destructive',

  // ── elevated ──
  spawn_subagent:  'elevated',
  execute_code:    'elevated',
  research_deep:   'elevated',
  install_package: 'elevated',
  display_image:   'safe',
  display_file:    'safe',
};

/**
 * Resolve the risk level of a tool call.
 *
 * @param {string} toolName
 * @param {object} toolArgs
 * @param {Map} [templatesCache] - Optional Map<key, NodeTemplate> for execute_tool resolution
 * @returns {'safe'|'write'|'destructive'|'elevated'}
 */
function resolveToolRisk(toolName, toolArgs, templatesCache) {
  if (TOOL_RISK[toolName]) return TOOL_RISK[toolName];

  // execute_tool → inspect underlying NodeTemplate
  if (toolName === 'execute_tool') {
    const key = toolArgs?.tool_key || toolArgs?.key;
    if (key && templatesCache && typeof templatesCache.get === 'function') {
      const tpl = templatesCache.get(key);
      const risk = tpl?.metadata?.risk;
      if (risk && TOOL_RISK[risk] === undefined) {
        // risk is a level string
        if (['safe', 'write', 'destructive', 'elevated'].includes(risk)) return risk;
      }
      if (risk && ['safe', 'write', 'destructive', 'elevated'].includes(risk)) return risk;
    }
    return 'write';
  }

  // MCP and unknown tools default to write
  return 'write';
}

module.exports = { TOOL_RISK, resolveToolRisk };
