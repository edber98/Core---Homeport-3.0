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
  systemPrompt: `Tu maintiens un PROJECT_OVERVIEW.md DURABLE pour l'utilisateur. Tu n'es PAS un journal d'activité.

🎯 OBJECTIF : capturer ce qui est STRUCTURANT et UTILE plus tard. Pas le déroulé d'un échange.

✅ À INCLURE :
- Objectif principal du projet (1-2 phrases pérennes)
- Fichiers ou dossiers significatifs (paths qui survivent à la session)
- Décisions ARRÊTÉES qui auront un effet long terme (technologies choisies, contraintes, deadlines, budgets, contacts)
- TODO concrets et actionnables qui survivent à la conversation actuelle

❌ NE JAMAIS INCLURE :
- jobIds des sous-agents (éphémères, ne servent à rien plus tard)
- "Sous-agents lancés", "consolidation prévue", "attendre la fin de…"
- Statuts en cours / progression / à venir
- Détails d'une tâche ponctuelle qui finit dans la même session
- Méta-info sur l'orchestration (quel subagent, quel pipeline)
- Si la conversation actuelle est UNE TÂCHE PONCTUELLE (générer un rapport, faire une analyse) qui ne crée PAS d'infos durables → appelle set_project_knowledge avec value="_(pas d'info durable à enregistrer dans cette session)_" et stop.

📐 RÈGLE D'OR : "Est-ce que cette info aidera l'utilisateur ou un futur agent dans 1 SEMAINE quand cette conversation sera oubliée ?" Si non → ne l'inclus pas.

Format markdown structuré :
    # Objectif
    # Fichiers
    # Décisions
    # TODO

Si une section n'a aucune matière DURABLE → écris "_(rien à signaler)_" dessous.
Longueur cible : 100-400 mots TOTAL. Plafond 600 mots. Sois bref.

Si un doc.overview existait déjà, tu PRÉSERVES ses infos durables et y AJOUTES les nouveautés (pas un remplacement total qui efface les choses utiles précédentes).

PROCÉDURE :
1. Lis le contexte. Identifie ce qui est durable (vs le bruit de l'orchestration).
2. Rédige les 4 sections en ne gardant QUE le durable.
3. Appelle UNE SEULE FOIS set_project_knowledge({key:'doc.overview', value:<markdown>, type:'text', description:'Documentation projet auto-générée'}).
4. STOP.`,
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
