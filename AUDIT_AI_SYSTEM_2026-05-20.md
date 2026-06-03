# Audit système AI Homeport — 2026-05-20

> **Périmètre** : audit complet du système d'agent IA Homeport (backend + frontend) avec comparaison à **openclaw**, analyse de parité multi-provider (Anthropic / OpenAI ChatCompletions / OpenAI Responses), bugs identifiés depuis les logs serveur de production, recommandations priorisées.
>
> **Branche** : `feat/add_connecters` — commit `1e66e3a1`
>
> **Trigger** : utilisateur observe surcharge backend, polling agressif, sous-agents non identifiables dans l'UI, redondance de `todo_write`, et exige la parité parfaite Claude ↔ OpenAI.

---

## Sommaire

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture Homeport actuelle](#2-architecture-homeport-actuelle)
3. [Parité provider (Anthropic / OpenAI / Responses)](#3-parité-provider-anthropic--openai--responses)
4. [Bugs identifiés depuis les logs](#4-bugs-identifiés-depuis-les-logs)
5. [UX sous-agents et permissions](#5-ux-sous-agents-et-permissions)
6. [Système de mémoire](#6-système-de-mémoire)
7. [Comparaison avec openclaw](#7-comparaison-avec-openclaw)
8. [Recommandations priorisées](#8-recommandations-priorisées)
9. [Plan d'action phasé](#9-plan-daction-phasé)

---

## 1. Résumé exécutif

### État actuel

Homeport a un système agent **très avancé** : harness à 100 tours, sous-agents avec depth/parentJobId, permissions escaladables, mailbox asynchrone, anti-hallucination, anti-boucle, todo widget, capsules d'outils dynamiques, multi-provider. La quantité de fonctionnalités est impressionnante (`agent-harness.js` = 1317 lignes, `ai.js` = 3523 lignes).

### Mais

L'expérience utilisateur souffre de **5 symptômes documentés** dans les logs récents :

| Symptôme | Cause probable | Sévérité |
|---|---|---|
| `loop 4/15` + `loop 5/100` simultanés | Parent agent (100) + sous-agent (maxLoops=15 ou 20) qui tournent en parallèle — pas un bug en soi, mais **logs interleavés** rendent illisible qui fait quoi | Lisibilité |
| `todo_write` réécrit 3-4× avec les MÊMES todos | Le LLM réécrit tout l'array `todos` à chaque update (pattern Claude Code), même sans changement | Bruit |
| `display_file` doublé (2 widgets différents pour même contenu) | Le LLM appelle le tool deux fois car il n'a pas vu la 1ère prise en compte côté UI | Hallucination |
| `GET /api/ai/threads/:id` toutes les 50-200ms | Plusieurs composants frontend appellent `loadThread()` sans debounce coordonné | Surcharge |
| Permission/question sous-agent indistinguable | L'AiMessage contient bien `subAgentInfo`, mais le rendu UI ne le met pas assez en avant | UX |

### Risques de parité provider

Le système a **3 clients LLM distincts** : `anthropic.js` (266 LOC), `openai.js` (211 LOC), `openai-responses.js` (407 LOC). Trois implémentations indépendantes du même contrat d'événements → **chaque feature doit être testée 3×** pour garantir parité. Plusieurs divergences ont été déjà patchées (cf. § 3).

### Recommandations top-3

1. **Unifier la couche LLM** derrière un seul adaptateur normalisé pour éliminer les divergences provider (cf. § 8.1).
2. **Re-designer l'UI sous-agents** : composant `AgentBadge` partout (chat, permission, question, todo, work-plan) avec couleur + emoji + nom + lien parent (cf. § 8.5).
3. **Refondre les déclencheurs de reload** côté frontend : un seul gestionnaire central qui debounce **tous** les reloads (threads, messages, work-plan) sur 600ms (cf. § 8.4).

---

## 2. Architecture Homeport actuelle

### 2.1 Vue d'ensemble (schéma)

```
                              ┌──────────────────────────────────────┐
                              │            FRONTEND ANGULAR          │
                              │  (Homeport/src/app/features/ai/*)    │
                              │                                      │
                              │  ai.service.ts                       │
                              │   ├─ openThreadLiveStream() [SSE GET]│
                              │   ├─ sendMessage()         [SSE POST]│
                              │   ├─ scheduleReloadMessages(400ms)   │
                              │   ├─ refreshContextUsage             │
                              │   └─ refreshPendingKnowledgeCount    │
                              │                                      │
                              │  ai-chat.component.ts                │
                              │  ai-message.component.ts             │
                              │   └─ <ai-permission-request>         │
                              │   └─ <ai-question>                   │
                              │   └─ <ai-todo-list>                  │
                              │  ai-canvas/* (work-plan, tasks)      │
                              │  ai-fullpage.component.ts            │
                              └─────────┬────────────────────────────┘
                                        │  HTTP + SSE
              ┌─────────────────────────┴───────────────────────────┐
              │                                                     │
              ▼                                                     ▼
   ┌──────────────────────────┐                       ┌──────────────────────┐
   │   POST .../messages       │                       │  GET .../stream      │
   │   (SSE — agent loop)      │                       │  (live thread bus)   │
   │                           │                       │                      │
   │   runHarness()            │                       │  onThreadEvent()     │
   │   ├─ pre-flight todo      │                       │  emitThreadEvent()   │
   │   ├─ loop 1..100          │                       │                      │
   │   │   ├─ mailbox drain    │                       │  Reçoit événements   │
   │   │   ├─ llm.stream()     │                       │  EXTERNES au POST :  │
   │   │   ├─ checkPermission  │                       │  ─ canvas.task.*     │
   │   │   ├─ exec tools       │                       │  ─ ai.message.created│
   │   │   ├─ anti-hallu       │                       │  ─ subagent.report   │
   │   │   ├─ anti-loop x3     │                       │  ─ ai.permission.*   │
   │   │   └─ checkpoint       │                       │                      │
   │   └─ autoCloseStaleTodos  │                       │                      │
   └─────────┬─────────────────┘                       └──────────────────────┘
             │
             ├──► Subagent ──────► createSubagent → AiJob (type='subagent')
             │     spawnSubagent()    parentJobId, depth, subagentType
             │                        └─ jobRunner.startJob() ──► runHarness()
             │                            (sa propre boucle 15-20 tours)
             │
             ├──► Permission ────► AiMessage (kind='permission_request')
             │                      emitThreadEvent('ai.permission.request')
             │
             ├──► todo_write ────► AiMessage (kind='todo_list', widgetId='session-todos')
             │
             └──► spawn_subagent ► Promise.all(parallel) ou séquentiel
                                  └─ depends_on / input_from pour DAG
```

### 2.2 Boucle harness (agent-harness.js)

**Limites** :
- `DEFAULT_MAX_LOOPS = 100` (env `AI_DEFAULT_MAX_LOOPS`) — `agent-harness.js:78`
- Sous-agents : `maxLoops || 20` par défaut — `subagent/sub-runner.js:130`
- Timeout par événement : 240s (`AI_STREAM_TIMEOUT_MS`) — `agent-harness.js:162`
- Profondeur max : 3 (`AI_MAX_SUBAGENT_DEPTH`) — `subagent/sub-runner.js:11`

**Phases d'un tour de boucle** :
```
1. Mailbox drain (pendingMessages du parent/user → conversation)
2. llm.stream(conversation, toolSet.definitions)
3. Accumule pendingToolCalls, assistantText, totalUsage
4. Si aucun tool → done + autoCloseStaleTodos
5. Détection todo_write nudge (≥2 heavy tools sans todo_write)
6. Anti-hallucination : blocage finalizer si async-spawn présent
7. Pour chaque tool :
   a. checkPermission → allow / deny / pending
   b. Si pending + parent → escalade vers parent + UI (race 30s)
   c. Si pending sans parent → AiMessage permission_request + yield
   d. Exécution → toolResult
   e. Tracking todo_pending_tools
8. Détection ask_user → escalade vers parent ou pause user
9. Push assistant + tool_results dans conversation
10. Anti-loop : si 3 fois même tool+erreur → force stop
11. Persist checkpoint (AiJob.transcript)
```

**Constats** :
- ✅ Très défensif (anti-hallu, anti-loop, mailbox, pre-flight todo, nudge todo)
- ⚠️ Beaucoup de logique imbriquée dans un seul fichier (1317 lignes) — difficile à tester unitairement
- ⚠️ Le checkpoint persiste `transcript.slice(-400)` à chaque tour → écriture Mongo répétée
- ⚠️ Le système est très "prompt-driven" — chaque garde-fou injecte un system message au prochain tour

### 2.3 Sous-agents

**Schéma de spawn** :
```
Parent agent (jobId=AGT1, depth=0)
  │
  ├─ tool: spawn_subagent({ subagent_type: 'research', async: true })
  │   └─ AiJob.create({ type:'subagent', parentJobId:AGT1, depth:1, maxLoops:20 })
  │       └─ job-runner.startJob(SUB1)
  │           └─ runHarness({ jobContext: { jobId:SUB1, parentJobId:AGT1 } })
  │               └─ même flux que parent, mais :
  │                  - systemPrompt enrichi "TU ES UN SOUS-AGENT" (agent-harness.js:325-369)
  │                  - permission pending → escalade au parent ET user en parallèle
  │                  - ask_user → escalade au parent
  │
  └─ tool: spawn_subagent({ parallel: [s1, s2, s3] })
      └─ Promise.all → 3 AiJob créés ensemble
          └─ chacun a son propre runHarness en parallèle
```

**Communication parent ↔ enfant** (`jobs/job-events.js`) :
- `emitJobEvent(jobId, event)` — pub/sub in-memory par job
- `emitThreadEvent(threadId, event)` — pub/sub in-memory par thread (l'UI consomme via `/stream`)
- `waitForPermissionFromParent(parentJobId, requestId, timeout=10min)` — Promise bloquante
- `waitForAskUserFromParent` idem pour ask_user
- `pendingMessages` dans AiJob → mailbox asynchrone (le subagent les voit au prochain tour)

**Côté frontend** (`ai-canvas-workplan.component.ts`) :
- Le `work-plan` endpoint retourne l'état hiérarchique (parent + subagents) en JSON
- Composant `<ai-canvas-workplan>` affiche les tâches sous forme de cartes
- Reload debounced à 500ms sur événements `canvas.*`, `subagent.*`, `ai.message.*`, `job.status`

### 2.4 SSE et événements

**Deux endpoints SSE distincts** :

```
POST /api/ai/threads/:threadId/messages
   └─ Stream de runHarness() pour CETTE requête
      ├─ Heartbeat 15s (keepalive)
      ├─ X-Accel-Buffering: no
      └─ socket.setNoDelay(true)

GET /api/ai/threads/:threadId/stream
   └─ Stream "live" du thread (background jobs, subagents, mises à jour widgets)
      ├─ Reconnexion auto avec backoff (ai.service.ts:1659+)
      └─ Emit via emitThreadEvent depuis n'importe où dans le backend
```

**Cycle de vie d'un événement** :
```
1. harness yield event → POST .../messages SSE → frontend (chat actif)
2. Si event est aussi un thread-wide event (canvas, message, permission) →
   emitThreadEvent → GET .../stream → frontend (live updates)
3. Frontend reçoit, decode, route vers le bon composant
4. Composants debounced : scheduleReloadMessages(400ms), workplan._load(500ms),
   refreshContextUsage(), refreshPendingKnowledgeCount() chacun avec leur propre debounce
```

**Problème observé** : pas de coordinateur central des reloads. Chaque composant frontend a sa propre logique de refresh. Sur un thread actif avec 3 subagents et un canvas, on peut avoir 4-5 GETs par seconde sur le même thread.

### 2.5 Modèles de données AI

| Modèle | Fichier | Champs clés |
|---|---|---|
| AiThread | `ai-thread.model.js` | mode, flowId, agentId, metadata |
| AiMessage | `ai-message.model.js` | role, content, toolCalls, segments, question, metadata.kind, metadata.permissionRequest, metadata.extra (subAgentInfo) |
| AiJob | `ai-job.model.js` | type, status, parentJobId, depth, subagentType, transcript, iteration, heartbeatAt, pendingMessages, subagentInstructions, dependsOn |
| AiCanvasState | `ai-canvas-state.model.js` | tasks[], par thread |
| AiPermissionGrant | `ai-permission-grant.model.js` | scope, decision, persistant |
| AiProjectMemory | `ai-project-memory.model.js` | workspaceId, elementType, elementId, memory |
| AiUserContext | `ai-user-context.model.js` | memory (global), frequentTools |
| AiWorkspaceContext | `ai-workspace-context.model.js` | contextData |
| AiAgent | `ai-agent.model.js` | systemPrompt, mode, allowedProviders, llmProvider, llmModel, autonomyLevel |
| AiProjectKnowledge | `ai-project-knowledge.model.js` | thread-local, entries pinned |

**Constat** : on a déjà toutes les briques pour tracer la hiérarchie d'agents. Le problème est plus côté **présentation** (UI) que côté **données**.

---

## 3. Parité provider (Anthropic / OpenAI / Responses)

> Le user a explicitement demandé : *« Et ca doit marcher avec les 2 providers claude ou openai de la meme facon avec aucun bug »*. Cette section analyse les divergences actuelles.

### 3.1 Trois clients distincts

| Fichier | LOC | API | Modèles ciblés |
|---|---|---|---|
| `llm/anthropic.js` | 266 | `/v1/messages` | claude-* |
| `llm/openai.js` | 211 | `/v1/chat/completions` | gpt-4*, gpt-3.5* |
| `llm/openai-responses.js` | 407 | `/v1/responses` | gpt-5*, o1*, o3*, o4* |

Le sélecteur (`llm/index.js`) :
```js
if (provider==='anthropic') → streamAnthropic
else if (model match /^(gpt-5|o[1-9])/ && !forceChatCompletions) → streamOpenAIResponses
else → streamOpenAI
```

### 3.2 Divergences observées

**A. `temperature` non supporté sur certains modèles Anthropic**
- `anthropic.js:23` : `supportsTemperature = !modelId.includes('opus-4-7') && !modelId.includes('opus-4-6')` — patch ad-hoc
- OpenAI Responses : `temperature` ignoré pour les modèles reasoning, à la place `reasoning_effort` + `verbosity`
- **Risque** : si un agent custom est créé avec `temperature: 0.3` et qu'il bascule entre Opus 4.7 et GPT-4, le comportement diverge silencieusement.

**B. Max tokens par défaut différent**
- `anthropic.js:27` : Opus → 16384, autres → 4096
- `openai.js` / `openai-responses.js` : valeur env `AI_MAX_TOKENS=16384` ou défaut
- **Risque** : génération longue (docx, csv) → coupée différemment selon le provider.

**C. Reasoning effort / verbosity**
- Seul OpenAI Responses utilise `AI_REASONING_EFFORT` et `AI_VERBOSITY`
- Anthropic n'a pas d'équivalent natif (extended thinking ≠ reasoning_effort)
- **Risque** : un même prompt produit des outputs de longueur très différente selon le provider.

**D. Tool calls parallèles**
- OpenAI Responses : `AI_PARALLEL_TOOL_CALLS=0` par défaut (forcé séquentiel)
- Anthropic : pas de contrôle natif, dépend du modèle
- **Risque** : ordre d'exécution des tools différent → side effects dans un ordre différent → bugs subtils sur les SSE.

**E. Multimodal (`_contentBlocks`)**
- `agent-harness.js:1231` : chaque client doit convertir `image`, `document`, `audio`, `input_audio` dans le format provider
- Anthropic : `{ type:'image', source:{type:'base64',media_type,data} }`
- OpenAI chat : `{ type:'image_url', image_url:{url} }`
- OpenAI Responses : `{ type:'input_image', image_url }` ET `{ type:'input_file', file_data }`
- **Risque** : un même fichier docx peut s'afficher correctement avec un provider et planter avec l'autre. Ce dispositif est implicite — pas de test cross-provider.

**F. Usage tokens normalisé**
- Anthropic : `input_tokens`, `output_tokens` (+ `cache_creation`, `cache_read`)
- OpenAI chat : `prompt_tokens`, `completion_tokens`
- OpenAI Responses : `usage.input_tokens`, `usage.output_tokens`, `usage.reasoning_tokens`
- Le harness fait `totalUsage.input += event.usage.input || 0` (`agent-harness.js:634`) — chaque client doit normaliser
- **Risque** : usage `reasoning_tokens` perdu pour Anthropic (n'existe pas) → ratio coût caché.

**G. Stop conditions**
- Anthropic : `stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'`
- OpenAI chat : `finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter'`
- OpenAI Responses : `response.completed.status`
- **Risque** : le harness ne distingue PAS "fini normalement" vs "tronqué pour `max_tokens`". Un agent peut sortir de la boucle sans avoir fini parce que `max_tokens` a été atteint.

### 3.3 Tests croisés manquants

Aucun test ne valide qu'un même flow produit le même résultat avec Anthropic et OpenAI. La seule vérification de parité est :
- `engine_v2_handles.test.js` — pas de cross-provider
- `simulate_barrier.test.js` — pas lié au LLM

**Recommandation** : créer une suite `llm/cross-provider.test.js` qui pour chaque feature critique (ask_user, spawn_subagent, todo_write, permission, multimodal) lance le même scénario avec les 3 clients et vérifie l'équivalence des événements émis.

---

## 4. Bugs identifiés depuis les logs

> Les logs fournis par l'utilisateur montrent un scénario : "Génère une charte graphique provisoire pour c4rbon.group au format docx, affiche-la".

### 4.1 Double `display_file` (hallucination détectée mais autorisée)

```
[harness] tool: display_file {"fileId":"file_mpdvs0il_41912a12","widgetId":"doc-charte-c4rbon-group"}
...
[harness] tool: display_file {"fileId":"file_mpdvrxdi_8fbb6589","widgetId":"charte-c4rbon-docx"}
```

Le même contenu de charte graphique a généré 2 widgets différents. Cause probable :
- Loop 4/15 (probablement un sous-agent doc_writer) appelle `display_file` une fois
- Loop 9/100 (agent principal) le rappelle car il "synthétise" et croit qu'il doit afficher le résultat

Le **garde-fou anti-hallucination** (`agent-harness.js:712-747`) bloque le finalizer SI `spawn_subagent(async)` est dans le même tour. Mais ici le subagent est déjà fini → le garde-fou ne se déclenche pas. C'est l'agent principal qui re-fait le travail.

**Fix proposé** : enrichir le garde-fou pour vérifier *les tours précédents* (regarder `_todoPendingTools` ou `AiMessage.metadata.kind === 'file_inline'` récent dans le thread). Si un fichier identique a été affiché dans les 30 dernières secondes, refuser.

### 4.2 `todo_write` redondant

```
loop 5/15 → todo_write avec items [identification, structure, génération, affichage] tous 'completed' sauf 1
loop 6/15 → todo_write avec MÊMES items, MÊME statut
loop 7/15 → idem
```

Le LLM ré-écrit la liste complète à chaque update. C'est le **pattern Claude Code** (todoWrite par snapshot complet, pas par diff). Côté backend, chaque appel re-écrit l'AiMessage du widget `session-todos`.

**Fix proposé** : `todo_write` calcule un hash du contenu et **skip silencieusement** si identique au dernier write. Économise 1 round-trip LLM + DB par redondance.

### 4.3 Loops concurrents `4/15` et `5/100`

```
[harness] loop 4/15, tools=11      ← sous-agent (maxLoops=15 ou 20)
[harness] loop 5/100, tools=47     ← agent principal (maxLoops=100)
```

Pas un bug en soi : les 2 harnesses tournent en parallèle légitimement. **Problème de lisibilité** : les `console.log` n'identifient pas le `jobId` → impossible de distinguer dans les logs quel loop appartient à quel agent.

**Fix proposé** : préfixer tous les logs harness avec `[harness:JOB_ID]` ou `[harness:parent]` / `[harness:sub:research]`. Plus de confusion.

### 4.4 Polling agressif `GET /threads/:id`

```
GET /api/ai/threads/ait_mpdvmm19_f4be4d88?workspaceId=... 200 6.174 ms - 24525
GET /api/ai/threads/ait_mpdvmm19_f4be4d88?workspaceId=... 200 15.993 ms - 24525
```

Deux GETs identiques back-to-back. Le payload 24525 octets contient le thread + 100 derniers messages (`ai.js:233`). Sur un thread chargé, c'est lourd.

Cause probable : `loadThread()` est appelé depuis plusieurs chemins du code frontend (chat component, fullpage, side bar, work-plan) sans coordination. Le seul mécanisme de coalescence est `scheduleReloadMessages` (400ms) qui n'est PAS partagé avec `loadThread()`.

**Fix proposé** : un **EventBus central** dans `ai.service.ts` qui debounce tous les reloads (`loadThread`, `reloadMessages`, `workplan._load`, `refreshContextUsage`) sur une fenêtre 600ms. Une seule série de fetches par burst.

### 4.5 `work-plan` rechargé en boucle

```
GET /api/ai/threads/6a0d82cf.../work-plan 200 17.339 ms - 2129
GET /api/ai/threads/6a0d82cf.../work-plan 200 13.471 ms - 2129
GET /api/ai/threads/6a0d82cf.../work-plan 200 6.853 ms - 2433
```

Le `work-plan` retourne ~2KB → moins lourd. Mais 3-5 GETs par seconde sur un thread actif = 6-15 KB/s gâchés.

**Fix proposé** : si la composante `work-plan` a un live SSE thread déjà ouvert, les events `canvas.task.*`, `subagent.*` devraient lui suffire pour mettre à jour son état localement. Pas besoin de refetch.

### 4.6 Cumul d'événements `messageId=6a0d83cd...` ré-émis

```
[meta-tools] emit ai.message.created kind=file_inline threadId=...
[meta-tools] emit ai.message.updated kind=todo_list messageId=... threadId=...
```

L'ordre d'émission est imprédictible quand plusieurs sous-agents émettent en parallèle. Le frontend reçoit `ai.message.updated` AVANT `ai.message.created` → l'update échoue silencieusement, refetch nécessaire → reload thread.

**Fix proposé** : ajouter une `sequenceId` monotone sur tous les events thread. Le frontend ignore les events qui arrivent avec `seq < lastSeenSeq + 1` (out-of-order) et déclenche un reload propre.

---

## 5. UX sous-agents et permissions

### 5.1 État actuel du rendu

**Permission request** (`ai-message.component.ts:180-190`) :
```html
<div *ngSwitchCase="'permission_request'" class="widget-bubble perm-request-bubble">
  <ai-permission-request
    [request]="msg.metadata!.permissionRequest!"
    (decided)="..."
  />
</div>
```

Le composant reçoit `permissionRequest` qui contient bien `agentName`, `agentEmoji`, `agentColor`, `agentTagline` (renseignés via `getAgent(jobContext.subagentType)` côté backend dans `agent-harness.js:830`).

**Problème** : on ne sait pas SI ces champs sont effectivement rendus visuellement dans `<ai-permission-request>`. À vérifier dans `permission-request.component.ts`.

**Subagent question** (`ai-message.component.ts:596`) :
```ts
if (sq?.subagentQuestion && sq?.requestId && sq?.parentJobId && !sq?.answer) {
  // affiche le composant question
}
```

Présence d'un flag `subagentQuestion` dans `metadata.extra`. Bon. Mais le composant `<ai-question>` ne semble pas customisé pour afficher "question du sous-agent X".

### 5.2 Recommandation : composant `<ai-agent-badge>` standard

Créer un composant unique réutilisable :
```html
<ai-agent-badge
  [agent]="{ subagentType, agentName, agentEmoji, agentColor, agentTagline, depth, parentJobId }"
  [size]="'sm' | 'md' | 'lg'"
  [showTagline]="true"
  [showDepth]="true"
  (click)="navigateToParent()"
/>
```

À utiliser dans :
- `<ai-permission-request>` — header de la card
- `<ai-question>` — header si subagentQuestion
- `<ai-todo-list>` — déjà utilisé (vérifié `ai-todo-list.component.ts:112`)
- `<ai-agent-report>` — résumé d'exécution d'un sous-agent
- `<ai-message>` — préfixe pour message issu d'un sous-agent
- `<ai-canvas-workplan>` — sur chaque carte task

Avec un **lien cliquable** vers le parent (breadcrumb) : "🤖 Marie (research) ← Tim (doc_writer) ← Agent principal".

### 5.3 Bannière "qui demande quoi" en permission

Aujourd'hui le message backend dit :
```
{agentLabel} demande la permission d'exécuter {toolLabel}
```

Sur un sous-agent doc_writer qui appelle `project_write_file` ça donne :
```
📝 Marie (doc_writer) demande la permission d'exécuter Écrire un fichier projet
```

C'est bien construit côté data. **Le problème est qu'il faut s'assurer que le badge est rendu de façon prominente** (avec couleur de fond, emoji XL, etc.) et que la **provenance hiérarchique** est aussi visible : *« Cette permission a été déclenchée par Marie, qui est elle-même lancée par Tim, qui est ton agent principal. »*

Proposition de design pour la card permission_request :
```
┌──────────────────────────────────────────────────────────────┐
│ 🛡️  Demande de permission                                     │
├──────────────────────────────────────────────────────────────┤
│  📝 Marie  ·  Sous-agent doc_writer  ·  Profondeur 2         │
│  └─ lancé par 🔍 Tim (research) ← 🤖 Agent principal          │
│                                                              │
│  Veut exécuter : Écrire un fichier projet                    │
│  Risque : write                                              │
│  Aperçu : { path: "charte.docx", size: 12 KB }              │
│                                                              │
│  [Autoriser une fois]  [Toujours autoriser]  [Refuser]      │
└──────────────────────────────────────────────────────────────┘
```

(Inspiration directe d'openclaw — cf. § 7.)

---

## 6. Système de mémoire

### 6.1 4 niveaux actuels

```
┌─────────────────────────────────────────────────────────────┐
│ AiUserContext.memory        → global user, toutes convos   │
│ AiWorkspaceContext           → workspace, tous threads     │
│ AiProjectMemory              → projet (flow ou form)       │
│ AiProjectKnowledge           → thread-local, entries       │
└─────────────────────────────────────────────────────────────┘
```

**Outils LLM disponibles** :
- `save_memory(key, value)` / `get_memory()` — global
- `save_project_memory(key, value)` / `get_project_memory()` — projet
- `set_project_knowledge(...)` / `get_project_knowledge()` — thread-local structuré

### 6.2 Ce qui manque côté UI

**Constat utilisateur** : "j'aimerais aussi que l'on revoit le systeme de memoire meme graphique car il y plusieurs mode differents".

Pages/composants existants :
- `ai-settings.component.ts` — affiche mémoire globale + projet en liste clé-valeur
- Aucune vue "graphique" qui montrerait les relations entre mémoires

**Propositions** :

1. **Vue unifiée** : un onglet "Mémoires" dans la fullpage `/ai`, avec 4 sections clairement séparées :
   - Globale (toutes mes conversations)
   - Workspace (tous les threads du workspace)
   - Projet (flow/form courant)
   - Conversation (thread actif)

2. **Indicateur de scope** : chaque entrée mémoire affichée avec un badge de scope (icône + couleur).

3. **Origine de chaque entrée** : qui l'a créée ? Agent ? User ? Sous-agent X ? Date ? Lien vers le message d'origine si possible.

4. **Visualisation graphique** (option avancée) :
   - Un graphe de dépendances entre mémoires (si on annote `dependsOn` lors du save)
   - Une heatmap d'utilisation (quelles mémoires ont été lues dans les 7 derniers jours)

5. **Édition inline** : modifier une valeur, supprimer, pinner, ajouter une description.

6. **Mémoires "suggérées" en attente** : si un sous-agent a appelé `save_memory` mais avec un risque élevé, créer un état "pending" que l'utilisateur valide avant intégration.

### 6.3 Recommandation : extraire en composant `<ai-memory-panel>` réutilisable

Aujourd'hui le code mémoire est éparpillé dans `ai-settings.component.ts`. Le sortir en composant unique avec props `{ scope, threadId?, flowId?, formId? }` permettrait :
- Réutilisation dans la fullpage, dans le panel drawer, dans une éventuelle page admin
- Cohérence visuelle
- Tests unitaires plus faciles

---

## 7. Comparaison avec openclaw

### 7.1 Vue d'ensemble openclaw

openclaw est massivement plus mature et structuré. Quelques métriques :
- `src/agents/acp-spawn.ts` : **1563 LOC** dédiées au spawn de sous-agents (vs nos 576 dans `subagent/sub-runner.js`)
- Architecture **ACP** (Agent Client Protocol) — `@agentclientprotocol/sdk` Anthropic
- SQLite pour le task registry (`src/tasks/task-registry.store.sqlite.ts`) — durable hors process
- Per-agent auth profiles : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- `event-ledger.ts` + `event-mapper.ts` : modèle d'événements unifié

### 7.2 Patterns notables à adopter

**A. Permission options à 3 niveaux** (`acp/permission-relay.ts:50-77`)
```ts
const decisions = ["allow-once", "allow-always", "deny"];
```
Aujourd'hui Homeport propose seulement `allow / deny`. Ajouter `allow-always` (avec un scope : par tool, par fichier, par session) éliminerait 80% des prompts répétitifs.

**B. Approbation par scope** (`acp-spawn.ts`)
- `scope: { path, pattern }` dans le PermissionRequestSchema
- Une approbation "allow-always" peut cibler `scope: { pattern: "*.docx" }` ou `scope: { path: "/projet/charte/" }`
- Stocké dans `AiPermissionGrant` (modèle déjà existant chez nous mais sous-utilisé)

**C. ACP protocol stabilisé**
- Anthropic a publié l'Agent Client Protocol : interface stable pour parent ↔ child agent
- Communication via JSON-RPC over stdio ou websocket
- Permet à n'importe quel client (terminal, web, IDE) de consommer le même agent backend
- **Pour Homeport** : adopter ACP côté backend permettrait à terme d'avoir un agent CLI, un agent Slack, etc. sans dupliquer le runtime

**D. Lean code & boundaries**
- openclaw `CLAUDE.md` : *"Fix shape: default to clean bounded refactor, not smallest patch. Move ownership to right boundary; delete stale abstractions, duplicate policy, dead branches, wrappers, fallback stacks."*
- Notre `agent-harness.js` à 1317 lignes mélange permissions, anti-hallu, anti-loop, mailbox, todo nudge, etc. → c'est exactement le type de fichier que leur philosophie découperait.

**E. Buffer text + flush décalé**
- openclaw (et claude-code) : agréger les `text_delta` en buffer puis flush toutes les 500ms vers DB
- Réduit drastiquement les writes Mongo en streaming
- Chez nous, chaque text_delta yield → frontend reçoit en live, mais le persist en DB se fait à la fin du tour (donc déjà OK), MAIS le frontend rerender à chaque delta → peut saturer Angular en frame

**F. Bounded transcript**
- openclaw garde N derniers messages avec **token budget** (pas count)
- Chez nous : `slice(-400)` sur le transcript — OK mais ne tient pas compte de la taille
- Si 400 messages contiennent 3 images base64, on déborde la context window

**G. Provider strict & versionné**
- openclaw : version pinning explicit, profile par agent, séparation `~/.openclaw/agents/<id>/`
- Chez nous : provider/model par env globale + override agent — pas de profile persisté

**H. Tests cross-provider**
- openclaw a `anthropic-transport-stream.test.ts`, `anthropic-vertex-stream.test.ts`, `anthropic-payload-policy.test.ts` etc.
- Tests systématiques de chaque provider
- Notre suite n'a quasiment pas de tests LLM cross-provider

### 7.3 Patterns à NE PAS copier

- **SQLite local** : on est multi-tenant SaaS → MongoDB c'est bien
- **CLI-first** : on est web-first, pas besoin d'embrasser le terminal au début
- **pnpm workspaces complexes** : leur monorepo a 200+ packages — overkill pour nous

---

## 8. Recommandations priorisées

### 8.1 P0 — Unifier la couche LLM

**Pourquoi** : la parité provider explicitement demandée par le user n'est PAS garantie aujourd'hui.

**Quoi** :
1. Créer une interface `LlmAdapter` unique avec contrat strict :
   ```ts
   interface LlmAdapter {
     stream(messages: NormalizedMessage[], tools: NormalizedTool[], opts: NormalizedOpts): AsyncGenerator<NormalizedEvent>;
     supportsTemperature(): boolean;
     supportsReasoning(): boolean;
     getMaxOutputTokens(): number;
   }
   ```
2. Chaque provider implémente l'adaptateur. Le harness ne connaît plus que `LlmAdapter`.
3. Tests cross-provider obligatoires (CI) : un même flow (ask_user, spawn_subagent, todo_write, multimodal) doit produire des events équivalents.
4. Normaliser `usage` (input, output, reasoning, cache_read, cache_creation) sur les 3 providers.
5. Détecter `truncated_for_max_tokens` côté harness — si un tour finit pour `max_tokens` et n'a pas appelé `done`, c'est une coupure → retry ou message clair au user.

**Effort** : 2-3 jours.

### 8.2 P0 — Coordinateur central de reloads frontend

**Pourquoi** : polling 50-200ms observé → backend surchargé.

**Quoi** :
- `ReloadCoordinator` dans `ai.service.ts` qui debounce TOUTES les requêtes de refresh sur 600ms.
- Toutes les sources (`loadThread`, `reloadThreadMessages`, `workplan._load`, `refreshContextUsage`, `refreshPendingKnowledgeCount`) passent par lui.
- Une seule rafale de fetches par burst d'événements SSE.

**Effort** : 1 jour.

### 8.3 P0 — Sequence ID sur events thread

**Pourquoi** : out-of-order events → reload de rattrapage → surcharge.

**Quoi** :
- Chaque `emitThreadEvent` reçoit un `seq` monotone par thread (compteur Redis ou champ Mongo).
- Frontend stocke `lastSeenSeq`. Si `seq <= lastSeenSeq` → ignore. Si `seq > lastSeenSeq + 1` → reload.

**Effort** : 0.5 jour.

### 8.4 P1 — Composant `<ai-agent-badge>` unifié

**Pourquoi** : le user ne distingue pas qui demande quoi.

**Quoi** :
- Composant Angular réutilisable.
- Props : `{ agent: { subagentType, agentName, agentEmoji, agentColor, agentTagline }, depth, parentJobId, size, showHierarchy }`
- Utilisé dans toutes les cards où un agent intervient (permission, question, todo, message, work-plan).
- Lien cliquable vers le parent / breadcrumb hiérarchique.

**Effort** : 1 jour.

### 8.5 P1 — Permission `allow-always` avec scope

**Pourquoi** : éliminer les prompts répétitifs sur tools sûrs.

**Quoi** :
- Ajouter `allow-always` aux choix de permission.
- Stocker dans `AiPermissionGrant` avec scope : `{ toolName, pattern?, threadId?, workspaceId? }`.
- `checkPermission` consulte les grants AVANT de demander.
- UI Settings : page "Permissions accordées" pour révoquer.

**Effort** : 2 jours.

### 8.6 P1 — Logs harness préfixés par `jobId`

**Pourquoi** : impossible aujourd'hui de tracer un sous-agent dans les logs.

**Quoi** :
- Wrapper `createLogger(jobId, subagentType)` qui préfixe tous les `console.log` du harness.
- `[harness:AGT1234567:main]`, `[harness:SUB7654321:research]`.

**Effort** : 0.5 jour.

### 8.7 P2 — Hash de déduplication `todo_write`

**Pourquoi** : todos réécrits 3-4× à l'identique.

**Quoi** :
- Calculer `crypto.createHash('sha1').update(JSON.stringify(todos)).digest('hex')`.
- Si identique au dernier write, retourner success sans persist ni emit event.

**Effort** : 0.5 jour.

### 8.8 P2 — Anti-doublon `display_file` / finalizers

**Pourquoi** : cas observé dans les logs.

**Quoi** :
- `display_file` consulte les `AiMessage` du thread sur les 30 dernières secondes.
- Si même `fileId` déjà affiché → retourner success silencieux avec ref vers widget existant.

**Effort** : 0.5 jour.

### 8.9 P2 — Refonte UI mémoire

**Pourquoi** : demande explicite user.

**Quoi** :
- Composant `<ai-memory-panel>` avec 4 onglets (global / workspace / projet / thread).
- Badge scope sur chaque entrée.
- Origine (qui a créé, quand).
- Édition inline, suppression, pin.
- Onglet "suggestions en attente".
- (Optionnel V2) graphique de dépendances.

**Effort** : 3 jours.

### 8.10 P3 — Tests cross-provider en CI

**Pourquoi** : éviter les régressions silencieuses de parité.

**Quoi** :
- Suite `test/llm/parity/*.test.js` avec 3 fixtures (Anthropic / OpenAI / Responses).
- Pour chaque feature : asserts sur la séquence d'events normalisés.
- Mock des HTTP responses (pas de réseau).

**Effort** : 2 jours.

### 8.11 P3 — Adoption progressive d'ACP

**Pourquoi** : interopérabilité long terme + bénéficier des outils Anthropic.

**Quoi** :
- Phase exploratoire : lire la spec ACP, prototyper un mapping Homeport ↔ ACP.
- Décider si on adopte le protocole "tel quel" en interne ou si on garde notre format.
- Documenter dans un ADR.

**Effort** : 1-2 jours d'exploration.

---

## 9. Plan d'action phasé

### Sprint 1 (1 semaine) — Corrections critiques

- [ ] **8.1** Unifier la couche LLM (LlmAdapter + tests parité minimaux)
- [ ] **8.2** ReloadCoordinator frontend
- [ ] **8.3** Sequence ID sur events thread
- [ ] **8.6** Logs harness préfixés
- [ ] Lancer en parallèle : créer les tasks GitLab / Linear

### Sprint 2 (1 semaine) — UX sous-agents

- [ ] **8.4** Composant `<ai-agent-badge>` + intégration dans tous les emplacements
- [ ] **8.5** Permission `allow-always` + page Settings de gestion
- [ ] **8.7** Hash dedup `todo_write`
- [ ] **8.8** Anti-doublon finalizers

### Sprint 3 (1 semaine) — Mémoire

- [ ] **8.9** Refonte `<ai-memory-panel>` avec 4 scopes + édition + origine

### Sprint 4+ (long terme)

- [ ] **8.10** Suite tests cross-provider exhaustive en CI
- [ ] **8.11** ADR sur adoption ACP
- [ ] Découpage de `agent-harness.js` (1317 LOC) en modules : permissions, anti-hallu, anti-loop, mailbox, todo-control
- [ ] Découpage de `ai.js` (3523 LOC) en sous-routeurs : threads, messages, jobs, context, agents, work-plan

---

## Annexe A — Liens fichiers principaux

| Fichier | Rôle | LOC |
|---|---|---|
| `API/src/ai/agent-harness.js` | Boucle principale agent | 1317 |
| `API/src/ai/agent-runner.js` | Legacy runner (fallback onboarding) | 370 |
| `API/src/ai/subagent/sub-runner.js` | Spawn de sous-agents | 576 |
| `API/src/ai/subagent/roster.js` | Catalogue d'agents (name, emoji, color, tagline) | 194 |
| `API/src/ai/llm/anthropic.js` | Client Anthropic | 266 |
| `API/src/ai/llm/openai.js` | Client OpenAI ChatCompletions | 211 |
| `API/src/ai/llm/openai-responses.js` | Client OpenAI Responses | 407 |
| `API/src/ai/permissions/permission-gate.js` | checkPermission | ? |
| `API/src/ai/jobs/job-events.js` | pub/sub events | ? |
| `API/src/ai/jobs/job-runner.js` | runner async de subagents | ? |
| `API/src/modules/db/ai.js` | Routes HTTP + SSE | 3523 |
| `Homeport/src/app/features/ai/ai.service.ts` | Service Angular | 1900+ |
| `Homeport/src/app/features/ai/ai-message.component.ts` | Rendu messages | 1500+ |
| `Homeport/src/app/features/ai/canvas/ai-canvas-workplan.component.ts` | Work-plan canvas | 450+ |
| `Homeport/src/app/features/ai/todo-list/ai-todo-list.component.ts` | Liste todos | 460+ |

## Annexe B — Variables d'environnement clés

| Variable | Défaut | Usage |
|---|---|---|
| `AI_PROVIDER` | openai | force provider |
| `AI_DEFAULT_MAX_LOOPS` | 100 | max tours harness principal |
| `AI_MAX_SUBAGENT_DEPTH` | 3 | profondeur max sous-agents |
| `AI_STREAM_TIMEOUT_MS` | 240000 | timeout entre 2 events LLM |
| `AI_SUBAGENT_HEARTBEAT_TIMEOUT_MS` | 180000 | timeout heartbeat subagent |
| `AI_REASONING_EFFORT` | none | OpenAI Responses uniquement |
| `AI_VERBOSITY` | medium | OpenAI Responses uniquement |
| `AI_PARALLEL_TOOL_CALLS` | 0 | OpenAI Responses uniquement |
| `AI_MAX_TOKENS` | 16384 | défaut max_tokens |
| `AI_TEMPERATURE` | 0.7 | défaut température |
| `AI_FORCE_CHAT_COMPLETIONS` | — | force OpenAI vers /v1/chat/completions au lieu de /v1/responses |
| `AI_DISABLE_SUBAGENT_ASYNC` | — | rollback flag pour mode sync subagents |

## Annexe C — Glossaire

- **Harness** : boucle principale de l'agent. 1 tour = 1 appel LLM + 0..N tools exécutés.
- **Capsule** : pack d'outils activable dynamiquement (workflow, form, node_args, web, project_fs).
- **Sub-agent** : agent enfant lancé via `spawn_subagent`. Tourne dans son propre AiJob avec son propre harness.
- **Job** : entité durable persistée en Mongo (`AiJob`). Sert au resume après crash.
- **Mailbox** : `pendingMessages` dans AiJob. Messages reçus pendant l'exécution, injectés au prochain tour.
- **Side event** : événement émis par un tool (patch graph, snapshot, etc.) qui est forwardé au builder frontend.
- **Capsule activation** : `activate_capsule(name)` charge dynamiquement les outils d'une capsule.
- **Anti-hallucination** : garde-fou qui bloque un finalizer (`display_file`, `render_structured`) si `spawn_subagent(async)` est lancé dans le même tour.
- **ACP** : Agent Client Protocol — protocole Anthropic pour communication entre clients d'agents (utilisé par openclaw).
- **Autonomy level** : `prudent | balanced | autonomous` — niveau d'autonomie de l'agent (impacte permissions).

---

**Fin du document.**

Pour discussion ou priorisation différente, ouvrir une issue / appeler / ping en commentaire de ce doc.
