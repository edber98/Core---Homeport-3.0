# Cahier de test — Agent IA Kinn

Version : 2026-04-20 · Branche : `feature/ia-agentic`

**Objectif** : valider toutes les capacités de l'agent avec des prompts **prêts à copier-coller**. Chaque test ≤ 5 min. Coche au fur et à mesure.

**Comment utiliser** : ouvre `/ai` (fullpage) · colle le prompt tel quel · compare au "Attendu" · note ce qui diverge dans la colonne Résultat.

---

## 🔴 Bugs prioritaires (avant de lancer)

| # | Sévérité | Bug | État |
|---|---|---|---|
| B1 | P0 | Subagents appellent `todo_write` → "Outil inconnu" | À fixer |
| B2 | P0 | Stream timeout 120s sur Opus 4.7 pendant long `execute_code` | À fixer |
| B3 | P1 | Nom du sous-agent absent dans panneau droit après fin | À fixer |
| B4 | P1 | Checklist pas mise à jour quand agent termine | À vérifier après B1 |
| B5 | P2 | Pas de stream visible args tool avec Anthropic | Comportement API, pas un bug |
| B6 | P1 | Markdown dans accordéon rendu brut | ✅ Fixé `ai-structured-accordion.component.ts` |
| B7 | P0 | python-docx installé mais sandbox Python différent | À fixer infra |
| B8 | P1 | Widgets (canvas/structured) pas inline dans le texte | Voir plan [[WIDGET:id]] |

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

## 🆕 Plan proposé — Widgets inline `[[WIDGET:id]]`

**Pourquoi** : actuellement canvas/structured/diagram créent des messages séparés. Tu veux qu'ils soient **dans** le flux du markdown de la réponse assistant, à l'endroit exact.

**Architecture proposée (inspirée de ton projet `[[FLOW:id]]`)** :

1. **Marqueur dans le markdown** : le LLM insère `[[WIDGET:widgetId]]` sur sa propre ligne.
2. **Prompt règle** : dans `base.js`, ajouter la règle "Quand tu appelles render_structured / canvas_html / generate_diagram, insère `[[WIDGET:<widgetId>]]` dans ton texte de réponse à l'endroit précis".
3. **Backend** (`meta-tools.js`) : les tools widget exigent déjà un `widgetId` — on le garde.
4. **Frontend** (`ai-message.component.ts`) : après `marked.parse(text)`, regex replace `[[WIDGET:id]]` par le composant Angular correspondant, en cherchant le widget dans `message.widgets` ou via lookup par ID.
5. **Persistance** : stocker le lien widgetId ↔ message sur `ai.message` pour le render au reload.

**Bénéfice** : l'accordéon apparaît **dans** ton texte entre 2 paragraphes, pas en dessous séparément. Identique pour canvas, diagramme, etc.

**Risque** : si le LLM écrit le marqueur mais oublie d'appeler le tool (ou l'inverse), rendu silencieux du marqueur cassé. À gérer avec fallback "widget introuvable" silencieux.

**Estimation** : ~ 2h (prompt + regex render + lookup). Je peux l'implémenter si tu valides.

---

## Procédure de run

1. Lancer API (`npm run dev`) + Homeport (`ng serve`), env `PLUGIN_IMPORT_ENABLED=1`, `AI_DEBUG=1`.
2. Exécuter suite par suite. Chaque cas ≤ 5 min.
3. Cocher dans ce doc. Ajouter ligne "Résultat" si divergence.
4. Priorité de fix avant QA complet :
   - **P0** : B1, B2, B7
   - **P1** : B3, B4, B8 (widgets inline)
   - **P2** : B5
