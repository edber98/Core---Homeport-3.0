# Cahier de test — Agent IA Kinn

Version : 2026-04-20 · Branche : `feature/ia-agentic`

**Objectif** : valider toutes les capacités de l'agent avec des prompts **prêts à copier-coller**. Chaque test ≤ 5 min. Coche au fur et à mesure.

**Comment utiliser** : ouvre `/ai` (fullpage) · colle le prompt tel quel · compare au "Attendu" · note ce qui diverge dans la colonne Résultat.

---

## 🔴 Bugs & fixes (suivi)

| # | Sévérité | Bug | État |
|---|---|---|---|
| B1 | P0 | Subagents appellent `todo_write` → "Outil inconnu" | À fixer |
| B2 | P0 | Stream timeout 120s sur Opus 4.7 pendant long `execute_code` | À fixer (timeout + max_tokens) |
| B3 | P1 | Nom du sous-agent absent dans panneau droit après fin | À fixer |
| B4 | P1 | Checklist pas mise à jour quand agent termine | ✅ Fix par prompt resume + widgets |
| B5 | P2 | Pas de stream visible args tool avec Anthropic | Comportement API, pas un bug |
| B6 | P1 | Markdown dans accordéon rendu brut | ✅ Fixé `ai-structured-accordion.component.ts` |
| B7 | P0 | python-docx installé mais sandbox Python différent | ✅ Fixé `install_package` via `python -m pip` |
| B8 | P1 | Widgets (canvas/structured) pas inline dans le texte | ✅ Fixé mécanisme `[[WIDGET:id]]` |
| B9 | P0 | Anti-hallucination bloque finalizers sans resume | ✅ Fixé (exception widgetId existant) |
| B10 | P1 | Race permission parent vs user | ✅ Fixé (user-first 30s, parent fallback) |
| B11 | P1 | Memory leak `nextWithTimeout` | ✅ Fixé (cleanup dans chemin timeout) |
| B12 | P1 | Heartbeat stale → resume prématuré | ✅ Fixé (mark stalled avant count) |
| B13 | P1 | `input_from` sans validation sources vides | ✅ Fixé (abort si toutes sources vides) |
| B14 | P2 | Auto-wait siblings sans détection cycle | Non fixé (edge case rare) |
| B15 | P2 | Resume parent perd transcript | ✅ Fixé (merge thread history au resume) |
| B16 | P2 | Auto-close todos dupliqué | ✅ Clarifié (coordination documentée) |

---

## Suite 0 — Tools directs (SANS sous-agent)

Ces tests vérifient que les outils de base fonctionnent directement, sans passer par spawn_subagent. Utile pour isoler les problèmes : si Suite 0 échoue, rien ne peut marcher.

### S0.1 ⚡ Memory save/get
**Prompt** :
```
Sauvegarde en mémoire : "Mon entreprise s'appelle ACME Corp, secteur logistique, 250 employés". Puis relis la mémoire pour me la confirmer.
```
**Attendu** : 2 appels `save_memory` puis `get_memory`. Réponse cite l'info exacte.

### S0.2 ⚡ Todo directe sans subagent
**Prompt** :
```
Crée une todo en 3 étapes : 1) lister les fichiers du projet, 2) lire le README, 3) résumer en 2 phrases. Exécute-les sans lancer de sous-agent.
```
**Attendu** : widget todo_list, transitions pending→in_progress→completed, réponse finale courte. Aucun `spawn_subagent` dans les logs.

### S0.3 Render_structured direct
**Prompt** :
```
Compare OpenAI, Anthropic et Mistral en un render_structured comparison_table, widgetId="llm-providers-2026", 4 colonnes (provider, modèle phare, prix input/output, spécialité), 3 lignes. Collapsed par défaut.
```
**Attendu** : widget créé, marqueur `[[WIDGET:llm-providers-2026]]` dans le texte, affiché replié avec header cliquable.

### S0.4 Diagram mermaid direct
**Prompt** :
```
Fais-moi un diagramme mermaid flowchart de l'architecture Kinn : Frontend → API → Agent Harness → LLM → Tools → MongoDB. widgetId="archi-kinn".
```
**Attendu** : mermaid rendu, marqueur `[[WIDGET:archi-kinn]]` présent.

### S0.5 Canvas HTML direct
**Prompt** :
```
Fais un canvas_html widgetId="demo-counter" : bouton qui incrémente un compteur affiché en gros, style Kinn (rose #e61982). Collapsed=true.
```
**Attendu** : canvas dans iframe, collapse fermé au début, ouvre au clic.

### S0.6 Execute_code python
**Prompt** :
```
Calcule le 42e nombre de Fibonacci avec execute_code python, puis display le résultat.
```
**Attendu** : capsule code_exec activée, execute_code Python, résultat = 267914296.

### S0.7 Execute_code node
**Prompt** :
```
En node execute_code, prends le tableau [5,2,8,1,9,3] et trie-le en reverse. Affiche le résultat.
```
**Attendu** : résultat [9,8,5,3,2,1].

### S0.8 Web_fetch + extraction
**Prompt** :
```
Va chercher la page https://www.anthropic.com et dis-moi le slogan principal.
```
**Attendu** : web_fetch appelé, extraction via haiku (voir logs), réponse avec slogan.

### S0.9 Install_package python
**Prompt** :
```
Installe le package python "python-docx" puis vérifie avec execute_code qu'il s'importe bien (import docx; print(docx.__version__)).
```
**Attendu** (après fix B7) : install OK via `python -m pip`, import OK, version affichée.

### S0.10 Display_file inline
**Prompt** :
```
Crée un xlsx "Contacts.xlsx" avec 3 lignes via openpyxl (execute_code), puis display_file avec widgetId="contacts-demo" collapsed=false.
```
**Attendu** : xlsx créé, viewer inline, marqueur `[[WIDGET:contacts-demo]]` dans le texte.

---

## Suite 1 — Orchestration subagents

### S1.1 ⚡ Spawn simple
**Prompt** :
```
Lance un sous-agent de recherche qui me trouve 3 concurrents de Pipedrive avec leur prix de départ. Juste 3 lignes, rapide.
```
**Attendu** : 1 badge subagent apparaît, passe `running` → `completed`. Rapport de 3 concurrents visible dans la card du subagent. Parent reprend avec synthèse.

### S1.2 Parallèle
**Prompt** :
```
Lance 2 sous-agents EN PARALLÈLE :
1) recherche les tendances "AI Agents 2026"
2) recherche les tendances "MCP protocol"
Ne les fais pas séquentiels, ils n'ont aucune dépendance.
```
**Attendu** : 2 badges subagents simultanés, 2 items `in_progress` dans la todo. Parent attend les deux puis synthétise.

### S1.3 Dépendance `depends_on`
**Prompt** :
```
Planifie 2 étapes :
- Étape A : trouve les 3 plus gros acteurs iPaaS en Europe.
- Étape B (dépend de A) : compare leurs prix entreprise à partir du résultat de A.
Lance A d'abord, B uniquement après, en passant le résultat de A en input à B.
```
**Attendu** : B ne démarre **pas** avant que A soit `completed`. B reçoit l'output de A.

### S1.4 🧩 Cascade 3 axes + livrable
**Prompt** :
```
Mission multi-axes pour le client ACME :
- Axe 1 : étude 5 concurrents iPaaS EU avec pricing
- Axe 2 : 3 tendances techniques 2026 (AI Agents, MCP, RAG)
- Axe 3 : récupère le logo et la palette couleurs d'ACME (domaine acme.com)
Lance les 3 en parallèle, puis une fois TOUS terminés, produis un docx final aux couleurs ACME qui synthétise les 3 axes.
```
**Attendu** : 3 subagents parallèles, resume parent unique, docx généré sans timeout (nécessite fix B2).

### S1.5 Anti-duplication
**Prompt** :
```
Lance 2 fois la même recherche "compétiteurs Zapier" en parallèle, à un jour d'intervalle des résultats.
```
**Attendu** : 2ᵉ spawn dédupliqué (mêmes args = même hash) → 1 seul subagent réellement lancé.

### S1.6 🐛 B1 — Subagent et `todo_write`
**Prompt** :
```
Lance un sous-agent research avec une todo list interne en 3 étapes : recherche, synthèse, rédaction.
```
**Attendu après fix** : le subagent n'essaie pas d'appeler `todo_write` (soit autorisé, soit prompt lui interdit). **Actuellement** : erreur "Outil inconnu: todo_write" dans les logs.

---

## Suite 2 — Todo list lifecycle

### S2.1 ⚡ Create + update basique
**Prompt** :
```
Fais-moi un plan en 3 étapes : 1) recherche tendances IA, 2) rédige un brief, 3) affiche le brief en accordéon markdown. Exécute les 3 étapes dans l'ordre et marque chaque étape completed avant de passer à la suivante.
```
**Attendu** : widget todo_list inline, 3 items, transition pending → in_progress → completed visible à chaque étape.

### S2.2 Multi in_progress
**Prompt** :
```
Crée une todo list avec 3 tâches de recherche indépendantes, et mets les 3 simultanément en "in_progress" car tu vas les lancer en parallèle.
```
**Attendu** : 3 items `in_progress` acceptés (pas d'erreur "un seul in_progress").

### S2.3 Auto-close stale
**Prompt** :
```
Crée une todo avec 2 étapes, marque la 1re in_progress, puis plante volontairement avec un appel à execute_tool avec une clé inexistante "xyz_does_not_exist".
```
**Attendu** : après échec, la todo `in_progress` passe en `cancelled` (pas bloquée en loading).

### S2.4 🐛 B4 — Sync fin subagent
**Prompt** :
```
Lance un subagent qui fait une recherche simple sur "OpenAI Assistants API 2026". Pendant ce temps, mets à jour ta todo : "Recherche en cours" → "completed" quand il finit.
```
**Attendu** : quand subagent `completed`, le todo parent passe automatiquement à `completed` sans intervention user.

### S2.5 Widget scope par message
**Prompt 1** :
```
Plan 1 : 2 étapes rapides, exécute-les.
```
**Prompt 2 (même conversation, après fin)** :
```
Plan 2 : 3 autres étapes, exécute-les.
```
**Attendu** : 2 widgets todo distincts (widgetId différent basé sur `lastUserMsgId`), pas de fusion.

---

## Suite 3 — Resume parent

### S3.1 Resume après 1 subagent async
**Prompt** :
```
Lance un subagent async qui liste 3 features de Salesforce. Après, synthétise en 2 phrases.
```
**Attendu** : parent reprend automatiquement avec synthèse une fois le subagent fini (pas besoin de relancer).

### S3.2 Resume après 4 parallèles
**Prompt** :
```
Lance 4 subagents en parallèle : Slack, Teams, Discord, Google Chat — pour chacun, liste 2 points forts en intégration iPaaS. Une fois les 4 finis, fais un tableau comparatif.
```
**Attendu** : **un seul** resume parent après le 4ᵉ fini. Pas 4 resumes cumulés.

### S3.3 Widgets exclus du resume
**Prompt** :
```
Lance 1 subagent qui rend son résultat via render_structured (accordion) ET génère un diagramme mermaid d'archi. Après sa fin, reprends.
```
**Attendu** : widgets n'empêchent pas le resume (ils sont dans `WIDGET_KINDS`).

### S3.4 Pas de finalizer après spawn async
**Prompt** :
```
Lance 2 subagents en parallèle pour comparer Odoo vs QuickBooks. NE DONNE PAS de conclusion ou de tableau tant qu'ils ne sont pas revenus.
```
**Attendu** : parent ne hallucine **aucune** synthèse/tableau dans le même tour que le spawn. Il attend.

---

## Suite 4 — Widgets inline

### S4.1 ⚡ Texte + tableau structured
**Prompt** :
```
Compare Pipedrive vs HubSpot vs Salesforce en un tableau structured (render_structured layout=table avec colonnes : Nom, Pricing entrée, Forces, Faiblesses). Avant le tableau, une phrase d'intro.
```
**Attendu** : 1 phrase d'intro, puis le tableau widget (fond transparent, pas de card double).

### S4.2 Canvas HTML
**Prompt** :
```
Génère un canvas_html : landing page responsive simple avec hero "Kinn, iPaaS nouvelle génération", 3 cartes features, CTA. Couleurs : bleu #1e3a8a + blanc.
```
**Attendu** : iframe sandbox, rendu fidèle, pas de crash CSP.

### S4.3 Diagramme mermaid
**Prompt** :
```
Fais-moi un diagramme mermaid (sequenceDiagram) de l'architecture Kinn : Frontend → API → Agent Harness → LLM Anthropic → Tools → MongoDB.
```
**Attendu** : mermaid rendu graphiquement.

### S4.4 Widget editable (même widgetId)
**Prompt 1** :
```
Fais un render_structured type=table avec 3 lignes de contacts fictifs (nom, email, téléphone). widgetId = "contacts-demo".
```
**Prompt 2** :
```
Ajoute une 4e ligne avec un contact "Marie Dupont". Utilise le MÊME widgetId "contacts-demo" pour que la table soit mise à jour en place.
```
**Attendu** : même widget mis à jour, pas un 2ᵉ tableau dupliqué.

### S4.5 Display file (docx depuis execute_code)
**Prompt** :
```
Génère un fichier docx simple de 2 pages avec python-docx : titre "Test Kinn", 3 paragraphes lorem, une liste à puces. Affiche-le ensuite avec display_file.
```
**Attendu** : viewer inline fonctionne, bouton download ok. Si python-docx plante, fallback zip+XML (cf. B7).

### S4.6 🆕 Markdown rendu dans accordéon (fix B6)
**Prompt** :
```
Fais un render_structured layout=accordion avec 2 sections. La 1re contient : un **gras**, un lien [Kinn](https://kinn.io), une liste à puces, un tableau markdown 2x2. La 2de contient un bloc de code python de 3 lignes.
```
**Attendu après fix B6** : markdown rendu (gras, liens cliquables, tableau, code coloré), plus de texte brut.

---

## Suite 5 — Permissions

### S5.1 ⚡ Write demande confirmation
**Prompt** :
```
Édite le flow "demo-crm" et ajoute un node "Envoyer un email" à la fin.
```
**Attendu** : card permission dans le chat, boutons autoriser/refuser/toujours.

### S5.2 Allow always
**Prompt** :
```
Fais 3 éditions consécutives sur le flow "demo-crm" : renomme 2 nodes + change la description. Si l'UI me demande, je vais cocher "toujours autoriser" au 1er.
```
**Attendu** : 1 seule demande, les 2 suivantes auto-acceptées.

### S5.3 Background job
**Prompt** :
```
Lance un subagent async qui va éditer le form "contact-v2" et ajouter 3 champs. Ferme l'onglet pendant qu'il tourne, rouvre.
```
**Attendu** : card permission toujours visible au reload, décision persistée.

### S5.4 Refus propre
**Prompt** :
```
Supprime tous les flows qui commencent par "test-". Je vais refuser.
```
**Attendu** : agent continue proprement, message "action refusée par l'utilisateur", pas de crash.

---

## Suite 6 — Roster agents

### S6.1 ⚡ Badge + tooltip
**Action** : hover les badges dans la barre d'agents.
**Attendu** : tooltip (nom + bio + emoji + couleur), flip auto haut/bas selon espace viewport.

### S6.2 🐛 B3 — Nom panneau droit
**Prompt** :
```
Lance Tim (dev) pour me faire 50 lignes de TypeScript, et Marie (design) pour me faire une palette couleurs.
```
**Attendu après fix B3** : panneau droit après fin affiche bien **"Tim"** et **"Marie"** (pas "Agent" générique).

### S6.3 Cohérence rôle
**Prompt 1** :
```
@Tim écris-moi un service Angular qui appelle /api/ai/threads.
```
**Prompt 2** :
```
@Marie donne-moi une palette couleurs + typographie pour une marque "fintech sérieuse".
```
**Attendu** : chaque agent répond dans son domaine, pas de mélange.

---

## Suite 7 — Stream robustesse

### S7.1 Reconnect SSE
**Action** : lance un long prompt (S1.4), ferme l'onglet à mi-chemin, rouvre.
**Attendu** : messages rattrapés, stream repart.

### S7.2 🐛 B2 — Opus 4.7 sur gros execute_code
**Prompt** :
```
Génère un docx complet de 10 pages : couverture + 5 chapitres + annexes. Utilise python-docx et crée-le en un seul execute_code.
```
**Attendu après fix B2** : pas de `LLM stream timeout: no event for 120s`. Si encore timeout, bumper à 240s.

### S7.3 🐛 B5 — Args Anthropic (information, pas test)
**Action** : activer `AI_DEBUG=1`, lancer S4.1 en Claude.
**Attendu** : logs `[llm-anthropic] input_json_delta: ... +Nchars` visibles. Si 1 seul chunk = normal. Si plusieurs chunks = stream visible.

### S7.4 Annulation propre
**Action** : lance S3.2, clique "stop" au milieu.
**Attendu** : todos en cours passent `cancelled`, pas de subagent orphan, thread clean.

---

## Suite 8 — Document generation

### S8.1 ⚡ XLSX basique
**Prompt** :
```
Crée un xlsx avec 5 lignes de contacts fictifs (nom, prénom, email, téléphone). Utilise openpyxl et affiche avec display_file.
```
**Attendu** : xlsx généré, viewer inline ouvre.

### S8.2 🧩 DOCX avec charte
**Prompt** :
```
Génère un brief docx aux couleurs d'ACME (bleu #003087 + orange #FF6A13). Titre H1 bleu, sous-titres orange, body gris foncé, police Lato. 3 sections : Contexte, Objectifs, Livrables.
```
**Attendu** : docx ouvert dans Word respecte la charte.

### S8.3 🐛 B7 — Python-docx sandbox
**Prompt** :
```
Installe python-docx puis génère un docx simple. Si le module n'est pas visible après install, fais un fallback manuel (zip+XML).
```
**Attendu** : soit install visible du 1er coup, soit fallback réussit sans tour de magie.

---

## Suite 9 — Providers & models

### S9.1 ⚡ Switch OpenAI → Claude
**Action** :
```
/model claude-sonnet-4-5-20250929
Comment ça va ?
```
**Attendu** : logs `[llm-anthropic]`, pas de paramètre `temperature` si Opus 4.7.

### S9.2 Opus 4.7 sans temperature
**Action** :
```
/model claude-opus-4-7
Ping.
```
**Attendu** : aucun `temperature` dans le body (vérif logs). Pas d'erreur 400.

### S9.3 Haiku web extraction
**Action** : `WEB_MINI_PROVIDER=anthropic WEB_MINI_MODEL=claude-haiku-4-5-20251001`.
**Prompt** :
```
Fais un web_fetch sur https://docs.anthropic.com puis résume en 3 bullets.
```
**Attendu** : Haiku utilisé pour extract (pas le modèle principal). Logs distincts.

---

## Suite 10 — Recovery & erreurs

### S10.1 Subagent échoue
**Prompt** :
```
Lance un subagent qui appelle l'outil inexistant "foo_bar_baz".
```
**Attendu** : status `failed`, parent reprend avec message d'erreur clair.

### S10.2 🐛 B1 — Tool hors toolsAllowed
**Prompt** :
```
Lance un subagent type research et demande-lui explicitement d'appeler todo_write.
```
**Attendu après fix B1** : soit todo_write autorisé aux subagents, soit refus clair côté subagent (pas propagé en erreur harness).

### S10.3 Stream timeout
**Action** : simuler latence > 120s (débrancher momentanément Anthropic via hosts file ou prompt très lourd avec Opus).
**Attendu** : erreur propre, UI affiche retry, pas de todo fantôme.

### S10.4 Permission SSRF
**Prompt** :
```
Fais un web_fetch sur http://192.168.1.1/admin.
```
**Attendu** : refus SSRF clair, agent continue.

---

## Suite 11 — Widgets inline `[[WIDGET:id]]`

### S11.1 ⚡ Marqueur inline simple
**Prompt** :
```
Fais-moi un render_structured comparison_table widgetId="ipaas-2026" comparant 3 iPaaS (Zapier, Make, n8n). Dans ta réponse, mets une phrase d'intro, puis [[WIDGET:ipaas-2026]] sur sa propre ligne, puis une phrase de conclusion.
```
**Attendu** : widget apparaît EXACTEMENT entre les 2 phrases (pas en bas), avec collapse ouvert.

### S11.2 Collapse fermé par défaut
**Prompt** :
```
Fais un render_structured accordion widgetId="faq-v1" avec 5 questions FAQ, collapsed=true, collapseTitle="📚 FAQ détaillée (5 questions)". Intro courte + [[WIDGET:faq-v1]].
```
**Attendu** : widget apparaît replié, header "📚 FAQ détaillée...", ouvre au clic.

### S11.3 Plusieurs widgets même message
**Prompt** :
```
Fais 2 widgets dans la même réponse : 1) diagram archi widgetId="archi" flowchart simple, 2) canvas_html widgetId="demo" avec un bouton. Mets leurs marqueurs inline dans l'ordre, séparés par du texte explicatif.
```
**Attendu** : 2 widgets distincts apparaissent inline, chacun à sa place.

### S11.4 Update widget existant (même widgetId)
**Prompt 1** :
```
Fais un render_structured comparison_table widgetId="compare-v1" avec 3 lignes.
```
**Prompt 2** (même conversation) :
```
Ajoute une 4e ligne au tableau compare-v1. Utilise le MÊME widgetId.
```
**Attendu** : même widget mis à jour in-place (pas 2 widgets).

### S11.5 WidgetId manquant → auto-généré
**Prompt** :
```
Fais un render_structured stepped_plan avec 3 étapes, SANS fournir de widgetId.
```
**Attendu** : le tool auto-génère `w_<hex>`, retourne `inlineMarker` avec ce widgetId. Réponse du LLM inclut ce marqueur.

### S11.6 Widget subagent → parent inline
**Prompt** :
```
Lance Tim (research) pour trouver 3 compétiteurs Salesforce. Demande-lui de rendre son résultat en render_structured widgetId="tim-compet" comparison_table. Une fois terminé, fais-moi une synthèse qui utilise [[WIDGET:tim-compet]] inline dans ta conclusion.
```
**Attendu** : Tim produit le widget, parent resume, sa synthèse contient le marqueur qui résout le widget produit par Tim.

### S11.7 Marqueur cassé → silencieux
**Prompt** :
```
Dans ta réponse, écris exactement : "Voici [[WIDGET:inexistant-xyz]] fin." sans appeler de tool.
```
**Attendu** : le marqueur est silencieusement retiré (pas d'erreur), texte propre.

---

## Procédure de run

1. Lancer API (`npm run dev`) + Homeport (`ng serve`), env `PLUGIN_IMPORT_ENABLED=1`, `AI_DEBUG=1`.
2. Exécuter suite par suite. Chaque cas ≤ 5 min.
3. Cocher dans ce doc. Ajouter ligne "Résultat" si divergence.
4. Priorité après ce round de fixes :
   - Valider Suite 0 (tools directs) → fondation
   - Valider Suite 11 (`[[WIDGET:id]]` inline)
   - Valider Suite 3 (resume parent + widgets subagent)
   - Le reste par itérations
