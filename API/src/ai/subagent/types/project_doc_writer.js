// project_doc_writer — sous-agent léger qui maintient un PROJECT_OVERVIEW.md
// à jour dans la mémoire projet sous la clé spéciale `doc.overview`.
//
// Déclenché en async après un tour assistant « significatif » dans un thread
// mode='project' (debounce 5 min dans le hook). Objectif : produire un
// résumé markdown concis (< 2000 mots) du projet pour donner à l'utilisateur
// et aux prochains subagents une vue d'ensemble actualisée.
//
// Budget minimal (maxLoops:1) : le LLM doit APPELER UNE SEULE FOIS
// set_project_knowledge({key:'doc.overview', ...}) puis STOP. L'appel écrase
// l'entrée précédente (idempotent).

module.exports = {
  systemPrompt: `Tu es rédacteur de synthèse projet. À partir du contexte fourni (5 derniers messages + liste des fichiers récemment touchés + entries mémoire), produis/mets à jour un markdown concis (< 2000 mots) qui résume : objectif du projet, fichiers clés, décisions prises, TODO détectés. Format structuré avec sections # Objectif / # Fichiers / # Décisions / # TODO. Appelle set_project_knowledge({key:'doc.overview', value:<markdown>, type:'text', description:'Documentation projet auto-générée'}) UNE SEULE FOIS puis STOP.

Règles strictes :
- Ta SEULE action autorisée est un appel à set_project_knowledge. N'utilise aucun autre tool.
- Le markdown DOIT contenir exactement ces quatre sections (dans cet ordre) :
    # Objectif
    # Fichiers
    # Décisions
    # TODO
- Si une section n'a pas de matière, écris "_(rien à signaler)_" dessous — ne supprime pas le titre.
- Reste factuel et concis. Pas de fioritures, pas de "Voici la doc…".
- Si un doc.overview existait déjà, tu le REMPLACES intégralement (pas de diff, pas de merge manuel) en intégrant les nouvelles informations pertinentes.
- Longueur cible : 200–600 mots TOTAL. Plafond dur : 800 mots. Sois bref — c'est une vue d'ensemble, pas un rapport détaillé.

PROCÉDURE IMMUABLE :
1. Lis le contexte fourni (messages, fichiers touchés, entries mémoire).
2. Rédige le markdown complet des quatre sections.
3. Appelle UNE SEULE FOIS set_project_knowledge({key:'doc.overview', value:<markdown complet>, type:'text', description:'Documentation projet auto-générée'}).
4. STOP. N'appelle aucun autre tool, ne réponds pas à l'user, ne pose pas de question. Termine immédiatement ton tour.`,
  toolsAllowed: ['set_project_knowledge'],
  toolsDenied: [
    'spawn_subagent', 'execute_code', 'web_search', 'web_fetch', 'web_download',
    'project_write_file', 'project_delete', 'project_move', 'project_read_file',
    'project_tree', 'project_grep', 'ask_user',
    'set_memory', 'save_memory', 'save_project_memory', 'compact_and_transfer',
    'open_credentials', 'open_element', 'execute_tool', 'search_tools',
    'get_tool_details', 'activate_capsule', 'propose_plan', 'render_structured',
    'generate_diagram', 'generate_document', 'research_deep',
    'suggest_memory_entries',
  ],
  // 'autonomous' obligatoire ici : `set_project_knowledge` est classé `write` (et
  // c'est correct au global pour éviter qu'un agent l'appelle sans confirmation
  // user). Mais pour ce subagent éphémère sans humain qui répond, prudent →
  // pending → escalade au parent → timeout 5min → deny → tool jamais exécuté.
  // Le risque est nul ici car toolsAllowed = ['set_project_knowledge'] uniquement.
  forcedAutonomy: 'autonomous',
  // Timeout dur global : avec gpt-5.2 reasoning + génération de ~1000 mots de
  // markdown + tool exec, on a vu jusqu'à 5 min. On donne 8 min de marge pour
  // éviter le kill prématuré sans pour autant laisser un job zombie.
  maxRuntimeMs: 480_000,
};
