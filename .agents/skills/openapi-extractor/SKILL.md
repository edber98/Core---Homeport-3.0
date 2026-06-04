---
name: openapi-extractor
description: extract a complete endpoint inventory from an OpenAPI or Swagger specification into JSON. use this skill when the user gives an api name, a spec url, or a local spec file and wants every endpoint extracted with path, query, header, and cookie parameters, plus all documented request-body attributes for write endpoints needed to build automation connectors.
---

# OpenAPI Extractor

## Objectif

Produire un inventaire JSON exhaustif d une API a partir de sa specification OpenAPI ou Swagger.
Le JSON de sortie est la source de verite pour la suite du pipeline:

1. filtrage des endpoints inutiles a l automation;
2. creation du connecteur Kinn;
3. validation finale.

Extraction obligatoire:

- tous les endpoints documentes;
- tous les parametres `path`, `query`, `header` et `cookie`;
- tous les attributs documentes du `requestBody` pour `POST` et `PUT`;
- si la spec utilise aussi `PATCH`, l extraire egalement quand il existe afin de ne pas perdre d operations d ecriture utiles.

## Entree attendue

L utilisateur fournit en general seulement le nom de l API. Il faut alors resoudre la spec:

1. Check whether a local registry exists at `references/api_registry.json`.
2. If present, resolve the API name from that registry.
3. If no registry entry exists, ask the user for the OpenAPI/Swagger URL or file, unless a connector or internal source clearly contains the spec.
4. If the user provides a direct spec URL or file in the same conversation, use it directly.

Utiliser `references/api_registry.example.json` comme modele si un registre local doit etre cree.

## Workflow

Quand une spec est disponible, lancer l extracteur fourni:

```bash
python scripts/extract_openapi.py --api-name <api-name> --registry references/api_registry.json --output <api-name>-endpoints.json
```

Ou avec une source directe:

```bash
python scripts/extract_openapi.py --api-name <api-name> --spec <openapi-json-or-yaml-path-or-url> --output <api-name>-endpoints.json
```

Ne jamais filtrer ni interpreter les endpoints a cette etape.
Le skill doit d abord produire l inventaire brut complet, meme si des endpoints semblent admin ou non metier.

## Exigences de sortie

Suivre strictement le contrat dans `references/output_schema.md`.

Regles obligatoires:

- Inclure toutes les operations presentes dans `paths`.
- Conserver les metadata utiles: `operation_id`, `summary`, `description`, `tags`, `deprecated` si disponible.
- Regrouper les parametres par emplacement.
- Pour les endpoints d ecriture documentes avec un body, aplatir les attributs en chemins explicites.
- Resoudre les `$ref` internes autant que possible.
- Ne jamais inventer un attribut absent de la spec.
- Si la spec est partielle ou ambigue, retourner le resultat partiel et signaler le manque.

## Controle qualite

Verifier avant restitution:

- The JSON is valid and parseable.
- `endpoint_count` matches the number of endpoint objects.
- Les endpoints `POST` et `PUT` ont bien `request_body`, meme vide.
- Si la spec contient des `PATCH` avec body, ils doivent aussi avoir `request_body`.
- Les parametres `query`, `path`, `header` et `cookie` sont ranges au bon endroit.
- Aucun registre d exemple n est utilise comme vraie source.

## Sortie attendue pour le pipeline

Le resultat attendu est un fichier du type:

```text
<api-name>-endpoints.json
```

Ce JSON doit etre directement consommable par le skill de filtrage automation sans retraitement manuel.

## Ressources

- `scripts/extract_openapi.py`: extracteur deterministe OpenAPI/Swagger JSON ou YAML.
- `references/api_registry.example.json`: modele de registre.
- `references/output_schema.md`: contrat JSON de sortie.
