# Web Tools — Recherche et Fetch Web (gratuit, sans API)

Capsule d'outils web pour l'agent IA Homeport. Implémentation 100 % gratuite,
basée sur du scraping HTML public (DuckDuckGo) et Playwright Chromium headless
pour les pages JavaScript.

## Setup

Après `npm install` dans `API/`, installer les browsers Playwright :

```bash
npx playwright install chromium
```

Un seul Chromium est nécessaire — pas besoin de WebKit ni Firefox. Taille : ~180 MB.

En conteneur K8s / Docker non-privileged, le flag `--no-sandbox` est automatiquement
ajouté (déjà prévu dans `web-tools.js`).

## Tools exposés

| Tool | Description |
|------|-------------|
| `web_search` | Recherche web. Scrape DuckDuckGo HTML (`https://html.duckduckgo.com/html/`) ; fallback Brave Search et Startpage si échec ou zéro résultat. Retourne `[{title, url, snippet, rank}]`. |
| `web_fetch` | Récupère une URL. Modes : `http` (undici, rapide), `browser` (Playwright pour JS), `auto` (http → browser si JS-shell). Extract : `text`, `markdown`, `readability`, `raw`. Option `prompt` → extraction ciblée via Claude Haiku. |
| `research_deep` | Orchestration : search + fetch top N + synthèse via LLM mini. Modes : `shallow` (1 search + 3 fetches) et `deep` (jusqu'à `maxSteps`, relance par follow-up queries). |

Tous les tools émettent des events `canvas.research.step` via le callback `emit`
du harness (`{stepType: 'search'|'fetch', status: 'running'|'done'|'error', ...}`).

## Pourquoi DuckDuckGo HTML

- Pas de clé API nécessaire.
- Pas de JavaScript côté client → scraping HTML stable via Cheerio.
- Pas de captchas agressifs sur cet endpoint (comparé à Google/Bing).
- Les URLs sont wrappées via `/l/?uddg=<encoded>` → on décode automatiquement.

Google n'est pas utilisé (anti-bot très strict). Brave Search et Startpage sont
fournis en fallback automatique.

## Rate limiting

- Recherches : 1 requête/seconde (queue interne). Les appels concurrents
  s'exécutent en série avec un délai minimum.
- Fetch : pas de rate limit côté tool (le LLM décide), mais timeouts appliqués.

## Timeouts & limites (env vars)

| Var | Défaut | Description |
|-----|--------|-------------|
| `WEB_SEARCH_TIMEOUT_MS` | 20000 | Timeout recherche |
| `WEB_BROWSER_TIMEOUT_MS` | 30000 | Timeout navigation Playwright |
| `WEB_HTTP_TIMEOUT_MS` | 30000 | Timeout undici |
| `WEB_FETCH_MAX_BYTES` | 5 MB | Cap bytes téléchargés en mode http |
| `WEB_FETCH_MAX_RAW_CHARS` | 500 000 | Cap chars retournés |
| `WEB_SEARCH_ENGINE` | duckduckgo | Moteur principal |
| `WEB_SEARCH_FALLBACK` | brave,startpage | Fallbacks séparés par virgule |
| `WEB_MINI_MODEL` | `claude-haiku-4-5` | Modèle rapide pour extraction/synthèse |

## SSRF Guards

Protection active dans `validateUrl(url)` :

- Protocoles autorisés : `http:`, `https:` uniquement.
- Résolution DNS → rejet si l'IP tombe dans :
  - `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16` (link-local + métadonnées cloud),
    `172.16.0.0/12`, `192.168.0.0/16`, `0.0.0.0/8`
  - IPv6 : `::1`, `fc00::/7`, `fe80::/10`
- Content-type whitelist en mode http : `text/*`, `application/xhtml+xml`,
  `application/json`, `application/pdf`, `application/xml`.

Les URLs bloquées retournent `{ error: 'ssrf_blocked:...' }` — l'agent voit
l'erreur et peut réagir.

## Lifecycle du browser

- Chromium lancé en lazy (à la première utilisation) — pas d'overhead au boot.
- Singleton partagé ; un `BrowserContext` séparé par requête (sessions isolées).
- Resource blocking : `image`, `font`, `media` abortés pour vitesse.
- Fermeture propre sur `SIGTERM` / `SIGINT` / `beforeExit`.

## Comportement en cas d'échec

- `web_search` : si le moteur primaire plante ou renvoie 0 résultat → fallback
  transparent sur les moteurs suivants.
- `web_fetch` mode `auto` : si HTTP échoue OU si HTML ressemble à un shell JS vide
  → relance en Playwright, flag `wasJsRendered: true`.
- `research_deep` : continue malgré des échecs individuels, synthèse finale sur
  ce qui a été collecté. Si `ANTHROPIC_API_KEY` absente → fallback heuristique
  (concat snippets dédupliqués).

## Intégration

Pour activer la capsule dans un mode d'agent, ajouter dans `tool-groups.js` :

```js
const { createWebExecutor } = require('./tools/web-tools');
// ...
case 'web': return createWebExecutor(metadata || {}, emit);
```

Les tools apparaissent alors dans la définition de l'agent si la capsule `web`
est active. Cette intégration n'est pas faite dans ce changeset — à faire
séparément selon les besoins de routing.
