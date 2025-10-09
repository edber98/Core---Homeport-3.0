# AI Form Agent — État des lieux et reprise

Ce document synthétise ce qui a été mis en place pour l’agent IA de génération de formulaires, les fichiers modifiés/ajoutés, et la marche à suivre pour reprendre le travail.

## Objectif
- Générer un schéma Dynamic Form (format Form Builder) à partir d’une demande en langage naturel.
- Construction en temps réel via SSE (Server-Sent Events) visible dans le frontend (page de debug et, plus tard, dans le Form Builder).
- Respect strict du format: fields/steps, sections (normal/array), validators, conditions (visibleIf/requiredIf/disabledIf), UI (FormUI), expressions (optionnel).

## Backend — Implémentation actuelle
- Endpoint SSE protégé JWT: `POST /api/ai/form/build`
  - Fichier: `backend/src/modules/db/ai-form.js`
  - Comportement:
    - Auth requise via header `Authorization: Bearer <jwt>` (pas de query token côté frontend désormais).
    - Émet des événements SSE: `message` (commentary/steps/RAW), `snapshot` (schéma complet), `done`. En cas d’erreur provider: `error`.
    - Logs: `[ai-form][request]`, `[ai-form][sse]`, et logs d’erreurs provider.
    - Fallback: si la réponse ne contient pas `schema`, tentative d’utiliser l’objet complet s’il ressemble à un FormSchema.
- Provider OpenAI (direct)
  - Fichier: `backend/src/ai/openai.js`
  - Appel API Chat Completions (model configurable via `OPENAI_MODEL`, défaut `gpt-4o-mini`).
  - Prompt « strict »: décrit exhaustivement le format Dynamic Form (FormUI, Steps, Sections, Inputs, validators, règles JSON minimalistes, sémantique disabledIf>required), avec exemples validés (flat, section_array, steps). Sortie attendue: `{ commentary, steps, schema }`.
  - Parsing robuste de la réponse du modèle:
    - Cherche un bloc ```json …```, sinon JSON direct, sinon heuristique entre `{ … }`.
    - Log du RAW (début) via `[openai][raw]` pour diagnostiquer.
- Loader `.env` (clé OpenAI)
  - Fichier: `backend/src/config/load-env.js`
  - Recherche `backend/.env` et logue `[env] loaded .env OPENAI_KEY: present/absent`.

## Frontend — Implémentation actuelle
- Page Debug: `/debug/ai-form-agent`
  - Fichier: `src/app/features/debug/ai-form-agent-debug.component.ts`
  - Flux SSE via `fetch` (POST) avec header `Authorization: Bearer …` et `Accept: text/event-stream`.
  - Parser SSE compatible LF/CRLF, lecture incrémentale, journaux console (`[AI-DBG]`) + log textuel dans l’UI.
  - À la réception d’un `snapshot`, ré-assigne un nouvel objet `schema` pour déclencher la Preview sans interaction.
  - Affiche l’historique d’événements et le schéma JSON (via `app-json-schema-viewer`) + la Preview (`app-dynamic-form`).

## Logs utiles
- Backend:
  - `[ai-form][request]` — paramètres d’entrée.
  - `[openai][call]`, `[openai][resp]`, `[openai][content]`, `[openai][raw]` — appel modèle et résultat brut.
  - `[ai-form][sse] message/snapshot/done` — événements émis.
  - Warnings/erreurs si `schema` absent ou invalide.
- Frontend (page Debug): logs console `[AI-DBG]` + log UI (Flux).

## Points à finaliser
1) Validation AJV côté backend
- Valider et normaliser le schéma avant `snapshot`:
  - Clamp `col` à [1..24], filtrage de clés inconnues, limite sur le nombre d’options.
  - Détection de `key` dupliquées.
  - Message SSE `error: invalid_schema` avec détails si échec.

2) Itérations & mémoire
- Supporter `seedSchema` et des instructions incrémentales ("ajouter un champ", "passer en steps").
- Session en mémoire/Redis et `snapshot` par tour.

3) Intégration dans le Form Builder
- Panneau "Assistant IA" dans `/dynamic-form`, avec boutons "Appliquer/Annuler" et persistance dans CatalogService.

4) Provider LangChain (optionnel)
- Ajouter un provider LangChain avec Tools (validate_schema, normalize_schema, find_duplicates, suggest_layout). Garder OpenAI par défaut.

5) Streaming natif
- Passer à un découpage en messages + snapshots successifs (sans patches path-based), en conservant la validation AJV entre étapes.

## Conseils d’exploitation
- S’assurer que `OPENAI_API_KEY` est bien chargé au boot (voir `[env] loaded .env OPENAI_KEY: ...`).
- Utiliser la page Debug pour valider la génération et voir le RAW si besoin.
- Activer `AI_FORM_FORWARD_RAW=1` pour relayer le RAW au frontend (panneau Flux) lors de diagnostics.

## Fichiers modifiés/ajoutés (liste)
- Backend
  - `backend/src/modules/db/ai-form.js` — endpoint SSE agent
  - `backend/src/ai/openai.js` — provider OpenAI
  - `backend/src/config/load-env.js` — loader .env robuste + log clé OpenAI
- Frontend
  - `src/app/features/debug/ai-form-agent-debug.component.ts` — page Debug SSE + logs + preview
  - `src/app/app.routes.ts` — route `/debug/ai-form-agent`
  - `src/app/features/debug/debugging-list.component.ts` — entrée menant à la page Debug

## Reprise — Plan
1) AJV: écrire le schema JSON (FormSchema) et brancher la validation/normalisation (backend). Envoyer des messages SSE d’erreur détaillés en cas d’échec.
2) Debug page: ajouter un volet "Réponse brute" pour afficher le JSON complet renvoyé par l’agent (troncature configurable), et un bouton pour copier-coller le snapshot.
3) Itérations: ajouter un champ `seedSchema` + un bouton "Itérer" (le backend garde l’état et renvoie un nouveau snapshot).
4) Intégrer au Form Builder: panneau latéral, actions Appliquer/Annuler, sauvegarde dans CatalogService.
5) (Option) Provider LangChain: ajout de Tools et d’un planner, configurable via env.
