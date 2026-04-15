# Tests incrémentaux — Orchestration multi-agents

Valide progressivement du plus simple (1 subagent) au plus complexe (pipeline avec dépendances + escalation). Exécute les prompts dans l'ordre, coche ✅/❌/⚠️ et note ce qui manque.

Pré-requis : backend + frontend redémarrés après merge des 3 PRs (Agent A + B + C).

---

## Niveau 0 — Baseline (smoke tests, à lancer avant toute chose)

### 0.1 Chat basique fonctionne toujours
```
Dis bonjour et liste 3 capacités que tu as.
```
**Attendu** : réponse texte simple, aucun tool call, pas de canvas ouvert.
**Si KO** : régression majeure sur runHarness. Stop et debug avant de continuer.

### 0.2 Tool simple fonctionne
```
Cherche "homeport" dans le manuel interne.
```
**Attendu** : tool `search_manual` exécuté, résumé texte. Pas de subagent.

### 0.3 Anti-promesse vide (régression connue)
Bug historique : l'agent disait « Je lance la recherche maintenant » puis terminait sans appeler de tool.

Test en chat **projet** (avec factures ou docs dans le dossier) :
```
Tu peux lire les fiches de paie et me faire une synthèse des salaires ?
```
**Attendu** :
- L'agent N'ANNONCE PAS une action fantôme. Soit il lance IMMÉDIATEMENT `project_tree` / `project_grep` / `spawn_subagent` dans le même tour, soit il te pose une question claire (« dans quel dossier ? » / « je ne trouve pas de fiche de paie, où sont-elles ? »).
- Phrases interdites si rien n'est lancé : « je lance maintenant », « je commence à extraire », « je vais chercher ».
- Si la tâche est longue : doit dire « Je lance un sous-agent en arrière-plan, tu auras le rapport d'ici quelques minutes » AVEC l'appel `spawn_subagent({async:true})` dans le même tour.

**Si KO** : vérifie les logs :
- `[harness] stream complete: pendingTools=0` + `text=...` promettant une action → bug prompt, signaler
- `pendingTools=N` mais message texte promet → OK c'est prévu, l'exécution suit

---

## Niveau 1 — Visibilité des subagents (Agent A)

### 1.1 Un subagent sync simple
```
spawn_subagent({subagent_type:"research", prompt:"Résume en 3 phrases ce qu'est le protocole MCP"})
```
**Attendu** :
- Canvas **s'ouvre** auto sur l'onglet **« Agents »**
- Arbre : 1 nœud racine « Sous-agent research » avec status qui passe `queued → running → completed`
- Durée live affichée
- Compteur d'outils (au moins `web_search` + `web_fetch`)
- Dans le **chat** : 1 seul tool `Sous-agent` visible (pas les sous-tools du subagent)
- À la fin : message résumé dans le chat

### 1.2 Trois subagents parallèles
```
Lance 3 sous-agents research en parallèle sur : (1) n8n, (2) Make, (3) Zapier. Un paragraphe par outil.
```
**Attendu** :
- Canvas Agents : 3 sous-nœuds en `running` en même temps
- Indicateurs de progression indépendants (compteurs tools séparés)
- À la fin : 3 entrées `completed` avec durées différentes

### 1.3 Click expand sur un subagent
Dans Canvas Agents, **clique sur un subagent terminé**.
**Attendu** :
- Expand montre la timeline des tool calls (web_search → web_fetch → …)
- Pour chaque : nom, status, durée, résumé args (200 chars max)

---

## Niveau 2 — Mode async + agent_report (Agent B)

### 2.1 Subagent async simple
```
spawn_subagent({subagent_type:"research", prompt:"Fais un mini-état de l'art sur les plateformes iPaaS 2026 en 5 points", async:true})

Pendant qu'il tourne, dis-moi bonjour.
```
**Attendu** :
- Tool `spawn_subagent` retourne immédiatement `{jobId, status:"queued", async:true}`
- Agent répond "bonjour" dans la foulée (sans attendre)
- Canvas Agents : le subagent tourne en arrière-plan (status running)
- **2-3 minutes plus tard** : un NOUVEAU message arrive automatiquement dans le chat, kind `agent_report`
  - Carte verte avec ✓
  - Durée, summary, boutons « Voir le rapport »
  - Apparaît entre tes autres messages (pas à la fin)

### 2.2 Interaction pendant background
Après 2.1, enchaîne vite :
```
Quelle heure est-il ? Puis résume-moi ce que fait un agent IA en 2 phrases.
```
**Attendu** : l'agent répond normalement (instantané) pendant que le subagent tourne toujours. À la fin, le `agent_report` arrive quand même au bon moment dans le fil.

---

## Niveau 3 — Plan auto avec missing_info (Agent B)

### 3.1 Tâche claire (pas de plan nécessaire)
```
Crée un fichier /tmp/hello.txt avec le texte "bonjour"
```
**Attendu** : exécute direct, pas de `propose_plan`.

### 3.2 Tâche ambiguë → plan auto avec missing_info
```
Analyse les factures du projet et envoie-moi un email de synthèse.
```
**Attendu** :
- Carte `plan_proposal` inline avec :
  - Steps (scanner → extraire → synthétiser → email)
  - Section **« Informations manquantes »** avec inputs texte :
    - `email_destinataire` : « Où envoyer l'email ? »
    - éventuellement `dossier_factures` si le projet n'a pas un /Factures/ évident
  - Bouton **« Approuver » DISABLED** tant que les inputs sont vides
- Une fois rempli + Approuver : l'agent reprend et exécute

### 3.3 Tâche longue → plan sans missing_info
```
Génère un rapport de 10 pages sur l'évolution de l'IA agentique 2020-2026.
```
**Attendu** : `propose_plan` sans missing_info (tâche claire mais longue) → user approuve ou rejette → l'agent exécute après.

---

## Niveau 4 — Pipeline avec dépendances (Agent C)

### 4.1 Pipeline simple : A → B
```
spawn_subagent({subagent_type:"research", prompt:"Cherche les 3 tendances IA 2026", async:true})
// récupère jobId_A dans la réponse, puis :
spawn_subagent({subagent_type:"doc_writer", depends_on:["jobId_A"], input_from:"jobId_A", prompt:"Rédige un brief markdown basé sur la recherche", async:true})
```
**Attendu** :
- Canvas Agents : job_A en `running`, job_B en `waiting_dependency` avec indicateur « ⏳ Attend jobId_A »
- Quand A termine → B passe automatiquement en `running` avec le summary de A injecté en prompt
- 2 messages `agent_report` arrivent (A puis B) dans l'ordre

### 4.2 Pipeline parallèle + merge
```
Lance 3 research parallèles sur : concurrents, demande marché, tendances tech (sur l'iPaaS Europe 2026).
Puis quand tout est fini, fais un 4e subagent doc_writer avec depends_on=[3 précédents] input_from="all_above" qui rédige la synthèse.
```
**Attendu** :
- Canvas : arbre avec 4 sous-agents. Les 3 premiers en parallèle, le 4e en `waiting_dependency`
- Quand les 3 finissent → le 4e démarre avec le concat des 3 summaries en contexte
- 4 `agent_report` au total

---

## Niveau 5 — Permission escalation (Agent C)

### 5.1 Subagent demande une permission destructive
```
spawn_subagent({subagent_type:"general", prompt:"Supprime tous les fichiers .tmp du dossier /logs/ du projet", async:false})
```
**Attendu** :
- Le subagent tombe sur `project_delete` (classé destructive)
- **Au lieu** d'afficher la carte permission à l'user directement :
  - Événement `subagent.permission.request` remonte à l'**agent parent**
  - Le parent peut : (a) auto-refuser si la demande sort du cadre, (b) relayer via une vraie `ai.permission.request` au user
- Dans le chat, tu vois un message du parent (pas du subagent) qui dit « Le sous-agent veut supprimer X, ok ? » avec la carte inline

### 5.2 Subagent fait ask_user
```
spawn_subagent({subagent_type:"research", prompt:"Rédige un email pour le CEO — quel ton adopter ? Demande-le si tu ne sais pas.", async:false})
```
**Attendu** :
- Le subagent appelle `ask_user({text:'Quel ton pour l\'email au CEO ?', ...})`
- La question est remontée au parent, pas affichée directement à l'user
- L'agent parent relaie à l'user sous forme de sa propre question (avec contexte « Le sous-agent demande : … »)
- Ta réponse remonte via le parent au subagent qui continue

---

## Niveau 6 — Scénario combiné (production-style)

### 6.1 Ton cas complet factures
```
Aujourd'hui vérifie toutes les factures présentes dans le dossier /Factures/ du serveur.
Pour chaque facture : extrais les infos (N°, date, fournisseur, montants), cherche en ligne
des infos sur le fournisseur (web), et ajoute une ligne dans un document de synthèse.
Quand tout est fini, envoie-moi un email à compta@acme.fr avec le xlsx en pièce jointe.
```

**Séquence attendue** :

1. **Plan mode auto** déclenché :
   - Étapes : scan /Factures → parallel research par facture → agrégation xlsx → email
   - missing_info : `email_destinataire` (si pas déjà dans mémoire projet) — mais déjà fourni dans le prompt donc auto-OK
   - User approuve

2. **Phase 1 (parallel research)** :
   - Scan → 12 PDFs
   - 12 subagents research lancés en `async:true` avec throttle (5 concurrents max)
   - Canvas Agents : arbre avec 12 sous-agents, 5 en running, 7 en queued

3. **Phase 2 (doc_writer)** :
   - 1 subagent `doc_writer` avec `depends_on:[12 jobIds]` + `input_from:'all_above'`
   - Status `waiting_dependency` tant que les 12 ne sont pas finis
   - Une fois go : génère `/analyses/factures-2026.xlsx`

4. **Phase 3 (email)** :
   - 1 subagent `general` avec `depends_on:[jobId_doc_writer]`
   - Appelle `execute_tool(gmail_send_email, {...})` ou équivalent

5. **Messages `agent_report` automatiques** au fil du temps :
   - 12× mini-rapports research (si tu veux, ils peuvent être collapsed dans un seul « 12 factures analysées »)
   - 1× rapport doc_writer
   - 1× rapport email envoyé

6. **Pendant** tout ce temps, tu peux envoyer d'autres messages dans le chat. À la fin de chaque phase, le rapport arrive au milieu de la conversation.

---

## Niveau 7 — Tests d'erreur (robustesse)

### 7.1 Dépendance qui échoue
```
spawn_subagent({subagent_type:"research", prompt:"URL invalide — force l'erreur", async:true})
// Récupère jobId_err, puis :
spawn_subagent({subagent_type:"doc_writer", depends_on:["jobId_err"], prompt:"Écris un résumé", async:true})
```
**Attendu** : le 2e subagent voit que la dépendance a `status:'error'` → il passe lui-même en error sans tourner. Pas de blocage infini.

### 7.2 Timeout dépendance
```
spawn_subagent qui prend > 10 minutes
// + 2e qui depends_on
```
**Attendu** : waitForJobCompletion timeout à 10 min → 2e passe en error `dependency_timeout`. Pas de hang serveur.

### 7.3 User ferme le canvas pendant un background
Lance 2.1. Ferme le canvas manuellement. Envoie d'autres messages.
**Attendu** : le subagent continue en background. Les events s'accumulent dans AiCanvasState. À la fin, le `agent_report` apparaît dans le chat. Si tu rouvres le canvas, tu vois l'historique complet.

### 7.4 Reload page pendant un background
Lance 2.1. Rafraîchis la page F5.
**Attendu** : au reload, `loadThread` récupère les messages incluant le `agent_report` s'il a eu le temps d'être créé. Si le job tourne toujours, le resume-worker le reprend. Tu peux ouvrir le canvas et voir l'état.

---

## Feedback par test

Pour chaque KO, envoie :
1. Numéro du test (ex: 4.2)
2. Résultat obtenu vs attendu
3. Ligne de log backend pertinente (`[harness]`, `[sub-runner]`, `[job-runner]`)
4. Screenshot de l'UI canvas si pertinent

Ordre d'exécution recommandé : niveau 0 → 1 → 2 → 3 → 4 → 5 → 6. Les niveaux 7 à faire par curiosité/stress test après validation 1-6.
