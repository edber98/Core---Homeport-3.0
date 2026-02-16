# Skill : Homeport AI Agent Builder

## Quand utiliser ce skill

Utilise ce skill quand tu dois :
- Ajouter un nouvel outil (meta-tool, capsule tool, ou MCP tool)
- Créer une nouvelle capsule/mode (ex: dashboard, analytics)
- Ajouter ou modifier un prompt constitutionnel
- Créer ou étendre un manuel searchable
- Ajouter un nouveau provider LLM
- Connecter un serveur MCP externe
- Créer ou modifier un agent custom
- Comprendre le fonctionnement du système IA Homeport
- Débugger un problème dans le pipeline IA

## Architecture en 10 lignes

Le système IA Homeport utilise une **boucle orchestrateur unique** (`agent-harness.js`) qui streame les réponses LLM en temps réel via SSE. Le LLM dispose de **~18 outils primitifs** toujours disponibles et peut activer des **capsules** (workflow, form, node_args) à la demande via `activate_capsule`. Chaque capsule injecte dynamiquement ses outils (~9-28) dans le toolset mutable. Le **factory LLM** (`llm/index.js`) normalise 3 providers (Anthropic, OpenAI ChatCompletions, OpenAI Responses API) en events identiques. Les **prompts constitutionnels** (~40 lignes) chargent les règles critiques, tandis que les **manuels** (fichiers .md avec `@topic:` tags) fournissent la référence détaillée on-demand via `search_manual`/`get_manual_section`. Le frontend Angular consomme le flux SSE via `fetch POST` + `TextDecoder`, organise les events en segments (text/tools), et affiche les tool tags avec popovers. Les **agents custom** injectent un fragment de prompt et peuvent overrider le provider/model LLM. Les **serveurs MCP** externes sont connectés via stdio ou SSE et leurs outils sont auto-préfixés `mcp_{prefix}_{name}`.

## Chemins clés

| Composant | Chemin |
|-----------|--------|
| **Harness (orchestrateur)** | `API/src/ai/agent-harness.js` |
| **Agent runner (legacy)** | `API/src/ai/agent-runner.js` |
| **Tool groups registry** | `API/src/ai/tool-groups.js` |
| **Meta-tools (primitifs)** | `API/src/ai/tools/meta-tools.js` |
| **Workflow tools (~28)** | `API/src/ai/tools/workflow-tools.js` |
| **Form tools (~14)** | `API/src/ai/tools/form-tools.js` |
| **Node args tools (~9)** | `API/src/ai/tools/node-args-tools.js` |
| **LLM factory** | `API/src/ai/llm/index.js` |
| **LLM Anthropic** | `API/src/ai/llm/anthropic.js` |
| **LLM OpenAI ChatCompletions** | `API/src/ai/llm/openai.js` |
| **LLM OpenAI Responses** | `API/src/ai/llm/openai-responses.js` |
| **Prompts** | `API/src/ai/prompts/*.js` |
| **Manuels** | `API/src/ai/manuals/*.md` |
| **Manual index** | `API/src/ai/manuals/manual-index.js` |
| **Context builder** | `API/src/ai/context/context-builder.js` |
| **Memory manager** | `API/src/ai/context/memory-manager.js` |
| **MCP client** | `API/src/ai/mcp/mcp-client.js` |
| **MCP registry** | `API/src/ai/mcp/mcp-registry.js` |
| **Route API** | `API/src/modules/db/ai.js` |
| **Frontend service** | `Homeport/src/app/features/ai/ai.service.ts` |
| **Frontend chat** | `Homeport/src/app/features/ai/ai-chat.component.ts` |

## Fichiers de règles

| Règle | Contenu |
|-------|---------|
| [architecture.md](rules/architecture.md) | Vue d'ensemble complète du système |
| [harness-loop.md](rules/harness-loop.md) | Boucle orchestrateur, capsules, timeout, side events |
| [tool-groups.md](rules/tool-groups.md) | Organisation des outils en groupes + capsules |
| [add-tool.md](rules/add-tool.md) | Checklist : ajouter un outil (meta, capsule, MCP) |
| [add-capsule.md](rules/add-capsule.md) | Checklist : créer une nouvelle capsule/mode |
| [llm-clients.md](rules/llm-clients.md) | Factory LLM, stream normalization, providers |
| [prompts-manuals.md](rules/prompts-manuals.md) | Prompts constitutionnels + manuels searchable |
| [frontend-streaming.md](rules/frontend-streaming.md) | Frontend SSE, segments, tool tags, side events |
| [agents-overrides.md](rules/agents-overrides.md) | Agents custom, system agents, overrides |
| [mcp-integration.md](rules/mcp-integration.md) | Intégration MCP externe (stdio + SSE) |
