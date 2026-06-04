---
name: automation-endpoint-pruner
description: 'Filter an extracted OpenAPI endpoint inventory JSON and keep only the endpoints useful for automation. Use when the user already has an endpoints JSON and wants to remove admin, config, billing, governance, technical, or setup-only endpoints before creating a Kinn connector.'
---

# Automation Endpoint Pruner

Utiliser ce skill juste apres `openapi-extractor`.
Son role n est pas de modifier un connecteur existant, mais de transformer un inventaire JSON brut en inventaire JSON filtre pour l automation.

Entree:

```text
<api-name>-endpoints.json
```

Sortie:

```text
<api-name>-automation-endpoints.json
```

Le JSON de sortie doit conserver le meme inventaire d endpoints utiles, sans les surfaces de parametrage ou d administration.

## Workflow

1. Lire l inventaire JSON produit par `openapi-extractor`.
2. Classer chaque endpoint:
   - `KEEP` si l endpoint est utile dans un workflow;
   - `EXCLUDED` si l endpoint releve du parametrage, de l admin, de la gouvernance, de la securite, de la facturation, du diagnostic, ou d une operation trop technique.
3. Lancer le filtre deterministe fourni:

```bash
node .agents/skills/automation-endpoint-pruner/scripts/filter-automation-endpoints.js \
  <api-name>-endpoints.json \
  --output <api-name>-automation-endpoints.json
```

4. Relire les endpoints ambigus ou limites avec `references/pruning-rules.md`.
5. Retourner le JSON filtre.

## Regles obligatoires

- Conserver les CRUD metier, la recherche, la liste, les transitions d etat, les commentaires, messages, etiquettes, assignations, fichiers, jobs, executions, webhooks metier et actions coeur produit.
- Retirer par defaut les endpoints de configuration globale, billing, permissions, API keys, tokens, audit, logs internes, feature flags, settings de workspace ou administration.
- En cas de doute, preferer `KEEP` plutot que supprimer un vrai endpoint metier.
- Le JSON final doit rester parseable et conserver `api`, `endpoint_count` et `endpoints`.
- Les endpoints exclus peuvent etre conserves dans `excluded_endpoints[]` pour audit, mais ils ne doivent plus compter dans `endpoint_count`.

## Qualite attendue

Le skill doit fournir un JSON filtre, pas seulement une liste textuelle.
Le resultat doit etre directement consommable par le skill de creation du connecteur.

## Ressources

- `scripts/filter-automation-endpoints.js`: filtre deterministe JSON -> JSON.
- `references/pruning-rules.md`: regles de tri des endpoints.
