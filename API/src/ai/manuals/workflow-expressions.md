# Manuel workflow : Expressions, règles critiques, clés d'arguments

<!-- @topic:expressions -->
## Expressions de données — NE JAMAIS DEVINER les noms de champs

### Syntaxe

- `{{payload.champ}}` : Données du node précédent (payload = sortie du prédécesseur direct). Fonctionne partout : après un start_form, dans une boucle (payload.item), après un HTTP (payload.body), etc.
- `{{nodeId.champ}}` : Résultat d'un node spécifique identifié par son ID.

Les deux formes sont valides. `payload.xxx` est valide tant que `xxx` existe dans la sortie du node précédent.

### Le vrai problème : les NOMS DE CHAMPS

Ce n'est pas `payload` vs `nodeId` le danger — c'est les **noms de champs** inventés.
`set_node_args` **vérifie automatiquement** les expressions `{{ }}` et **retournera des warnings** si un champ n'existe pas dans le schéma de sortie des prédécesseurs. L'agent doit alors corriger avec `propose_context_mapping` puis `set_node_args`.

La vérification couvre **tous les nodes en amont** — y compris ceux derrière des conditions et boucles — grâce à la simulation.

### Règle fondamentale : CONNAÎTRE avant d'écrire

**Chaque node a un schéma de sortie SPÉCIFIQUE et DIFFÉRENT.** Tu ne peux JAMAIS deviner les noms de champs d'un node.

Exemples de schémas qui VARIENT selon le template :
| Node | Champs réels | Ce que tu pourrais inventer (FAUX) |
|------|-------------|-----------------------------------|
| HTTP Request | `body`, `status`, `headers` | ~~`data`~~, ~~`result`~~, ~~`response`~~ |
| Odoo search | `records`, `totalCount` | ~~`items`~~, ~~`results`~~, ~~`data`~~ |
| Email send | `sent`, `messageId`, `envelope` | ~~`success`~~, ~~`result`~~ |
| Chat completion | `text`, `usage` | ~~`content`~~, ~~`message`~~, ~~`answer`~~ |
| Classifier | `label`, `confidence` (via outputSchema) | ~~`category`~~, ~~`class`~~ |

### PROCÉDURE OBLIGATOIRE avant d'écrire `{{ nodeId.xxx }}`

1. Appeler `propose_context_mapping(targetId)` → lire `upstreamOutputs` et `upstreamSimulated`
2. Chaque entrée contient `availableExpressions` avec les expressions exactes
3. Utiliser UNIQUEMENT les expressions retournées — copier-coller le `expression` tel quel
4. `upstreamSimulated` contient les nodes non-directs (derrière conditions/boucles) — vérifie-les aussi

### Exemple concret

Après `propose_context_mapping`, tu reçois :
```json
{
  "upstreamOutputs": [{
    "nodeId": "abc123",
    "name": "Recherche Odoo",
    "template": "odoo_search_read",
    "availableExpressions": [
      { "field": "records", "expression": "{{ abc123.records }}", "type": "array" },
      { "field": "totalCount", "expression": "{{ abc123.totalCount }}", "type": "number" }
    ]
  }],
  "upstreamSimulated": [{
    "nodeId": "def456",
    "name": "Chat Completion",
    "note": "non-direct predecessor (derrière condition/boucle)",
    "availableExpressions": [
      { "field": "text", "expression": "{{ def456.text }}" },
      { "field": "ok", "expression": "{{ def456.ok }}" }
    ]
  }]
}
```
→ Tu utilises `{{ abc123.records }}`, PAS `{{ abc123.data }}` ou `{{ abc123.items }}`.
→ Tu utilises `{{ def456.text }}`, PAS `{{ def456.content }}`.

### Erreurs interdites

- **JAMAIS d'index numériques** : `{{ nodeId.0 }}` ou `{{ nodeId.1 }}` N'EXISTE PAS.
- **JAMAIS inventer un nom de champ** sans avoir vérifié via `propose_context_mapping`.
- **JAMAIS supposer que deux templates ont le même schéma** — même deux nodes du même provider peuvent avoir des sorties différentes.

### Données des nodes multi-output (classifiers, extracteurs)

Les classifiers et nodes multi-output (avec `output_array_field`) retournent des données par branche.
Les champs de sortie sont définis par le `outputSchema` du template — ils VARIENT selon le template.

**OBLIGATOIRE** pour mapper les données d'un node multi-output :
1. `add_node` retourne `outputSchema` → **LIS les champs retournés** (clé, type).
2. `propose_context_mapping` retourne `upstreamOutputs` avec les `availableExpressions` exactes → **UTILISE-LES**.
3. Accès : `{{ nodeId.<nom_du_champ> }}` — le nom vient du outputSchema.
4. **INTERDIT** : `{{ nodeId.0 }}`, `{{ nodeId.1 }}`, etc. Les index numériques N'EXISTENT PAS.

---

<!-- @topic:critical_rules -->
## Règles critiques

### TOUJOURS

- TOUJOURS connecter un node IMMÉDIATEMENT après l'avoir créé (sauf triggers).
- TOUJOURS lister TOUS les nodes avant de construire (Étape 2.0 = ton contrat).
- TOUJOURS créer CHAQUE node prévu — en sauter un = workflow cassé.
- TOUJOURS appeler `list_graph` pour vérifier avant Phase 3 (Étape 2.5).
- TOUJOURS utiliser les `outputHandles` retournés par `add_node`.
- TOUJOURS lire `outputSchema` retourné par `add_node` pour les multi-output.
- TOUJOURS utiliser `propose_context_mapping` pour les expressions {{ }}.
- TOUJOURS utiliser `get_node_schema` si tu doutes d'une clé d'argument.
- TOUJOURS lire le manuel (`search_manual` / `get_manual_section`) quand tu doutes.

### JAMAIS

- NE JAMAIS créer un node sans le connecter dans la foulée.
- NE JAMAIS laisser un node sans arguments configurés.
- NE JAMAIS deviner les clés de templates.
- NE JAMAIS utiliser d'index numériques `{{ nodeId.0 }}` — toujours `{{ nodeId.nom_champ }}`.
- NE JAMAIS dire "tu devras configurer" — fais-le toi-même.
- NE JAMAIS inventer de clés d'arguments.
- NE JAMAIS inventer de noms de champs de sortie — lis `propose_context_mapping`.

### Clés d'arguments

Les clés des arguments (passées à `set_node_args`) DOIVENT correspondre EXACTEMENT au schéma du template.
- `propose_context_mapping` retourne le mapping avec les clés correctes → **UTILISE-LES**.
- Si tu doutes d'une clé → appelle `get_node_schema(nodeId)` pour voir les clés exactes.
- **NE JAMAIS deviner** une clé (ex: "body", "content", "message"). Le schéma peut avoir des noms différents (ex: "text", "html", "subject").
- Les clés invalides sont **rejetées automatiquement** par `set_node_args` avec un avertissement.
- Si `set_node_args` retourne un warning avec des clés inconnues → corrige IMMÉDIATEMENT en utilisant les bonnes clés.

**Exemple d'erreur courante** :
- Incorrect : `set_node_args(nodeId, { body: "Hello" })` → "body" n'existe pas dans le schéma
- Correct : `get_node_schema(nodeId)` → voit que les clés sont "text" et "html"
- Correct : `set_node_args(nodeId, { text: "Hello", html: "<p>Hello</p>" })`

### Gestion des erreurs

- Si `connect_nodes` échoue → lis le message d'erreur, il liste les handles disponibles.
- Si `set_node_args` retourne un warning avec des clés inconnues → corrige immédiatement.
- Si `set_node_args` retourne un warning sur les expressions → appelle `propose_context_mapping` et corrige.
- Si `validate_flow` retourne des erreurs → corrige-les avant de finaliser.
