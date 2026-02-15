# Manuel workflow : Nodes, multi-output, conditions, boucles

<!-- @topic:node_types -->
## Types de nodes

### Types de base

- `start` : Démarrage simple. Pas de données d'entrée.
- `start_form` : Démarrage avec formulaire utilisateur. Données accessibles via `{{payload.key_du_champ}}`.
- `event` : Déclencheur automatique (webhook, cron, IMAP, etc.). Active le mode production.
- `function` : Action (envoyer email, appeler API, requête DB, créer un enregistrement, etc.).
- `condition` : Branchement conditionnel (if/else, switch/case). Sorties nommées.
- `loop` : Boucle sur une liste. Sorties `each` et `after`.
- `agent` : Appel LLM/IA (ChatGPT, Claude, etc.). Pour du texte libre, résumé, traduction.

### Fonctions multi-output

- **output_array_field** : Sorties dynamiques basées sur un champ tableau (ex: `openai_classify` → categories). Chaque élément du tableau devient un handle de sortie. Utilisé par les classifiers pour le routage automatique.
- **output_schema_field** : Schéma de sortie via `schema_builder` (ex: `openai_extract` → extraction_schema). Le schéma définit les champs structurés que le node va extraire. Utilise `build_schema` pour créer et appliquer le schéma.

---

<!-- @topic:multi_output -->
## Nodes multi-sortie (output_array_field)

### Comment détecter un node multi-sortie ?

Un node est multi-sortie quand son template a le champ **`output_array_field`**. Ce champ indique quel tableau dans les arguments du node génère les sorties dynamiques.

Tu le détectes via :
- `get_template_details(key)` → retourne `output_array_field: "categories"` (ou `"items"`, etc.) + `isMultiOutput: true`
- `add_node(key)` → retourne `isMultiOutput: true` + `outputArrayField: "categories"` + outputHandles **VIDES**

**Ce n'est PAS que les classifiers.** Tout template de type `function` ou `condition` peut être multi-sortie. C'est le champ `output_array_field` qui détermine ce comportement, pas le nom du template.

### Exemples de templates multi-sortie

| Template | output_array_field | Description |
|----------|-------------------|-------------|
| `condition` | `items` | Branchement conditionnel (if/else, switch) |
| `openai_classify` | `categories` | Classifier OpenAI (routage IA) |
| `anthropic_classify` | `categories` | Classifier Anthropic |
| `mistral_classify` | `categories` | Classifier Mistral |
| `google_ai_classify` | `categories` | Classifier Google AI |
| *(tout template futur avec output_array_field)* | *(variable)* | Même mécanisme |

### Mécanisme

Les sorties sont **dynamiques** — elles n'existent pas à la création du node. Elles sont générées à partir d'un **champ tableau** (section_array) dans les arguments du node.

```
Template manifest :
  output_array_field: "categories"     ← ce champ tableau génère les sorties
  outputSchema: [{ key, type }]        ← schéma de données PAR branche

Node args (context) :
  categories: [                        ← chaque élément = une sortie
    { _id: "cid_abc", name: "Urgent" },
    { _id: "cid_def", name: "Normal" },
    { _id: "cid_ghi", name: "Spam" }
  ]

Sorties générées :
  Handle "cid_abc" → nom "Urgent"
  Handle "cid_def" → nom "Normal"
  Handle "cid_ghi" → nom "Spam"
```

Les `_id` sont auto-générés par le backend (format `cid_xxx`). Tu ne dois JAMAIS les inventer.

### Séquence OBLIGATOIRE

```
1. add_node(templateKey)
   → retourne isMultiOutput: true, outputArrayField: "categories"
   → outputHandles: [] (VIDES — c'est normal)

2. connect_nodes(sourceId, nodeId)
   → connecter l'entrée (le node reçoit des données)

3. set_node_args(nodeId, {
     prompt: "Classe ce texte...",
     categories: [
       { name: "Urgent" },
       { name: "Normal" },
       { name: "Spam" }
     ]
   })
   → GÉNÈRE les sorties et les retourne :
     outputHandles: [
       { id: "cid_abc", name: "Urgent" },
       { id: "cid_def", name: "Normal" },
       { id: "cid_ghi", name: "Spam" }
     ]

4. Pour CHAQUE sortie retournée par set_node_args :
   add_node(actionTemplateKey) → branchNodeId
   connect_by_output_name(nodeId, branchNodeId, outputName="Urgent")
   set_node_args(branchNodeId, ...)
   set_node_description(branchNodeId, ...)
```

### Règles CRITIQUES

- **JAMAIS** inventer de noms de sortie → utilise UNIQUEMENT les `outputHandles[].name` retournés par `set_node_args`
- **JAMAIS** utiliser les outputHandles de `add_node` pour un multi-sortie (ils sont vides)
- **JAMAIS** deviner les `_id` → ils sont auto-générés (format `cid_xxx`)
- **JAMAIS** ajouter un node `condition` après un classifier → le classifier EST déjà un branchement
- **TOUJOURS** vérifier `isMultiOutput` dans la réponse de `add_node` ou `get_template_details`
- Si tu as besoin de revoir les sorties après coup → `get_output_options(nodeId)` APRÈS `set_node_args`

### Accès aux données par branche

Chaque branche reçoit les données définies par `outputSchema` du template. Par exemple un classifier avec :
```json
"outputSchema": [
  { "key": "category", "type": "text" },
  { "key": "confidence", "type": "number" }
]
```

Dans le node connecté à la branche "Urgent" : `{{ classifierNodeId.category }}` → "Urgent", `{{ classifierNodeId.confidence }}` → 0.95.

**JAMAIS** d'index numériques (`{{ nodeId.0 }}`) → toujours les noms de champs du `outputSchema`.

### Modifier un multi-sortie existant (changer les catégories/branches)

Quand l'utilisateur demande de modifier les branches d'un multi-sortie existant (ex: changer les catégories d'un classifier, simplifier un branchement), les anciennes sorties sont **détruites** et de nouvelles sont générées.

**Ce qui se passe automatiquement** :
- `set_node_args` avec le nouveau tableau → génère de nouveaux `_id` pour les items
- Les edges pointant vers les anciens handles (`cid_xxx` qui n'existent plus) sont **supprimés automatiquement**
- La réponse contient `removedStaleEdges: N` indiquant combien de connexions obsolètes ont été nettoyées
- Les nouveaux `outputHandles` sont retournés dans la réponse

**Séquence pour modifier un multi-sortie existant :**

```
Exemple : classifier avec 5 catégories → simplifier à 2 (Urgent / Autre)

1. list_graph → identifier le classifier (nodeId) et les nodes connectés à ses sorties
2. Supprimer les nodes devenus inutiles (branches qu'on ne veut plus) :
   remove_node(nodeId_branche_obsolete)  ← pour chaque branche supprimée
3. set_node_args(classifierNodeId, {
     categories: [
       { name: "Urgent" },
       { name: "Autre" }
     ]
   })
   → Les anciennes connexions sont supprimées AUTOMATIQUEMENT (removedStaleEdges: N)
   → Retourne les nouveaux outputHandles :
     [{ id: "cid_new1", name: "Urgent" }, { id: "cid_new2", name: "Autre" }]
4. Reconnecter les branches nécessaires :
   connect_by_output_name(classifierNodeId, existingNodeId, outputName="Urgent")
5. auto_layout
```

**Points clés :**
- Les anciens `cid_xxx` sont **définitivement perdus** quand on change le tableau
- Les edges orphelins sont supprimés automatiquement — pas besoin de `disconnect_nodes` manuellement
- Tu DOIS reconnecter les branches avec les nouveaux noms retournés par `set_node_args`
- Si des nodes en aval ne sont plus nécessaires → `remove_node` AVANT de changer les args

---

<!-- @topic:extraction_schema -->
## Schéma d'extraction (output_schema_field)

Les nodes d'extraction (openai_extract, anthropic_extract, etc.) utilisent un **schéma dynamique** pour définir les champs à extraire. Ce schéma est un **FormSchema** — exactement le même format que les formulaires de démarrage (start_form).

### Comment configurer un extracteur

1. `add_node("openai_extract")` → nodeId
2. `build_schema` avec `targetNodeId` et `targetArgKey: "extraction_schema"` → applique automatiquement

### Types de champs valides (IDENTIQUES aux formulaires)

**UTILISE UNIQUEMENT ces types** — ce sont les types du système de formulaires :

| Type | Usage pour extraction | Exemple |
|------|----------------------|---------|
| `text` | Texte court (nom, titre, référence) | Nom du client |
| `textarea` | Texte long (description, résumé) | Résumé du document |
| `number` | Nombre (montant, quantité, score) | Montant TTC |
| `email` | Adresse email | Email de contact |
| `url` | Lien web | URL du site |
| `tel` | Numéro de téléphone | Téléphone mobile |
| `date` | Date | Date de facture |
| `checkbox` | Booléen (oui/non) | Est urgent ? |
| `select` | Choix unique (avec options) | Type de document |
| `tags` | Liste de mots-clés | Tags détectés |
| `text_array` | Liste de textes | Noms des participants |

**INTERDIT** : `string`, `integer`, `float`, `boolean`, `array`, `object` — ces types N'EXISTENT PAS dans le système.

### Exemple complet avec build_schema

```
build_schema({
  targetNodeId: "function_openaiextract_xxx",
  targetArgKey: "extraction_schema",
  fields: [
    { key: "nom_client", type: "text", label: "Nom du client", description: "Nom complet du client mentionné" },
    { key: "montant", type: "number", label: "Montant TTC", description: "Montant total en euros" },
    { key: "date_facture", type: "date", label: "Date de facture", description: "Date au format ISO" },
    { key: "email", type: "email", label: "Email de contact", description: "Adresse email si présente" },
    { key: "est_urgent", type: "checkbox", label: "Urgent", description: "Le document mentionne-t-il une urgence ?" },
    { key: "mots_cles", type: "tags", label: "Mots-clés", description: "Termes importants du document" }
  ]
})
```

### Règles

- **TOUJOURS** utiliser `build_schema` avec `targetNodeId` + `targetArgKey` pour appliquer le schéma
- **TOUJOURS** ajouter une `description` sur chaque champ — elle guide le LLM pendant l'extraction
- **JAMAIS** inventer des types — utilise UNIQUEMENT ceux listés ci-dessus
- Le schéma est un FormSchema `{fields: [...]}`, pas un tableau brut `[{key, type}]`

---

<!-- @topic:conditions_classifiers -->
## Conditions et classifiers

### A. Conditions simples (if/else)

1. `add_node` avec template "condition" → retourne les outputHandles.
2. `connect_nodes` → le connecter au node précédent IMMÉDIATEMENT.
3. `set_node_args` → configurer les règles.
4. `get_output_options` → confirmer les sorties disponibles.
5. Pour chaque branche → ajouter le node de destination, puis `connect_by_output_name` avec le nom exact.

**IMPORTANT pour les branches** : Chaque branche (Oui, Non, catégorie A, catégorie B...) DOIT mener à au moins un node. Si une condition a 3 branches, tu dois avoir au moins 3 nodes connectés en sortie.

### B. Classifiers IA et nodes multi-output

Les classifiers (openai_classify, anthropic_classify, etc.) sont des nodes **multi-output** : leurs sorties sont **dynamiques** et dépendent des arguments configurés.

**POINT CLÉ** : Les sorties n'existent PAS au moment de `add_node`. Elles sont générées APRÈS `set_node_args`, quand le tableau d'items (ex: `categories`) est défini. C'est le backend qui génère les `_id` stables pour chaque élément du tableau (comme pour les conditions).

**SÉQUENCE OBLIGATOIRE pour un classifier / multi-output :**

```
1. add_node("openai_classify")        → nodeId (outputHandles VIDES — c'est normal)
2. connect_nodes(sourceId, nodeId)     → connecter l'entrée
3. set_node_args(nodeId, {             → DÉFINIR les catégories
     prompt: "...",
     categories: [
       { name: "Urgent" },
       { name: "Normal" },
       { name: "Spam" }
     ]
   })
   → La réponse CONTIENT les outputHandles générés :
     outputHandles: [
       { id: "cid_abc123", name: "Urgent" },
       { id: "cid_def456", name: "Normal" },
       { id: "cid_ghi789", name: "Spam" }
     ]
4. Pour CHAQUE branche retournée :
   add_node(templateKey)               → branchNodeId
   connect_by_output_name(nodeId, branchNodeId, outputName="Urgent")
```

**RÈGLES CRITIQUES multi-output :**
- **JAMAIS** inventer de noms de sortie → utilise UNIQUEMENT les noms retournés par `set_node_args`
- **JAMAIS** utiliser les outputHandles retournés par `add_node` pour un multi-output (ils sont vides)
- **JAMAIS** deviner les `_id` des handles → ils sont auto-générés
- **TOUJOURS** lire les `outputHandles` dans la réponse de `set_node_args` pour savoir quoi connecter
- Si tu as besoin de revoir les sorties → `get_output_options(nodeId)` APRÈS `set_node_args`

### INTERDIT : Classifier + Condition = REDONDANT

Un classifier EST déjà un branchement. Ses sorties SONT les branches. NE JAMAIS ajouter un node `condition` après un classifier pour vérifier la catégorie — c'est inutile et redondant. Le classifier route automatiquement vers la bonne branche.

**Exemple correct** :
```
[Texte] → [Classifier: Urgent / Non urgent] → branche "Urgent" → [Envoyer email]
                                              → branche "Non urgent" → [Archiver]
```

**Exemple INTERDIT** :
```
[Texte] → [Classifier] → [Condition: si urgent ?] → [Envoyer email]  ← FAUX ! La condition est inutile
```

---

<!-- @topic:loops -->
## Boucles (loop)

Quand une action retourne une **liste** et tu dois agir sur CHAQUE élément → utilise un node `loop`.

### Structure

```
[Action liste] → [Loop] → each → [Action par élément]
                         → after → [Suite après la boucle]
```

- `each` : Exécuté pour CHAQUE élément. Données accessibles via `{{loopNodeId.item}}`.
- `after` : Exécuté UNE SEULE FOIS après la fin de la boucle.
- L'argument `array` du loop DOIT pointer vers le tableau retourné par le node précédent.

### Exemple : Lister fichiers Nextcloud et créer une carte Trello pour chacun

```
1. ensure_start          → startId
2. add_node(nc_file_list) → listNodeId
3. connect_nodes(startId, listNodeId)
4. add_node(loop)        → loopNodeId (outputHandles: [{id: "each"}, {id: "after"}])
5. connect_nodes(listNodeId, loopNodeId)
6. set_node_args(loopNodeId, { array: "{{ listNodeId.files }}" })
7. add_node(trello_create_card) → cardNodeId
8. connect_nodes(loopNodeId, cardNodeId, sourceHandle: "each")
9. set_node_args(cardNodeId, { name: "{{ loopNodeId.item.name }}", ... })
```

---

<!-- @topic:connections -->
## Connexions et handles

- Handle d'entrée par défaut : `in`.
- **IMPORTANT** : Ne PAS deviner les handles de sortie. `add_node` retourne les `outputHandles` réels → UTILISE-LES.
- Si tu ne connais pas les handles → `get_output_options(nodeId)`.
- Pour conditions et classifiers → `connect_by_output_name` avec le nom exact.
- Si `connect_nodes` échoue → lis le message d'erreur, il liste les handles disponibles.

### Formulaires de démarrage

- `create_start_form` avec les champs complets (key, type, label, required).
- Données accessibles via `{{payload.key_du_champ}}`.
