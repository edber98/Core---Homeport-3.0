# Plugins de fonctions & Templates de nœuds

Objectif: détacher l’implémentation des fonctions (nœuds `action`/`endpoint`/`event`) dans des plugins chargeables dynamiquement. Les templates (métadonnées) décrivent l’UI/contrats; les plugins fournissent les handlers d’exécution.

## Concepts
- Template de nœud: définition statique (key, type, args [form UI], contraintes credentials, sorties). Stockée en DB (collection `node_templates`).
- Plugin de fonction: module JavaScript/TypeScript exportant des handlers (`execute`, éventuellement `validate`, `onEvent`, etc.). Stocké localement (`plugins/local`) ou téléchargé dans `plugins/registry` (via git/URL).
- Mapping: `template.key` ↔ `plugin.handlerKey` (normalisé). Exemple: `gmail.sendEmail` → handler `sendEmail` dans plugin `gmail`.

## Structure des plugins
```
plugins/
  local/
    gmail/
      package.json
      index.js           # export { sendEmail, listLabels, ... }
      README.md
    http-request/
      package.json
      index.js           # export { request }
  registry/
    <org>-<pkg>-<version>/...
```

- `package.json` minimal: `{ name, version, main, engines }`.
- Signature/Checksum (optionnel): fichier d’intégrité pour vérification (éviter code arbitraire non vérifié).

## Chargement des plugins (backend)
- Au démarrage:
  - Scanner `plugins/local` puis `plugins/registry`.
  - Construire un registre en mémoire: `{ providerKey? => module, templateKey => handler }`.
  - Vérifier compatibilité (engines, version API, checksum/signature si activée).
- À l’exécution:
  - Résoudre le handler à partir de `template.key` ou `template.name` normalisée.
  - Appeler `handler(node, msg, inputs, credentials)`.

## Installation & mise à jour
- CLI interne (optionnelle): `plugins install <repo|tar|npm>` → télécharge dans `plugins/registry`, vérifie checksum, enregistre dans DB (catalogue plugins installés).
- Politique de sandbox (optionnelle): VM isolée/Worker Threads; timeouts stricts, mémoire limitée.

## Contrats & validations
- Credentials: le handler lit `credentials` (déjà résolus par le moteur selon le flow); jamais via `msg.payload`.
- Args: conformes au schéma de formulaire `args` du template; la validation fine côté backend est optionnelle (le builder front assure la cohérence UI).
- Sorties: définies par `template.output`; `err` disponible si `authorize_catch_error` et `nodeInstance.catch_error==true`.

## Sécurité & Observabilité
- Signatures/checksums des plugins; liste d’autorisation; provenance (source du repo, version, auteur).
- Journalisation: par handler (latence, erreurs, appels externes redac‑logués). 

## Lien avec le front
- Le front charge les templates (métadonnées) via `/api/node-templates`.
- En exécution, le backend appelle les plugins correspondants (aucune logique plugin côté front).

Voir aussi: `backend-express-structure.md` (emplacement fichiers), `backend-implementation.md` (moteur d’exécution), `backend-plan.md` (phases d’intégration).
