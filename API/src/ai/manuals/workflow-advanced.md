# Manuel workflow : Parallèle, barrière, credentials, déploiement, modes

<!-- @topic:parallel_barrier -->
## Exécution parallèle, barrière et race

### Branches parallèles

Le moteur d'exécution exécute les branches en **parallèle** quand un node a plusieurs sorties connectées. Exemple :

```
[Trigger] → [Node A] → [Node B1] (branche 1)
                      → [Node B2] (branche 2)
                      → [Node B3] (branche 3)
```

Les nodes B1, B2 et B3 s'exécutent **en même temps**, sans attendre les uns les autres.

### Convergence : Connecter plusieurs sorties vers 1 seul node

Quand plusieurs branches parallèles doivent converger vers un seul node en aval :

```
[Node B1] → [Node C]  ← reçoit de B1 ET B2 ET B3
[Node B2] →
[Node B3] →
```

**Comportement par défaut (barrier/attendre tous)** : Le moteur ATTEND que TOUTES les branches arrivent avant d'exécuter le node C. C'est le comportement standard quand un node a plusieurs connexions entrantes.

**Ce qui se passe** :
- Le moteur compte les edges entrantes du node C
- Chaque branche qui arrive est mise en attente
- Quand la dernière branche arrive → les messages sont **fusionnés** et le node C s'exécute
- Le `payload` du node C devient un **tableau** des payloads de toutes les branches
- Les résultats individuels des nodes (par nodeId) restent accessibles normalement

### Construire une convergence

Pour construire un pattern "fan-out / fan-in" :

```
Phase A (structure) :
1. add_node(nodeA)        → Noeud qui lance les branches
2. add_node(nodeB1)       → Branche 1
3. connect_nodes(nodeA, nodeB1)
4. add_node(nodeB2)       → Branche 2
5. connect_nodes(nodeA, nodeB2)
6. add_node(nodeC)        → Noeud de convergence
7. connect_nodes(nodeB1, nodeC)   ← première connexion entrante
8. connect_nodes(nodeB2, nodeC)   ← deuxième connexion entrante
9. auto_layout

Phase B (configuration) :
- Configurer B1, B2 normalement
- Pour C : propose_context_mapping(nodeC) → retourne les résultats de B1 ET B2
```

### Accès aux données après convergence

Après la barrière, dans le node C :
- `{{ nodeB1.champ }}` → résultat de la branche 1
- `{{ nodeB2.champ }}` → résultat de la branche 2
- `payload` → tableau des payloads fusionnés (rarement utilisé directement)

**IMPORTANT** : `propose_context_mapping(nodeC)` retourne les expressions de TOUTES les branches en amont. Utilise-les.

### Cas spécial : Race (premier arrivé)

Le mode "race" exécute le node C dès que la **première** branche arrive, sans attendre les autres. Ce mode est utilisé avec le type de node `race` (si disponible dans les templates).

---

<!-- @topic:credentials -->
## Gestion des credentials

### Détection automatique

Quand tu ajoutes un node avec `add_node`, le système :
1. Vérifie si le provider du template nécessite des credentials (`hasCredentials: true`)
2. Cherche les credentials existants dans le workspace pour ce provider
3. **Auto-assigne** le premier credential trouvé au node
4. Retourne le statut dans la réponse :
   - `credentialId: "xxx"` + `credentialNote: "Credential auto-assigné"` → OK
   - `credentialMissing: true` → Aucun credential disponible, il faut en créer

### Quand les credentials manquent

Si `add_node` retourne `credentialMissing: true` :
1. Informe l'utilisateur que des credentials sont nécessaires
2. Propose de créer les credentials : `open_credentials(providerKey)`
3. Ou vérifie s'il y en a : `list_credentials(providerKey)`

### Choisir entre plusieurs credentials

Si un provider a plusieurs credentials (ex: plusieurs comptes email, plusieurs instances Odoo) :
1. `list_credentials(providerKey)` → liste tous les credentials disponibles
2. `ask_user` → propose les choix à l'utilisateur
3. `set_node_credential(nodeId, credentialId)` → assigne le bon credential

### Outils disponibles

| Outil | Description |
|-------|-------------|
| `list_credentials(providerKey)` | Liste les credentials du workspace pour un provider (meta-tool, toujours dispo) |
| `set_node_credential(nodeId, credentialId)` | Assigne un credential à un node (workflow tool) |
| `open_credentials(providerKey)` | Ouvre la fenêtre de création de credentials (meta-tool) |

### Bonnes pratiques

- Vérifie toujours les credentials après `add_node` si le node en a besoin
- Si `add_node` a auto-assigné un credential, pas besoin de faire plus
- Si le provider a plusieurs credentials, demande à l'utilisateur lequel utiliser
- Ne laisse JAMAIS un node sans credential si le provider en exige (la validation le signalera)

---

<!-- @topic:deployment -->
## Déploiement et production

Tu peux gérer le cycle de vie du workflow :

- `get_deployment_status` → Vérifier si le workflow est en production.
- `deploy_flow` → Mettre en production (si le flow a un noeud event/trigger).
- `undeploy_flow` → Arrêter la production.
- `start_run` → Lancer une exécution manuelle.
- `list_runs(limit, offset, status)` → Consulter l'historique (pagination, max 50).
- `get_run_stats` → Statistiques : total, succès, erreurs, durée moyenne.

Propose le déploiement quand le workflow est prêt et contient un trigger.

---

<!-- @topic:modify_existing -->
## Modifier un workflow existant

### Étape M1 — Comprendre l'existant (OBLIGATOIRE)

1. `list_graph` → Obtenir l'état complet : tous les nodes, leurs connexions, leurs types.
2. **Analyser la structure** : Quel est le trigger ? Quels nodes sont connectés à quoi ? Quel est le flux de données ?
3. **Comprendre les données** : Pour les nodes que tu veux modifier ou après lesquels tu veux ajouter, utilise `propose_context_mapping` pour savoir quelles données sont disponibles.

### Étape M2 — Planifier les changements

Avant de modifier quoi que ce soit, identifie PRÉCISÉMENT :
- Quels nodes ajouter (et OÙ les connecter dans la chaîne existante).
- Quels nodes modifier (set_node_args, replace_node).
- Quels nodes supprimer.
- Quelles connexions ajouter/supprimer.

**ATTENTION pour l'ajout au milieu d'une chaîne** : Si tu ajoutes un node entre A et B :
1. Déconnecte A→B : `disconnect_nodes(A, B)`.
2. Ajoute le nouveau node C : `add_node`.
3. Connecte A→C : `connect_nodes(A, C)`.
4. Connecte C→B : `connect_nodes(C, B)`.

### Étape M3 — Appliquer les modifications

Pour chaque modification :
- **Ajout** : `add_node` + `connect_nodes` IMMÉDIATEMENT + `set_node_args` + `set_node_description`.
- **Modification d'args** : `set_node_args`.
- **Remplacement** : `replace_node` (garde la position et les connexions).
- **Suppression** : `remove_node` (supprime aussi les connexions).

### Étape M4 — Vérifier et finaliser

1. `auto_layout` → Si la structure a changé.
2. `validate_flow` → Vérifier. Corriger les erreurs s'il y en a.
3. NE PAS appeler `save_flow` en mode builder — l'utilisateur sauvegarde quand il est prêt.

---

<!-- @topic:template_search -->
## Recherche de templates — stratégie optimale

La recherche détecte automatiquement les providers et gère les synonymes FR/EN.

### Stratégie de recherche

1. **Recherche combinée** : `get_templates("openai chat completion")` → détecte provider=openai automatiquement.
2. **Explorer un provider** : `get_templates(provider="slack")` SANS query → liste TOUTES les actions du provider.
3. **Filtrer par type** : `get_templates(type="event")` pour trouver les triggers/déclencheurs.
4. **Si peu de résultats** → explore le provider complet, puis cherche avec un seul mot-clé.
5. **Synonymes automatiques** : "envoyer" trouve aussi "send", "classifier" trouve "classify", "trigger" trouve "event", etc.
6. Les noms de providers sont résolus dynamiquement depuis la DB (nom, titre, tags, clé).

### Évaluation des templates

**Étape 1 — Filtrer par pertinence**
- Lis la **description** de chaque template, pas juste le nom.
- Vérifie que le **type** correspond au besoin (function pour action, event pour trigger, etc.).
- Si un template a un `hint` ou `classifierSuggestions` dans la réponse → **LIS-LES** et utilise les suggestions.
- Si la réponse contient un avertissement de classification → utilise le classifier, PAS le chat_completion.

**Étape 2 — Choisir le template le plus ADAPTÉ (pas le premier)**
- Un classifier (routage multi-branche) est TOUJOURS meilleur qu'un chat_completion pour du tri/catégorisation.
- Un extracteur IA est TOUJOURS meilleur qu'un chat_completion pour extraire des données structurées.
- Un template spécifique (ex: `trello_create_card`) est TOUJOURS meilleur qu'un template générique (ex: `http_request`).
- `get_template_details(key)` donne les args et sorties → vérifie que ça correspond AVANT d'ajouter le node.

**Étape 3 — Résoudre les choix de provider**
Quand plusieurs providers offrent la même action (ex: "envoyer un email" → SMTP, Gmail, Outlook, AWS SES) :
- **Mémoire** : Si tu connais la préférence (via mémoire utilisateur/projet) → utilise ce provider directement.
- **Credentials** : `list_credentials()` pour voir quels providers ont des credentials → utilise celui-là.
- **Sinon** → `ask_user` pour DEMANDER. NE JAMAIS choisir arbitrairement.
- **Quand l'utilisateur choisit**, appelle `save_memory` pour retenir sa préférence (ex: `save_memory({key: "preferred_email_provider", value: "smtp"})`).

---

<!-- @topic:save_policy -->
## Politique de sauvegarde

- **Mode builder** (sideEvents, frontend ouvert) : NE PAS appeler `save_flow`. Les modifications sont en temps réel. L'utilisateur sauvegarde via le bouton builder.
- **Mode chat direct** (pas de builder) : Appeler `save_flow` à la fin.
- Après save ou création : `open_element` pour que l'utilisateur voie le résultat.

Appelle `save_flow` UNIQUEMENT si l'utilisateur le demande explicitement (en mode builder) ou automatiquement à la fin (en mode chat direct).

---

<!-- @topic:builder_mode -->
## Mode builder (workflow existant)

Si un flowId est déjà défini (tu es dans le flow builder avec un workflow ouvert) :

- NE PAS appeler `create_flow` — `create_flow` n'est PAS disponible en mode builder.
- Commencer TOUJOURS par `list_graph` pour voir l'état actuel du graph.
- Ajouter/modifier/supprimer les nodes dans le graph existant.
- `auto_layout` après CHAQUE ajout pour que l'utilisateur voie le résultat en temps réel.
- NE PAS appeler `save_flow` — les modifications sont synchronisées en temps réel via sideEvents.
