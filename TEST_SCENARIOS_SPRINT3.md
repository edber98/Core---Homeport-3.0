# Scénarios de test — Sprint 3 (sous-agents + permissions + UX)

> Prompts à coller dans le chat pour valider le comportement avant Sprint 4.
> Branche concernée : feat/add_connecters (ou current)

---

## Comment tester

1. Ouvre un nouveau thread (mode `chat` ou `project`)
2. Copie-colle exactement le prompt indiqué
3. Vérifie les checkpoints visuels et logs (`tail -f` sur tes logs serveur si possible)
4. Si quelque chose part en vrille → note le seq de l'event SSE et le job ID dans les logs

---

## Scénario 1 — Sous-agent simple qui revient bien au parent

**But** : vérifier le cycle complet `spawn_subagent (sync) → exécution → résultat retourné au parent → parent finalise`.

**Prompt à coller** :
```
Lance un sous-agent research pour me trouver les 3 meilleurs frameworks JavaScript de tableau de bord (dashboard) open-source en 2026, en mode synchrone. Tu attends son résultat puis tu me fais un résumé en 5 lignes.
```

**Ce que tu dois voir** :
- Tool tag `spawn_subagent` apparaît dans le flux
- Le sous-agent apparaît dans le canvas/work-plan (à droite si ouvert) avec son badge agent (Tim research)
- À la fin : un AgentReport card pour le sous-agent
- L'agent principal écrit son résumé 5 lignes après
- **Logs attendus** : `[harness:JOBPARENT:main]` puis `[harness:JOBSUB:research:d=1]` qui tourne en parallèle, puis le parent reprend

**Si bug** : message blank à la fin = le bug "ai.message.created manquant" est revenu (mais on l'a fixé Sprint 2)

---

## Scénario 2 — Sous-agent async + parent qui attend le résultat

**But** : vérifier l'auto-resume après async-spawn.

**Prompt à coller** :
```
Lance 2 sous-agents research en PARALLELE :
1. Cherche les prix des principaux iPaaS (Zapier, Make, n8n, Tray)
2. Cherche les iPaaS open-source qui montent en 2026

Quand les 2 ont fini, fais une note de synthèse comparant les 2 résultats.
```

**Ce que tu dois voir** :
- 2 tool calls `spawn_subagent` simultanés (mode parallel array OU 2 appels async)
- Texte court du parent du genre "Subagents lancés, je reviens avec les résultats"
- Anti-hallucination devrait kick in si le LLM essaie un finalizer au même tour
- Les 2 subagents tournent dans le canvas (statut running)
- Quand les 2 finissent → le parent est auto-resumé avec un prompt de synthèse
- Le parent écrit son résumé final

**Logs attendus** :
```
[harness:JOBPARENT:main] tool: spawn_subagent {...async:true...}
[harness:JOBSUB1:research:d=1] start
[harness:JOBSUB2:research:d=1] start
... les 2 tournent ...
[harness:JOBSUB1:research:d=1] done
[harness:JOBSUB2:research:d=1] done
[harness] auto-resume parent JOBPARENT (all subagents complete)
[harness:JOBPARENT:main] stream complete
```

---

## Scénario 3 — Permission demandée par sous-agent + escalation user

**But** : un sous-agent veut exécuter un tool sensible, escalade au parent + l'user.

**Prompt à coller** :
```
Lance un sous-agent doc_writer en mode synchrone qui doit écrire un fichier projet "test-permission.md" avec le contenu "Hello permission test". Configure-le avec toolsAllowed=['project_write_file'].
```

**Ce que tu dois voir** :
1. Le sous-agent apparaît dans le canvas (Marie ou autre)
2. Une card permission_request apparaît dans le chat :
   - **Bandeau violet en haut** : "Demande venant d'un 🤖 [BADGE AGENT]"
   - Fond légèrement teinté violet
   - Tool: "Écrire un fichier projet"
   - 4 boutons : Une fois / Cette conversation / Toujours / Refuser
   - Pulse subtil sur le border (animation Sprint 3)
3. Tu cliques sur "Toujours" → la card passe en mode disabled avec tag vert
4. Le sous-agent écrit le fichier et termine
5. Le parent reprend et conclut

**Bug à chercher** : si le bandeau "venant d'un sous-agent" n'apparaît pas → check `request.childJobId` côté backend (il doit être présent dans la card metadata).

---

## Scénario 4 — Permission qui se propage à d'autres demandes pending

**But** : "Toujours autoriser" sur 1 tool propage la décision aux autres cards en attente pour le même tool.

**Prompt à coller** :
```
Lance 3 sous-agents doc_writer EN MEME TEMPS (parallel), chacun doit écrire un fichier différent (a.md, b.md, c.md). Configure-les tous avec toolsAllowed=['project_write_file'].
```

**Ce que tu dois voir** :
1. 3 cards permission_request apparaissent presque simultanément
2. Tu cliques sur "Toujours" sur LA PREMIÈRE
3. Les 2 autres cards passent automatiquement en "Toujours autorisé — propagé"
4. Les 3 sous-agents écrivent leurs fichiers en parallèle

**Logs attendus** :
```
[perm-resolve] job=SUB1 requestId=R1 decision=always (normalized=allow)
[perm-resolve] propagated "always" to 2 other pending project_write_file requests in thread XYZ
```

---

## Scénario 5 — Question (ask_user) depuis un sous-agent

**But** : sous-agent demande à l'user via ask_user, parent escalade.

**Prompt à coller** :
```
Lance un sous-agent general en mode synchrone qui doit me demander mon prénom via ask_user, puis l'utiliser pour écrire un message "Bonjour <prénom>" dans le chat via send_message_to_agent({to:'user'}).
```

**Ce que tu dois voir** :
1. Le sous-agent démarre
2. Question apparaît dans le chat avec badge "Sous-agent question" + nom de l'agent
3. Tu réponds avec ton prénom
4. Le sous-agent reçoit la réponse via `waitForAskUserFromParent`
5. Le message "Bonjour <prénom>" apparaît dans le chat (kind: comment + badge agent)
6. Le sous-agent termine
7. Parent reprend et conclut

---

## Scénario 6 — ask_parent_agent (nouveau S3.2)

**But** : un sous-agent pose une question SYNCHRONE au LLM parent, attend sa réponse.

**Prompt à coller** :
```
Lance un sous-agent research pour me trouver des outils de monitoring web open-source. Demande-lui d'utiliser ask_parent_agent pour me clarifier s'il faut inclure les outils self-hosted seulement ou aussi les SaaS gratuits, avant de chercher.
```

**Ce que tu dois voir** :
1. Sous-agent démarre
2. Le sous-agent appelle `ask_parent_agent({question: "self-hosted only ou SaaS gratuit aussi ?"})`
3. **Backend** : mini-call LLM sur le parent → parent répond (ex: "Inclus aussi les SaaS gratuits")
4. **Chat** : 2 messages parent_child_exchange apparaissent :
   - Question (badge sous-agent)
   - Réponse parent (badge agent principal)
5. Le sous-agent reçoit la réponse et continue sa recherche
6. Résultats incluent SaaS gratuits

**Cas alternatif (escalation user)** :
Si tu poses une question pour laquelle le parent n'a pas l'info :
- Parent répond avec `ESCALATE_TO_USER: <question>`
- Le sous-agent voit `escalated_to_user: true` et peut appeler `ask_user` lui-même

---

## Scénario 7 — Permission Allow-Always avec scope path

**But** : tester la grant persistante avec un scope path.

**Prompt à coller** :
```
Lance un sous-agent doc_writer synchrone qui doit écrire 3 fichiers dans /docs/ : intro.md, body.md, conclusion.md. toolsAllowed=['project_write_file'].
```

**Ce que tu dois voir** :
1. Première card permission `project_write_file` apparaît
2. Tu coches "Étendre au workspace" + pattern `/docs/*`
3. Tu cliques "Toujours"
4. Card passe en "Toujours autorisé"
5. Les 2 autres écritures dans /docs/ passent sans demander
6. Backend : `AiPermissionGrant` créé avec scope.pattern='/docs/*'

**Test bonus** : dans une autre conversation du même workspace, essaye encore `project_write_file` dans /docs/ → devrait passer sans demander. Hors /docs/ → demande à nouveau.

---

## Scénario 8 — Dedup display_file (anti-doublon)

**But** : si le LLM appelle display_file 2× pour le même fileId sans widgetId explicite, le 2ème call retourne le widget existant.

**Prompt à coller** :
```
Génère un document Word .docx avec "Bonjour le monde" comme contenu. Puis utilise display_file pour me l'afficher. Puis affiche-le UNE NOUVELLE FOIS (oui, redondant exprès pour le test).
```

**Ce que tu dois voir** :
1. `generate_document` produit un fileId
2. Premier `display_file(fileId)` → widget visible
3. Deuxième `display_file(fileId)` → dans les logs : `[meta-tools] display_file dedup: fileId=XXX already shown recently`
4. Tool result retourne `deduplicated: true` + ref au widget existant
5. **PAS de 2ème widget** dans le chat

---

## Scénario 9 — Dedup todo_write (hash content)

**But** : si le LLM ré-écrit la même liste de todos sans changement, skip persist + emit.

**Prompt à coller** :
```
Crée une todo list avec 3 items : "tâche 1" (in_progress), "tâche 2" (pending), "tâche 3" (pending). Puis APPELLE EXACTEMENT le même todo_write une 2ème fois (oui, redondant exprès).
```

**Ce que tu dois voir** :
1. Premier todo_write → widget todo apparaît
2. Deuxième todo_write → dans les logs : `[meta-tools] todo_write dedup: hash unchanged (XXXXXX) — skip persist`
3. Tool result retourne `deduplicated: true`
4. **PAS de double notification dans l'UI**

---

## Scénario 10 — Anti self-redundancy LLM (gros bug user d'avant)

**But** : forcer un cas où le LLM voudrait appeler openai_chat_completion pour une micro-question oui/non.

**Prompt à coller** :
```
Génère-moi un document Word de promesse d'embauche pour Jean Dupont, poste développeur, 45k€. À CHAQUE étape, demande-toi via openai_chat_completion si ta progression est cohérente (questions oui/non).
```

**Ce que tu dois voir** :
1. Premier `openai_chat_completion` passe (cas légitime potentiel)
2. Deuxième → **BLOQUÉ** par le garde-fou
3. Logs : `[harness] anti-self-redundancy: BLOCKED openai_chat_completion`
4. Tool result : `self_redundancy_blocked` avec message pédagogique
5. Le LLM doit alors continuer SANS faire d'autres appels openai_chat_completion → il génère le doc directement

**Sans ce fix** : tu verrais 20-30 appels openai_chat_completion en boucle gâchant les crédits (le vrai bug user originel).

---

## Scénario 11 — SSE master + replay (Sprint 2)

**But** : vérifier que perdre la connexion ne perd pas les events.

**Procédure** :
1. Démarre un long flow (Scénario 1 par exemple)
2. Pendant le streaming, **désactive ton wifi 5 secondes** (ou kill l'onglet et rouvre)
3. Reconnecte → la page doit re-charger et tu dois voir les events manqués

**Logs attendus** :
```
[sse-master] replay 12 events for thread=XYZ since seq=45
```

---

## Scénario 12 — Style ChatGPT-like (Sprint 3 UX)

**But** : vérifier le rendu visuel.

**Procédure** :
1. Envoie un message court → tu dois voir une bulle gris clair (#f4f4f4) à droite, texte foncé
2. Réponse de l'agent → texte sans bulle, sans border, animation slide-up
3. Sur écran ≥ 1440px : padding-left 48px côté assistant
4. Sur écran < 1440px : assistant pleine largeur
5. Conversation centrée à max 768px
6. Footer (input) **sans border-top**, centré au même endroit
7. Textarea par défaut **3 lignes** visible (plus grand qu'avant)

---

## Logs utiles à grep

Backend logs (`tail -f /path/to/api/log` ou console) :

```bash
grep '\[harness' logs.txt | head -50          # toute l'activité harness
grep 'spawn_subagent' logs.txt                # spawns
grep 'permission' logs.txt                    # flux permission
grep 'dedup' logs.txt                         # antidoublons qui kick
grep 'self-redundancy' logs.txt               # garde-fou LLM
grep '\[sse-master\]' logs.txt                # replay
grep 'ai\.message\.created' logs.txt          # events émis
```

Frontend (DevTools console) :
- `[live-stream] ai.message.created received` → events reçus
- `[passive-stream] ...` → events legacy

---

## Si quelque chose part en vrille

1. Copie-colle les 50 dernières lignes de logs backend
2. Copie-colle les events SSE du DevTools (Network → /live → EventStream)
3. Note le `seq` de l'event où ça part en vrille
4. Note le `jobId` du sous-agent concerné si applicable
