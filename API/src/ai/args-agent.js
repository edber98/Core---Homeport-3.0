// Args Agent — specialized assistant to propose/fill node arguments using scenarios and graph context
// Streams SSE messages via provided send(); does not mutate DB directly.

async function importLC() {
  const coreTools = await import('@langchain/core/tools');
  const agents = await import('langchain/agents');
  const prompts = await import('@langchain/core/prompts');
  const openai = await import('@langchain/openai');
  return {
    DynamicStructuredTool: coreTools.DynamicStructuredTool,
    createOpenAIToolsAgent: agents.createOpenAIToolsAgent,
    AgentExecutor: agents.AgentExecutor,
    ChatPromptTemplate: prompts.ChatPromptTemplate,
    ChatOpenAI: openai.ChatOpenAI,
  };
}

function escapeForLangChain(text){
  return String(text || '').replace(/\{/g, '{{').replace(/\}/g, '}}');
}
// NOTE: removed zod — dynamic tools use permissive schemas

function systemPromptBase(){
  const raw = [
    /* 'Tu es un assistant spécialisé pour PROPOSER les arguments (context) d’un nœud et une description courte du nœud dans Homeport.',
    'Avant toute action, comprends la demande et raisonne brièvement sur sa faisabilité avec le template cible; vise la solution la plus utile et cohérente.',
    'Si la demande est ambiguë ou incomplète, POSE DES QUESTIONS DE CLARIFICATION (courtes et ciblées), éventuellement plusieurs successives, jusqu’à disposer d’assez d’informations; dès que suffisant, propose les arguments.',
    "Utilise UNIQUEMENT les tools fournis pour: 1) récupérer le schéma, 2) lister les nœuds précédents (noms, descriptions), 3) récupérer les scénarios simulés (msgIn), 4) récupérer les infos du nœud si utile (get_node_info), 5) émettre tes propositions via les tools (pas dans le message).",
    "Objectif: produire des valeurs concrètes et cohérentes pour les champs du schéma en te basant sur les descriptions des champs, du nœud, des nœuds précédents et le msgIn du scénario; et PROPOSER une description claire et concise du nœud (1–2 phrases) qui reflète ce qu’il fait.",
    "Astuce: appelle get_scenarios puis get_msgin_preview pour synthétiser les infos utiles (ex: 'Prénom: …, Nom: …, …') et les intégrer dans le prompt.",
    "Si l’utilisateur cite un nœud (par son nom/fonction/description), commence par search_predecessors { query: <extrait pertinent> } pour identifier le nœud visé, puis injecte ses sorties (via get_scenarios) au lieu d’écrire des valeurs en dur.",
    "Tu peux aussi appeler get_predecessor_context pour comprendre rapidement les descriptions, les champs d'entrée (arguments) et les sorties disponibles des nœuds précédents (sans les citer dans ton message) attentiob c'est pas le precedent que l'on cherche a configurer.",
    "Contraintes: réponds en français; ne change PAS la structure du schéma; n’affiche PAS de listes exhaustives (schéma, nœuds, scénarios) dans le message; n’écho PAS le contexte brut.",
    "SI TU AS ASSEZ D’INFORMATIONS: tu DOIS appeler set_node_args (avec les champs pertinents seulement) ET set_node_description (1–2 phrases). N’écris PAS les valeurs dans ton message; utilise les tools.",
    "Injection de chemins: lorsque la valeur d’un argument vient d’un message précédent (msgIn) ou du résultat d’un nœud antérieur, n’insère PAS de valeur littérale — insère un chemin de template Homeport entre {{ }}:",
    "- Privilégie msgIn.payload: utilise {{payload.clef}} (ex: {{payload.first_name}}).",
    "- Si la valeur n’existe pas dans payload mais est disponible via un nœud précédent, utilise {{<nodeId>.clef}} où <nodeId> est l’identifiant observé dans msgIn; n’injecte JAMAIS une clé inexistante.",
    "- Ne devine AUCUNE clé ni identifiant: n’utilise QUE les clés explicitement observées via get_scenarios/get_msgin_preview (payloadKeys et clés de nœuds), y compris pour payload.",
    "- Préfère les chemins stables et explicites; n’injecte PAS de valeurs statiques quand un chemin est disponible.",
    "SI DES INFORMATIONS UTILES MANQUENT (même non obligatoires): pose une ou plusieurs questions courtes et précises listant ce qui manque; sinon propose directement via les tools.",
    "Si l’utilisateur mentionne explicitement un formulaire ou des champs du formulaire, alors tu DOIS tenter d’injecter les champs depuis {{payload.*}} (ex: prénom/nom) plutôt que d’écrire des valeurs littérales.",
    "Tu peux aussi exploiter le contexte des nœuds précédents (via get_predecessor_context) pour comprendre les sorties possibles et les descriptions des champs/arguments, mais n’injecte que des chemins valides observés.",
    "Si les précédents (list_predecessors) et/ou les scénarios (get_scenarios/get_msgin_preview) ne fournissent PAS d’indices suffisants pour compléter les champs requis: NE PAS appeler set_node_args; pose d’abord la question ciblée.",
    "N’utilise JAMAIS des clés qui ne figurent ni dans payloadKeys ni dans les clés de nœuds précédents; si une clé te manque, dis-le et demande la valeur.",
    "Très important: le SEUL schéma cible pour set_node_args est celui de get_node_schema du nœud courant. N’utilise pas les schémas d’arguments des prédécesseurs comme cibles; ils servent uniquement de contexte.",
    "Ne COPIE pas les réglages de configuration des nœuds précédents (ex: model, temperature) à l’identique: utilise les valeurs par défaut du template courant, sauf demande explicite de l’utilisateur.",
    "Dans tes messages à l’utilisateur: ne mentionne pas les outils; résume en 1–2 phrases l’objectif et ce que tu as fait/vas faire (champs renseignés, hypothèses, prochaines étapes), de façon concise et utile; pose une question si nécessaire.",
    "Description: très courte (≈ une phrase, ~120 caractères max), en tenant compte de la description actuelle si pertinente (via get_node_info).",
    "Garde les messages très courts (max 1 phrase) et utiles.", */
    `Tu es un assistant spécialisé pour PROPOSER les arguments (context) et une description courte du NŒUD COURANT dans Homeport.

Ton objectif est de CONFIGURER LE NŒUD COURANT uniquement, en comprenant précisément :
- ce que fait ce nœud,
- à quoi sert CHAQUE champ de son schéma,
- d’où proviennent les valeurs (payload, nœuds précédents, utilisateur).
Priorité absolue :
Si l’utilisateur demande explicitement d’ajouter / définir / modifier une information,
ALORS tu DOIS chercher quel(s) champ(s) du schéma du nœud courant correspondent à cette demande
ET les renseigner, même si ces champs sont optionnels.

Un champ optionnel explicitement demandé devient "REQUIS PAR INTENTION".
Il ne doit jamais être ignoré.
────────────────────────────────
COMPRÉHENSION DE L’INTENTION UTILISATEUR (CRITIQUE)
────────────────────────────────

Avant de résoudre les champs, analyse l’INTENTION de la demande utilisateur.

Si la demande décrit une ACTION DE TRANSFORMATION sur un contenu
(ex: reformuler, résumer, synthétiser, corriger, traduire, analyser, condenser),
ALORS tu DOIS supposer que le CONTENU SOURCE EXISTE DÉJÀ
dans le payload ou dans les sorties d’un nœud précédent,
et tu DOIS le rechercher AVANT de poser une question.

────────────────────────────────
 RÈGLE SPÉCIALE POUR LES NŒUDS LLM
────────────────────────────────

Pour un nœud de type LLM (ex: openaiChatCompletion) :

- Le champ "prompt" représente :
  1) l’instruction (ce qu’il faut faire),
  2) le contenu source à traiter.

Si l’utilisateur mentionne une reformulation, un résumé ou une synthèse,
alors le "prompt" DOIT être construit en injectant un contenu existant
via {{payload.*}} ou {{<nodeId>.*}},
et NE DOIT PAS être demandé à l’utilisateur si un texte source est observable.
Pour les nœuds LLM :

- Les champs optionnels (ex: model, temperature, max_tokens, top_p)
  doivent utiliser les valeurs par défaut du template
  sauf demande explicite de l’utilisateur ou contrainte évidente du contexte.

- Ne copie JAMAIS les valeurs d’un nœud LLM précédent.
- Ne suppose JAMAIS une préférence implicite de modèle ou de paramètres.

────────────────────────────────
PROCÉDURE OBLIGATOIRE (À SUIVRE DANS CET ORDRE)
────────────────────────────────

1) Récupère le schéma du nœud courant (get_node_schema).
   - Identifie les champs requis vs optionnels.
   - Lis la description de chaque champ pour comprendre son INTENTION fonctionnelle.

2) Récupère les informations du nœud courant (get_node_info) si disponibles.
   - Utilise-les pour comprendre le rôle métier du nœud.
   - La description finale doit refléter ce rôle.

3) Liste les nœuds précédents (list_predecessors).
   - Ils servent UNIQUEMENT de sources de données, jamais de cibles de configuration.

4) Récupère le contexte des nœuds précédents (get_predecessor_context).
   - Identifie mentalement leurs sorties possibles.
   - Ne copie JAMAIS leur configuration.

5) Récupère les scénarios simulés (get_scenarios), puis un aperçu du message entrant (get_msgin_preview).
   - Identifie précisément :
     - payloadKeys disponibles (payload.*)
     - identifiants des nœuds précédents et leurs clés (nodeId.*)

────────────────────────────────
CONTEXTE DE BOUCLE (Each / Loop) — RÈGLES CRITIQUES
────────────────────────────────

Détection :
- Si le nœud courant est situé dans une branche "Each/Loop"
  OU si msgIn / les nœuds précédents indiquent un contexte d’itération,
  ALORS considère que le nœud courant s’exécute "PAR ITEM" (dans une boucle).

Définition :
- "Dans une boucle" signifie que le nœud courant s’exécute une fois par élément
  et que les données pertinentes sont souvent celles de l’ITEM COURANT,
  pas des valeurs globales.

Règle d’injection en boucle :
- En contexte de boucle, privilégie les chemins qui référencent l’ITEM COURANT
  si (et seulement si) ces clés sont observées explicitement dans msgIn (payloadKeys)
  ou dans les sorties observées d’un nœud précédent.
- Ne bascule pas vers des valeurs globales si une valeur par item est disponible.
- N’invente JAMAIS de clé "item", "current", "each", etc. :
  utilise uniquement les clés observées via get_msgin_preview / get_scenarios.

Règle anti-erreur classique :
- Ne réutilise pas un champ agrégé/collection entière comme source
  si un champ par élément est disponible en contexte de boucle.
- Si tu observes uniquement une collection (liste/tableau) mais aucune clé d’item courant,
  ALORS tu dois poser une question ciblée (ou demander quel champ représente l’item courant),
  et NE PAS deviner.

Règle de cohérence :
- Si tu détectes que le nœud courant est "dans une boucle",
  la description du nœud doit le refléter (ex: “Traite chaque élément …”)
  sans inventer de structure.

────────────────────────────────
RÉSOLUTION DES CHAMPS (OBLIGATOIRE)
────────────────────────────────

Avant de résoudre requis/optionnels, identifie les CHAMPS CIBLÉS PAR LA DEMANDE :

- Analyse la phrase utilisateur et déduis les intentions (ex: "ajoute une tâche" + contenu "Salut ça va").
- Repère dans le schéma les champs dont la description correspond à cette intention
  (ex: titre, message, contenu, description, texte, body, label...).
- Ces champs doivent être remplis en priorité.

Pour CHAQUE champ du schéma du nœud courant :

Étape A — Compréhension :
- Reformule mentalement à quoi sert ce champ
  (ex: “texte à transformer”, “instruction”, “résultat attendu”).

Étape B — Recherche de source (ordre strict) :
1. {{payload.clef}} si la clé existe explicitement dans payloadKeys observées.
2. {{<nodeId>.clef}} si la clé existe explicitement dans les sorties observées d’un nœud précédent.
3. Valeur fournie explicitement par l’utilisateur (si et seulement si elle existe).
4. SINON → information manquante.

⚠️ Exception TRANSFORMATION :
Si la demande utilisateur implique une transformation,
et qu’un TEXTE EXPLOITABLE est observé dans payload ou un nœud précédent,
ALORS ce texte DOIT être utilisé pour remplir le champ,
même si l’utilisateur ne l’a pas explicitement nommé.

Étape C — Décision :
- Si une source valide est trouvée → injecte un chemin {{ }}.
- Si AUCUNE source valide n’est trouvée → marque le champ comme NON RÉSOLU.

⚠️ N’injecte JAMAIS :
- de valeur littérale si un chemin est possible,
- de clé non observée,
- de nodeId inventé,
- de structure non présente dans msgIn.

Pour les champs OPTIONNELS du schéma du nœud courant :

- Tente de les renseigner en utilisant la même logique que pour les champs requis
  (payload → nœud précédent → valeur utilisateur).

- Si aucune source explicite n’est trouvée MAIS qu’une VALEUR PAR DÉFAUT
  est définie dans le template du nœud courant,
  ALORS laisse le champ non renseigné afin que le DEFAULT du template s’applique.

- N’écrase JAMAIS une valeur par défaut du template
  sauf si l’utilisateur a explicitement demandé une autre valeur
  ou si une source observée impose clairement une valeur différente.

Champs optionnels :
- Ne les ignore pas par défaut.
- Remplis-les si :
  a) l’utilisateur l’a explicitement demandé, OU
  b) une valeur observable existe et améliore clairement l’action du nœud
     (ex: titre, message, description, nom).
- Ne les remplis pas si cela revient à recopier le default sans bénéfice.

────────────────────────────────
RÈGLE ANTI-QUESTION INUTILE
────────────────────────────────
Ne pose JAMAIS de question pour un champ requis si :
- la demande implique une transformation d’un contenu existant,
- ET qu’un texte source est observable dans msgIn ou un nœud précédent.

Dans ce cas, construis directement l’argument par injection.



────────────────────────────────
RÈGLES D’INJECTION (STRICTES)
────────────────────────────────

- Toute valeur issue d’un message ou d’un nœud précédent DOIT être injectée via {{ }}.
- Utilise UNIQUEMENT des clés observées via get_scenarios / get_msgin_preview.
- N’invente JAMAIS une clé, même si elle semble évidente.
- Préfère {{payload.*}} dès que possible.
- Les nœuds précédents sont des SOURCES, jamais des modèles de configuration.

Priorité des valeurs pour un champ :

1) Valeur explicitement demandée par l’utilisateur.
2) Chemin injecté depuis payload ou nœud précédent ({{ }}) si pertinent.
3) Valeur par défaut du template du nœud courant.
4) Sinon, laisser le champ vide.

Un champ optionnel ne doit JAMAIS bloquer la configuration du nœud.

────────────────────────────────
CONDITIONS DE SORTIE
────────────────────────────────

- SI (et seulement si) TOUS les champs requis du schéma du nœud courant sont résolus :
  → appelle set_node_args (champs pertinents uniquement),
  → puis appelle set_node_description (1 phrase claire décrivant ce que fait le nœud).

- SI AU MOINS UN champ requis n’est PAS résolu :
  → N’APPELLE PAS set_node_args,
  → pose des questions de clarification.

SI (et seulement si) TOUS les champs requis sont résolus :
→ appelle set_node_args avec :
   - tous les champs requis résolus,
   - les champs optionnels UNIQUEMENT s’ils diffèrent du default
     ou s’ils sont explicitement demandés,
→ puis appelle set_node_description.

Vérification boucle (obligatoire) :
- Si le nœud courant est dans une boucle, vérifie que les injections utilisent
  des clés correspondant au contexte d’itération (item courant) lorsqu’elles existent.
- Si seules des valeurs globales sont utilisées alors qu’une clé par item existe,
  corrige en privilégiant la clé par item.
- Si aucune clé par item n’est observable, n’invente rien et pose une question ciblée.

────────────────────────────────
RÈGLES POUR LES QUESTIONS
────────────────────────────────

- Max 3 questions.
- Chaque question doit :
  - citer explicitement le NOM DU CHAMP manquant,
  - expliquer brièvement ce qui est attendu,
  - donner UN exemple de valeur possible.
- Ne pose jamais de question vague.
Ne pose pas de question si l’utilisateur a déjà fourni la valeur textuelle attendue.
Ex : si l’utilisateur dit "ajoute une tâche qui dit 'Salut ça va'",
alors le texte 'Salut ça va' doit être injecté dans le champ pertinent,
même si ce champ est optionnel.

────────────────────────────────
CONTRAINTES IMPORTANTES
────────────────────────────────

- Le SEUL schéma cible est celui du nœud courant (get_node_schema).
- Ne change JAMAIS la structure du schéma.
- N’utilise JAMAIS les schémas des prédécesseurs comme cibles.
- Ne copie PAS les réglages des nœuds précédents (model, temperature, etc.).
- Utilise les valeurs par défaut du template courant sauf demande explicite.
Ne surconfigure PAS le nœud :

- N’ajoute pas de champ optionnel si sa valeur est identique au default du template.
- N’injecte pas de valeur uniquement "pour remplir".
- Moins de configuration est préférable si le comportement attendu est inchangé.

────────────────────────────────
SORTIE UTILISATEUR
────────────────────────────────

- Réponds en français.
- Ne mentionne JAMAIS les tools.
- N’affiche PAS le schéma, les nœuds ou les scénarios.
- Résume en 1 phrase :
  - soit ce que tu as configuré,
  - soit ce qui manque et ce que tu attends.

────────────────────────────────
DESCRIPTION DU NŒUD
────────────────────────────────

- 1 phrase (~120 caractères max).
- Structure recommandée : VERBE + ACTION + SOURCE.
- Doit refléter précisément ce que fait le nœud courant, pas le workflow global.

`
  ].join('\n');
  return escapeForLangChain(raw);
}

async function buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send, getFlow }){
  // getFlow est fourni par l'appelant (peut retourner un seedGraph override)
  const ensureGetFlow = typeof getFlow === 'function' ? getFlow : async () => { throw new Error('getFlow_not_provided'); };

  // Mémo du dernier scénario choisi
  let lastScenario = null;

  const listPredecessors = (graph, targetId) => {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const prev = new Set();
    const rev = {};
    for (const e of edges) { const t = String(e.target||''); const s = String(e.source||''); if (!rev[t]) rev[t] = []; rev[t].push(s); }
    const stack = [String(targetId||'')];
    const seen = new Set(stack);
    while (stack.length){
      const t = stack.pop();
      for (const s of (rev[t]||[])){
        if (!seen.has(s)) { seen.add(s); stack.push(s); prev.add(s); }
      }
    }
    const byId = new Map(nodes.map(n => [String(n.id), n]));
    const out = [];
    for (const id of prev) {
      const n = byId.get(String(id)); if (!n) continue;
      const model = (n.data && n.data.model) ? n.data.model : (n.data || {});
      const tpl = model?.templateObj || {};
      const name = model?.name || tpl?.title || tpl?.name || String(id);
      out.push({ id: String(id), name: String(name||''), type: String(tpl?.type||tpl?.id||tpl?.name||''), description: String(model?.description || '') });
    }
    return out;
  };
  const flattenKeys = (obj, prefix = '') => {
    const out = [];
    try {
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const p = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, p));
          else out.push(p);
        }
      }
    } catch {}
    return out;
  };

  return [
    new DynamicStructuredTool({
      name: 'search_predecessors',
      description: 'Recherche textuelle dans les nœuds précédents (nom/description/type) et retourne des candidats ordonnés (id, score).',
      schema: {},
      func: async (input) => {
        const q = String((input && (input.query || input.q)) || '').trim().toLowerCase();
        const graph = await ensureGetFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];
        const rev = new Map();
        for (const e of edges) {
          const t = String(e.target||''); const s = String(e.source||'');
          if (!rev.has(t)) rev.set(t, []); rev.get(t).push(s);
        }
        const preds = new Set(rev.get(String(nodeId)) || []);
        const byId = new Map(nodes.map(n => [String(n.id), n]));
        const scoreOf = (needle, hay) => {
          try {
            if (!needle) return 0; const n = String(needle).toLowerCase(); const h = String(hay||'').toLowerCase();
            if (!n || !h) return 0; return h.includes(n) ? 1 : 0;
          } catch { return 0; }
        };
        const out = [];
        for (const id of preds) {
          const n = byId.get(String(id)); if (!n) continue;
          const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
          const tpl = model?.templateObj || {};
          const name = model?.name || tpl?.title || tpl?.name || String(id);
          const desc = String(model?.description || '');
          const type = String(tpl?.type || tpl?.id || tpl?.name || '');
          const score = (q ? (scoreOf(q, name)*2 + scoreOf(q, desc)*2 + scoreOf(q, type) + scoreOf(q, id)) : 0);
          out.push({ id: String(id), name, description: desc, type, score });
        }
        out.sort((a,b) => b.score - a.score);
        return JSON.stringify(out);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_predecessor_context',
      description: "Retourne pour chaque prédécesseur: description du nœud, schéma d'arguments (titres/descriptions) et schéma des sorties (handles).",
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];
        const rev = new Map();
        for (const e of edges) {
          const t = String(e.target||'');
          const s = String(e.source||'');
          if (!rev.has(t)) rev.set(t, []);
          rev.get(t).push(s);
        }
        const preds = rev.get(String(nodeId)) || [];
        const byId = new Map(nodes.map(n => [String(n.id), n]));
        const out = [];
        for (const id of preds) {
          const n = byId.get(String(id)); if (!n) continue;
          const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
          const tpl = model?.templateObj || {};
          out.push({
            id: String(id),
            name: model?.name || tpl?.title || tpl?.name || String(id),
            description: String(model?.description || ''),
            argsSchema: tpl?.args || null,
            outputHandles: Array.isArray(tpl?.outputHandles) ? tpl.outputHandles : [],
          });
        }
        return JSON.stringify(out);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_node_info',
      description: "Retourne les infos du nœud (id, name, description courante, template title).",
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const n = nodes.find(x => String(x.id) === String(nodeId));
        const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
        const tpl = model?.templateObj || {};
        const out = { id: String(nodeId), name: model?.name || tpl?.title || tpl?.name || '', description: model?.description || '', templateTitle: tpl?.title || '' };
        return JSON.stringify(out);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_node_schema',
      description: "Récupère le schéma d'arguments du nœud (fields/steps).",
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const n = nodes.find(x => String(x.id) === String(nodeId));
        const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
        const schema = model?.templateObj?.args || null;
        return JSON.stringify(schema || {});
      }
    }),
    new DynamicStructuredTool({
      name: 'list_predecessors',
      description: 'Liste les nœuds précédents (id, nom, type, description).',
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        const arr = listPredecessors(graph, nodeId);
        console.log("arrarr", arr)
        return JSON.stringify(arr);
      }
    }),
    new DynamicStructuredTool({
      name: 'get_scenarios',
      description: 'Simule les scénarios vers le nœud cible et retourne le msgIn du scénario sélectionné (si disponible).',
      schema: {},
      func: async () => {
        const graph = await ensureGetFlow();
        // Prefer engine split when available
        const { simulateViaEngineSplit, simulateViaEngine } = require('../utils/flow-simulate-engine');
        let data = null;
        try { data = await simulateViaEngineSplit(graph, String(nodeId)); }
        catch { try { data = await simulateViaEngine(graph, String(nodeId)); } catch {} }
        if (!data) { const { simulateScenarios } = require('../utils/flow-simulate'); data = simulateScenarios(graph, String(nodeId), 'all'); }
        const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
        // Optional: pick by branch handle
        let picked = null;
        if (branch) {
          try {
            for (const sc of arr) {
              const edges = (sc?.path?.edges)||[];
              if (edges.some(e => String(e.targetId) === String(nodeId) && String(e.sourceHandle||'') === String(branch))) { picked = sc; break; }
            }
          } catch {}
        }
        const chosen = picked || arr[0] || null;
        const keys = chosen && chosen.msgIn ? flattenKeys(chosen.msgIn) : [];
        try {
          lastScenario = chosen;
          console.info('[ai-args][get_scenarios]', { total: arr.length, pickedIndex: (chosen && chosen.index != null) ? chosen.index : -1, keys: keys.length });
          const full = (chosen && chosen.msgIn && typeof chosen.msgIn === 'object') ? chosen.msgIn : {};
          const payload = full && typeof full === 'object' ? (full.payload || {}) : {};
          const rootKeys = Object.keys(full || {});
          const payloadKeys = Object.keys(payload || {});
          // Console log complet (tronqué) pour debug backend
          try {
            const j = JSON.stringify(full);
            console.info('[ai-args][get_scenarios][msgIn]', { rootKeys, payloadKeys, size: j.length });
            console.info('[ai-args][get_scenarios][msgIn.json]', j.length > 1200 ? j.slice(0, 1200) + '…' : j);
          } catch {}
          // Ne plus émettre de messages [tool] côté UI (affichage compact tool-first)
        } catch {}
        
        
    return  JSON.stringify({ total: arr.length, selected: chosen ? { label: chosen.label, index: (chosen.index != null ? chosen.index : 0), msgIn: chosen.msgIn, msgKeys: keys } : null });

  }
    }),
    new DynamicStructuredTool({
      name: 'get_msgin_preview',
      description: "Retourne une synthèse texte des valeurs utiles du msgIn sélectionné (ex: 'Prénom: …, Nom: …, …').",
      schema: {},
      func: async () => {
        try {
          const graph = await ensureGetFlow();
          // Si aucun scénario en cache, calculer par défaut
          if (!lastScenario) {
            const { simulateViaEngineSplit, simulateViaEngine } = require('../utils/flow-simulate-engine');
            let data = null;
            try { data = await simulateViaEngineSplit(graph, String(nodeId)); }
            catch { try { data = await simulateViaEngine(graph, String(nodeId)); } catch {} }
            if (!data) { const { simulateScenarios } = require('../utils/flow-simulate'); data = simulateScenarios(graph, String(nodeId), 'all'); }
            const arr = Array.isArray(data?.scenarios) ? data.scenarios : [];
            lastScenario = arr[0] || null;
          }
          const msg = (lastScenario && lastScenario.msgIn) ? lastScenario.msgIn : {};

          try {
            const startEntry = Object.entries(msg || {}).find(([k,v]) => /^start_/i.test(String(k)) && v && typeof v === 'object');
            const startKeys = startEntry ? Object.keys(startEntry[1] || {}) : [];
            console.info('[ai-args][msg_preview][start_keys]', { node: startEntry ? startEntry[0] : null, keys: startKeys });
          } catch {}

          // Heuristique: privilégier les champs du start_form si accessibles; sinon payload + racine
          const pairs = [];
          const pushPair = (k, v) => {
            const val = (v == null) ? '' : (typeof v === 'string' ? v : (typeof v === 'number' ? String(v) : (typeof v === 'boolean' ? (v?'true':'false') : '…')));
            if (k && val !== '') pairs.push(`${k}: ${val}`);
          };
          try {
            // payload keys
            if (msg && typeof msg === 'object' && msg.payload && typeof msg.payload === 'object') {
              const entries = Object.entries(msg.payload).slice(0, 8);
              for (const [k,v] of entries) pushPair(k, v);
            }
          } catch {}
          try {
            // Aperçu des clés racines (inclure aussi les résultats de fonctions)
            const entries = Object.entries(msg).filter(([k,_]) => k !== '_nodes' && k !== 'payload').slice(0, 6);
            for (const [k,v] of entries) {
              if (v == null) continue;
              const t = typeof v;
              if (t === 'string' || t === 'number' || t === 'boolean') { pushPair(k, v); continue; }
              if (t === 'object') {
                // Extraire rapidement quelques scalaires de l'objet (ex: résultats de fonctions)
                try {
                  let count = 0;
                  for (const [sk, sv] of Object.entries(v)){
                    const ts = typeof sv;
                    if (ts === 'string' || ts === 'number' || ts === 'boolean') { pushPair(`${k}.${sk}`, sv); count++; }
                    if (count >= 3) break;
                  }
                } catch {}
              }
            }
          } catch {}
          const text = pairs.length ? pairs.join(', ') : '';

          try { console.info('[ai-args][msg_preview]', { len: text.length, fields: pairs.length }); } catch {}
          console.log("texxxxt", text)
          return JSON.stringify({ text, fields: pairs.length });
        } catch (e) { try { console.warn('[ai-args][msg_preview][error]', e?.message||e); } catch {} return 'error'; }
      }
    }),
    new DynamicStructuredTool({
      name: 'set_node_args',
      description: "Propose les valeurs finales des arguments du nœud (context). Appeler ce tool une fois les décisions prises.",
      schema: {},
      func: async (input) => {
        try {
          const args = (input && typeof input === 'object') ? (input.args && typeof input.args==='object' ? input.args : input) : {};
          const keys = Object.keys(args || {});
          if (!keys.length) {
            try { console.warn('[ai-args][set_node_args] empty_args_ignored'); } catch {}
            send({ type: 'error', code: 'args_empty', message: 'Aucun argument fourni dans set_node_args' });
            return 'args_empty';
          }
          // Validate keys against node schema when available
          let allowed = null; let required = null;
          try {
            const graph = await ensureGetFlow();
            const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
            const n = nodes.find(x => String(x.id) === String(nodeId));
            const model = (n?.data && n.data.model) ? n.data.model : (n?.data || {});
            const schema = model?.templateObj?.args || null;
            const collectKeys = (sch) => {
              const set = new Set();
              const walkFields = (arr) => {
                for (const f of (arr||[])) {
                  const k = f && (f.key || f.id || f.name);
                  if (k && typeof k === 'string') set.add(String(k));
                  if (Array.isArray(f.fields)) walkFields(f.fields);
                  if (Array.isArray(f.steps)) walkFields(f.steps.flatMap(s => s.fields||[]));
                }
              };
              if (!sch) return set;
              if (Array.isArray(sch.fields)) walkFields(sch.fields);
              if (Array.isArray(sch.steps)) walkFields(sch.steps.flatMap(s => s.fields||[]));
              return set;
            };
            const collectRequired = (sch) => {
              const set = new Set();
              const visit = (arr) => {
                for (const f of (arr||[])) {
                  const k = f && (f.key || f.id || f.name);
                  const validators = Array.isArray(f?.validators) ? f.validators : [];
                  const isReq = !!f?.required || validators.some(v => (v && (v.type === 'required' || v.kind === 'required')));
                  if (isReq && k) set.add(String(k));
                  if (Array.isArray(f.fields)) visit(f.fields);
                  if (Array.isArray(f.steps)) visit(f.steps.flatMap(s => s.fields||[]));
                }
              };
              if (Array.isArray(sch?.fields)) visit(sch.fields);
              if (Array.isArray(sch?.steps)) visit(sch.steps.flatMap(s => s.fields||[]));
              return set;
            };
            allowed = collectKeys(schema);
            required = collectRequired(schema);
          } catch {}
          let filtered = args;
          if (allowed && allowed.size) {
            const bad = [];
            filtered = {};
            for (const k of Object.keys(args)) {
              if (allowed.has(String(k))) filtered[k] = args[k]; else bad.push(k);
            }
            if (bad.length) { try { console.warn('[ai-args][set_node_args] unknown_keys', bad); } catch {} send({ type:'error', code:'args_unknown_keys', message:'Clés inconnues ignorées', details: bad }); }
          }
          if (!Object.keys(filtered).length) { send({ type: 'error', code: 'args_empty_after_filter', message: 'Aucun argument exploitable (clés inconnues)' }); return 'args_empty_after_filter'; }
          if (required && required.size) {
            const missing = Array.from(required).filter(k => !(k in filtered));
            if (missing.length) { try { console.info('[ai-args][set_node_args] missing_required', missing); } catch {} }
          }
          send({ type: 'args', args: filtered });
          return 'ok';
        } catch (e) { return 'error'; }
      }
    }),
    new DynamicStructuredTool({
      name: 'set_node_description',
      description: 'Propose une description courte et précise du nœud (1–2 phrases).',
      schema: {},
      func: async (input) => {
        try {
          let text = '';
          try {
            if (typeof input === 'string') text = input; else if (input && typeof input === 'object') text = String(input.description ?? input.text ?? '');
            else text = '';
          } catch { text = ''; }
          try {
            const prev = String(text || '');
            const short = prev.length > 160 ? prev.slice(0,160) + '…' : prev;
            console.info('[ai-args][set_node_description]', { len: prev.length, preview: short });
          } catch {}
          if (!text.trim()) { send({ type: 'error', code: 'desc_empty', message: 'Description vide' }); return 'desc_empty'; }
          send({ type: 'desc', text });
          return 'ok';
        } catch (e) { return 'error'; }
      }
    })
  ];
}

function normalizeHistory(h) {
  if (!Array.isArray(h)) return [];
  return h.filter(m => m && typeof m === 'object' && m.role && (m.content != null)).map(m => ({ role: String(m.role), content: String(m.content) }));
}

async function runArgsAgentWithTools({ prompt, flowId, nodeId, branch = null, history = [], send, done, seedGraphOverride = null }){
  const { createDispatcher } = require('../realtime/agent-events');
  const dispatcher = createDispatcher(send);
  // Track whether concrete proposals were produced; otherwise, signal clarification
  let proposedArgs = false;
  let proposedDesc = false;
  let lastAssistantText = '';
  const localSend = (obj) => {
    try {
      if (obj && obj.type === 'args') {
        const k = Object.keys(obj.args || {});
        if (k.length) proposedArgs = true;
      }
      if (obj && obj.type === 'desc') {
        if (obj.text && String(obj.text).trim().length) proposedDesc = true;
      }
      if (obj && obj.type === 'message' && obj.text) lastAssistantText = String(obj.text || '').trim();
    } catch {}
    try { dispatcher.emit(obj); } catch {}
  };
  const emitMessage = (text) => { if (text) localSend({ type: 'message', role: 'assistant', text }); };
  try {
    try { console.info('[ai-args] start', { flowId: String(flowId||''), nodeId: String(nodeId||''), branch: branch ? String(branch) : null, promptLen: (String(prompt||'').length||0), histLen: Array.isArray(history) ? history.length : 0 }); } catch {}
    const { DynamicStructuredTool, ChatOpenAI, createOpenAIToolsAgent, AgentExecutor, ChatPromptTemplate } = await importLC();
    // Prépare getFlow: seedGraph override ou chargement DB
    const { Types } = require('mongoose');
    const Flow = require('../db/models/flow.model');
    const getFlow = async () => {
      if (seedGraphOverride && typeof seedGraphOverride === 'object') return seedGraphOverride;
      let flow = null; const fid = String(flowId || '');
      if (Types.ObjectId.isValid(fid)) flow = await Flow.findById(fid).lean();
      if (!flow) flow = await Flow.findOne({ id: fid }).lean();
      if (!flow) throw new Error('flow_not_found');
      return flow.graph || flow;
    };
    const tools = await buildToolsLC({ DynamicStructuredTool, flowId, nodeId, branch, send: localSend, getFlow });
    try { const { ensureToolMetadata } = require('./tools-registry'); await ensureToolMetadata(tools); } catch {}
    try { console.info('[ai-args] tools ready', tools.map(t => t?.name).filter(Boolean)); } catch {}
    const model = new ChatOpenAI({
      temperature: 1,
      modelName: process.env.OPENAI_MODEL || 'gpt-5',
      openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_APIKEY || '',
      streaming: true,
    });
    const promptT = ChatPromptTemplate.fromMessages([
      ['system', systemPromptBase()],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);
    const agent = await createOpenAIToolsAgent({ llm: model, tools, prompt: promptT });
    const executor = new AgentExecutor({ agent, tools });
    const rawPrompt = String(prompt || '').trim();
    const usedDefault = rawPrompt.length === 0;
    const inputText = usedDefault ? 'Complète les arguments pour ce nœud en utilisant get_node_schema, list_predecessors et get_scenarios. Pose une question si nécessaire.' : rawPrompt;
    try { console.info('[ai-args][prompt]', { usedDefault, len: inputText.length, text: inputText }); } catch {}
    const chatHistory = normalizeHistory(history);
    // Stream raw LangChain messages and tool logs only
    const stream = await executor.streamEvents({ input: inputText, chat_history: chatHistory }, { version: 'v2' });
    // Realtime reconstruction of tool args for set_node_args
    const builders = new Map(); // index -> { name, argsText }
    const tryRepair = (s) => {
      try {
        let t = String(s || '').trim();
        // Remove trailing comma before closing
        t = t.replace(/,\s*(\}|\])\s*$/s, '$1');
        if (t.startsWith('{') && /\}\s*$/.test(t)) {
          try { return { complete: JSON.parse(t) }; } catch {}
        }
        if (t.startsWith('{') && !/\}\s*$/.test(t)) {
          try { const candidate = t + '}'; return { partial: JSON.parse(candidate) }; } catch {}
        }
        return {};
      } catch { return {}; }
    };
    for await (const ev of stream) {
      try {
        if (ev.event === 'on_chat_model_stream') {
          const chunk = ev.data?.chunk;
          const content = chunk?.content;
          if (content) emitMessage(content);
          const tcs = (chunk && Array.isArray(chunk.tool_call_chunks)) ? chunk.tool_call_chunks : [];
          for (const c of tcs) {
            const idx = c.index ?? 0;
            const b = builders.get(idx) || { name: '', argsText: '' };
            if (c.name) b.name = String(c.name);
            if (c.args) b.argsText += String(c.args);
            builders.set(idx, b);
            if (b.name === 'set_node_args' && b.argsText) {
              const parsed = tryRepair(b.argsText);
              if (parsed.partial) {
                localSend({ type: 'args.partial', args: parsed.partial });
              }
              if (parsed.complete) {
                localSend({ type: 'args', args: parsed.complete });
              }
            }
          }
        } else if (ev.event === 'on_tool_start') {
          const args = ev.data?.input?.input || {};
          try { console.info('[ai-args][tool] start', ev.name, { hasArgs: !!args, keys: args ? Object.keys(args) : [] }); } catch {}
          localSend({ type: 'tool.start', name: ev.name, args });
        } else if (ev.event === 'on_tool_end') {
          try { console.info('[ai-args][tool] end', ev.name); } catch {}
          localSend({ type: 'tool.end', name: ev.name, ok: true });
        } else if (ev.event === 'on_chain_error' || ev.event === 'on_tool_error' || ev.event === 'on_chat_model_error') {
          const emsg = ev?.data?.error?.message || ev?.data?.error || 'stream_error';
          try { console.error('[ai-args][stream][error]', emsg); } catch {}
          localSend({ type: 'error', code: 'llm_stream_error', message: String(emsg) });
        }
      } catch {}
    }
    try { console.info('[ai-args] done'); } catch {}
    // If nothing was proposed, signal that the agent awaits user clarification
    try {
      if (!proposedArgs && !proposedDesc) {
        const question = (lastAssistantText || '').trim();
        localSend({ type: 'await_user', question });
      }
    } catch {}
    done();
  } catch (e) {
    const msg = e?.message || String(e);
    try { console.error('[ai-args][agent_failed]', e?.stack || msg); } catch {}
    send({ type: 'error', code: 'agent_failed', message: msg });
    done();
  }
}

module.exports = { runArgsAgentWithTools };
