// Agent Harness — Orchestrator + Capsule architecture
// Pattern: ~18 primitive tools always visible + capsules activated on demand
// Single LLM loop with dynamic tool injection — no router
//
// Chat mode: starts with primitives only → LLM activates capsules as needed
// Builder modes (workflow/form/node_args): auto-activate relevant capsule
// Manual lookup: search_manual / get_manual_section for detailed reference

const { buildOrchestratorToolSet, getCapsuleInfo, CAPSULE_NAMES } = require('./tool-groups');
const { buildSystemPrompt } = require('./agent-runner');
const { createLlmClient } = require('./llm');
const { trackToolUsage } = require('./context/memory-manager');
const { checkPermission } = require('./permissions');
const { createPreviewSession } = require('./live-preview/preview-parser');
const { detectPreviewType } = require('./live-preview/preview-router');
const crypto = require('crypto');

// Fallback for onboarding mode
const { runAgent } = require('./agent-runner');

function _summarizeArgs(args, maxChars = 300) {
  try {
    const s = JSON.stringify(args || {});
    return s.length > maxChars ? s.slice(0, maxChars) + '…' : s;
  } catch { return String(args || ''); }
}

// 100 tours par défaut (était 40). Pour les pipelines avec spawn_subagent +
// dépendances + consolidation + ask_user + multiples retries, 40 saute vite
// et coupe l'agent en plein milieu avec "Limite de boucles atteinte".
const DEFAULT_MAX_LOOPS = parseInt(process.env.AI_DEFAULT_MAX_LOOPS || '100', 10);

/** Résumé 1-ligne des args d'un tool pour affichage UI (hint context). */
function _summarizeToolArgs(name, args) {
  if (!args || typeof args !== 'object') return '';
  if (args.query) return `"${String(args.query).slice(0, 80)}"`;
  if (args.url) return String(args.url).replace(/^https?:\/\//, '').slice(0, 80);
  if (args.path) return String(args.path).slice(0, 80);
  if (args.fileId) return String(args.fileId);
  if (args.key) return String(args.key);
  if (args.prompt) return `"${String(args.prompt).slice(0, 80)}"`;
  if (args.subagent_type) return String(args.subagent_type);
  if (args.to) return String(args.to);
  if (args.language) return `${args.language}${args.code ? ` (${String(args.code).length}c)` : ''}`;
  return '';
}
const STREAM_TIMEOUT_MS = 120_000; // 120s per-event timeout

/**
 * Read next value from async iterator with timeout + abort signal.
 * Rejects immediately if signal is aborted or fires abort during wait.
 */
function nextWithTimeout(iterator, timeoutMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Stream aborted'));

    const timer = setTimeout(
      () => reject(new Error(`LLM stream timeout: no event for ${timeoutMs / 1000}s`)),
      timeoutMs,
    );

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Stream aborted'));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    iterator.next().then(
      r => { if (!settled) { settled = true; cleanup(); resolve(r); } },
      e => { if (!settled) { settled = true; cleanup(); reject(e); } },
    );
  });
}

/**
 * Build capsule instructions for the system prompt (chat mode only).
 */
function buildCapsuleInstructions(activeCapsules) {
  const info = getCapsuleInfo();
  const lines = Object.entries(info).map(([name, i]) => {
    const active = activeCapsules.has(name) ? ' (ACTIVE)' : '';
    return `- **${name}** : ${i.description} (${i.toolCount})${active}`;
  });

  return `

## Capsules d'outils

Tu disposes d'un set de base (~18 outils) toujours disponibles.
Pour des tâches spécialisées, active une capsule avec \`activate_capsule\`.

### Capsules disponibles
${lines.join('\n')}

### Quand activer
- **workflow** : Créer ou modifier un workflow/automatisation
- **form** : Créer ou modifier un formulaire
- **node_args** : Configurer les arguments d'un nœud

### Règles
- **PAS de capsule** pour : questions simples, mémoire, exécutions directes (search_tools → execute_tool)
- Active **DÈS** que nécessaire, ne demande pas la permission
- Après activation, les outils de la capsule deviennent des **TOOL CALLS DIRECTS** dans ta liste d'outils
- **APPELLE-LES DIRECTEMENT** : \`create_flow\`, \`add_node\`, \`connect_nodes\`, etc. — comme n'importe quel autre tool call
- **INTERDIT** : \`search_tools("create_flow")\` ou \`get_tool_details("add_node")\` — ces outils builder ne sont PAS des NodeTemplates
- \`search_tools\` / \`get_tool_details\` = cherche les **NodeTemplates** (actions plugin : Odoo, Slack, Email…)
- Les outils builder = **commandes directes** déjà dans ta liste d'outils après activation
- Après activation, utilise \`search_manual\` pour récupérer les règles détaillées du mode`;
}

/**
 * Main entry point — replaces runAgent() in ai.js.
 * Single orchestrator loop with dynamic capsule activation.
 * Yields the same SSE events as the old runAgent().
 *
 * @param {object} opts
 * @param {string} opts.mode - 'chat' | 'workflow' | 'node_args' | 'form' | 'onboarding'
 * @param {Array} opts.messages
 * @param {object} opts.context
 * @param {object} [opts.metadata]
 * @param {object} [opts.agentOverrides]
 * @yields SSE events
 */
async function* runHarness({ mode, messages, context, metadata, agentOverrides, signal, jobContext }) {
  // Onboarding → fallback to original runAgent
  if (mode === 'onboarding') {
    console.log('[harness] onboarding → original runAgent');
    yield* runAgent({ mode, messages, context, metadata, agentOverrides });
    return;
  }

  // Side events queue (patches, snapshots, args from capsule executors)
  const sideEvents = [];
  const emit = (ev) => sideEvents.push(ev);

  // Determine initial capsules based on mode
  const activeCapsules = new Set();
  if (mode === 'workflow') activeCapsules.add('workflow');
  if (mode === 'form') activeCapsules.add('form');
  if (mode === 'node_args') activeCapsules.add('node_args');
  if (mode === 'project') {
    activeCapsules.add('project_fs');
    activeCapsules.add('document');
    activeCapsules.add('code_exec');
    activeCapsules.add('web');
  }
  // Mode chat : capsule web auto-activée pour les recherches / téléchargements
  if (mode === 'chat') {
    activeCapsules.add('web');
  }
  // chat mode: NO capsules initially — LLM activates on demand

  // Load MCP tools for workspace
  let mcpTools = [];
  try {
    if (metadata?.workspaceId) {
      const { mcpRegistry } = require('./mcp/mcp-registry');
      mcpTools = await mcpRegistry.getTools(metadata.workspaceId);
    }
  } catch (e) {
    console.error('[harness] MCP tools load error:', e.message);
  }

  // Build metadata
  const modeMetadata = {
    ...(metadata || {}),
    workspaceId: context.workspaceId || metadata?.workspaceId,
  };
  context._metadata = modeMetadata;
  // Propage threadId + companyId + userId dans le context pour les meta-tools
  // (spawn_subagent, research_deep, render_structured, propose_plan, etc.)
  if (modeMetadata.threadId) context.threadId = modeMetadata.threadId;
  if (modeMetadata.companyId && !context.companyId) context.companyId = modeMetadata.companyId;
  if (modeMetadata.userId && !context.userId) context.userId = modeMetadata.userId;
  // Expose jobContext so meta-tools (spawn_subagent, research_deep) can use it.
  if (jobContext) context._jobContext = jobContext;

  // Build tool set (mutable — supports dynamic capsule activation)
  const toolSet = buildOrchestratorToolSet({
    context,
    metadata: modeMetadata,
    emit,
    activeCapsules,
    blockedTools: agentOverrides?.blockedTools || [],
    allowedTools: agentOverrides?.allowedTools || null,
    mcpTools,
  });

  // Build system prompt (reuses buildSystemPrompt from agent-runner)
  let systemPrompt = buildSystemPrompt(mode, context);
  // Add capsule instructions for chat mode
  if (mode === 'chat') {
    systemPrompt += buildCapsuleInstructions(activeCapsules);
  }
  // Optional custom system prompt from agent override (sub-agent type system prompt, etc.)
  if (agentOverrides?.systemPrompt) {
    systemPrompt += '\n\n## Instructions personnalisées\n' + agentOverrides.systemPrompt;
  }
  // Règle spéciale pour les sous-agents : escalade toutes les questions / permissions
  // à leur parent (jamais directement à l'utilisateur).
  if (jobContext?.parentJobId) {
    systemPrompt += `

## 🤖 TU ES UN SOUS-AGENT — RÈGLES ABSOLUES (violation = bug)

**Tu n'es PAS en conversation avec un humain.** Tu es un worker spécialisé qui reçoit une tâche,
l'exécute, et rend un rapport structuré à ton agent parent. Ton output est une DONNÉE CONSOMMÉE
par le parent, PAS un message de chat.

### 🚫 PHRASES STRICTEMENT INTERDITES
- "Y a-t-il autre chose ?"
- "Je suis à votre disposition"
- "Souhaitez-vous que je..."
- "Voulez-vous que j'exécute une action supplémentaire ?"
- "Je m'excuse pour la confusion"
- "J'espère que ces informations vous seront utiles"
- "N'hésitez pas à me demander"
- Toute formule de politesse conversationnelle adressée à un utilisateur.

### ✅ FORMAT DE SORTIE OBLIGATOIRE
Ton DERNIER message doit être un rapport structuré, factuel, dense, et TERMINÉ :
- Commence directement par le contenu (pas "Bonjour", pas "Je vais vous présenter")
- Titres markdown (## ou ###) pour la structure
- Puces pour les listes, tableaux pour les comparatifs
- Sources citées avec URL si applicable
- FIN du message = FIN. Pas d'invitation à continuer, pas de question finale.

### 🎯 SI TU MANQUES D'INFO
- N'invente PAS, n'hallucine PAS
- Utilise \`ask_user\` (la question est escaladée au parent, pas à un humain)
- OU déclare explicitement "information non trouvée dans les sources disponibles" dans ton rapport
- JAMAIS de "Pouvez-vous préciser ?" en texte libre

### 🔒 SÉCURITÉ CONVERSATIONNELLE
- Tu ne vois PAS les messages de l'utilisateur humain dans ton historique.
- Ce que tu vois dans le prompt initial = la tâche que ton parent t'a confiée. C'est une instruction, pas une conversation.
- Le bloc "CONTEXTE (résultats des étapes précédentes)" que tu vois parfois = data upstream d'autres subagents, à CONSOMMER DIRECTEMENT sans redemander.
- Tu n'as AUCUNE relation avec l'utilisateur. Tu rapportes à un agent parent, point final.

### 📦 LIVRABLES
Si ton rôle est de produire un livrable (document, tableau, fichier), utilise les tools appropriés
(render_structured, display_file, project_write_file, etc.) puis termine par un court résumé
factuel des livrables créés avec leurs IDs/paths. Pas de phrase de conclusion polie.`;
  }

  // LLM client (with agent overrides)
  const env = require('../config/env');
  const llmConfig = { ...context.llmConfig };
  // Si AI_PROVIDER est set explicitement en env, il gagne TOUJOURS sur l'override
  // de l'agent sélectionné (fix demandé par le user : env AI_PROVIDER=openai doit
  // être respecté même si l'AiAgent.llmProvider est 'anthropic').
  const envForcesProvider = !!process.env.AI_PROVIDER;
  if (agentOverrides?.llmProvider && !envForcesProvider) {
    llmConfig.provider = agentOverrides.llmProvider;
    const p = agentOverrides.llmProvider.toLowerCase();
    llmConfig.apiKey = (p === 'anthropic' || p === 'claude') ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  }
  if (agentOverrides?.llmModel && !envForcesProvider) llmConfig.model = agentOverrides.llmModel;
  // Log pour debug
  if (envForcesProvider) {
    console.log(`[harness] AI_PROVIDER=${process.env.AI_PROVIDER} forcé (agent override ignoré)`);
  }
  const llm = createLlmClient(llmConfig.provider, llmConfig);

  // Build conversation
  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // ── Pré-flight todo_write : si le DERNIER message user a des marqueurs de
  // tâche multi-étapes ET qu'on n'est PAS dans un auto-resume (le resume
  // prompt gère déjà la todo), on injecte un system message FORT avant le
  // 1er call LLM pour l'inciter à appeler todo_write
  // en premier. Beaucoup plus fiable que d'attendre un nudge post-hoc.
  try {
    const lastUserMsg = [...conversation].reverse().find(m => m.role === 'user');
    const text = String(lastUserMsg?.content || '').toLowerCase();
    // Skip si auto-resume (le resume prompt gère déjà la todo et on ne veut
    // pas créer un 2e widget todo dupliqué).
    const isAutoResume = text.includes('Tous les sous-agents lancés sont terminés') || text.includes('[Pipeline complete]');
    if (text.length > 30 && (mode === 'chat' || mode === 'project') && !isAutoResume) {
      const MULTI_STEP_MARKERS = /\b(puis|ensuite|apr[eè]s|et\s+(?:ensuite|apr[eè]s|afficher?|g[eé]n[eé]rer?|cr[eé]er?|envoyer?|d[eé]poser?)|analyse[rz]?\b|[eé]tude|consolide[rz]?|chercher? et|g[eé]n[eé]r(?:e[rz]?|ation)|cr[eé]er? (?:un|le|la)|construir?e|faire? (?:un|le|la)|lance[rz]?|spawn)/i;
      const verbCount = (text.match(/\b(cherche|analyse|trouve|g[eé]n[eé]re|cr[eé]e|affiche|envoie|t[eé]l[eé]charge|lance|fais|fait|d[eé]pose|extrais?|rassemble|compare|consolide)\b/gi) || []).length;
      const hasMulti = MULTI_STEP_MARKERS.test(text) || verbCount >= 2;
      if (hasMulti) {
        conversation.splice(1, 0, {
          role: 'system',
          content: `[PROTOCOLE HOMEPORT] La demande utilisateur est multi-étapes. TA PREMIÈRE ACTION DOIT ÊTRE un appel \`todo_write\` avec 3-6 items couvrant le plan complet. Items au statut "pending" pour toute la suite, le premier que tu vas exécuter à "in_progress". SANS cet appel initial, l'utilisateur ne verra aucune checklist et ce sera une violation du protocole. Appelle todo_write IMMÉDIATEMENT, avant tout autre tool.`,
        });
        console.log('[harness] pré-flight todo_write : user request détectée comme multi-étapes, injection du reminder');
      }
    }
  } catch (e) {
    console.warn('[harness] pré-flight todo check failed:', e?.message);
  }

  const maxLoops = agentOverrides?.maxToolLoops || DEFAULT_MAX_LOOPS;
  let loopCount = 0;
  let totalUsage = { input: 0, output: 0 };

  console.log(`[harness] start: mode=${mode}, capsules=[${[...activeCapsules]}], tools=${toolSet.definitions.length}, provider=${llm.provider}, model=${llmConfig.model}`);

  while (loopCount < maxLoops) {
    if (signal?.aborted) { console.log('[harness] aborted before loop', loopCount + 1); break; }
    loopCount++;
    console.log(`[harness] loop ${loopCount}/${maxLoops}, tools=${toolSet.definitions.length}`);
    yield { type: 'thinking', iteration: loopCount };

    // ── Mailbox drain : si des messages ont été empilés dans le job pendant
    // qu'il tournait (par l'user, le parent, un autre agent), on les injecte
    // comme messages system AVANT d'appeler le LLM pour qu'il en tienne
    // compte dans son prochain tour. Pattern claude-code / SendMessageTool.
    if (jobContext?.jobId) {
      try {
        const AiJob = require('../db/models/ai-job.model');
        const j = await AiJob.findOne({ id: jobContext.jobId }, 'pendingMessages').lean();
        const pending = (j?.pendingMessages || []).filter(m => m && !m.delivered);
        if (pending.length) {
          console.log(`[harness] mailbox drain: ${pending.length} message(s) pour job=${jobContext.jobId}`);
          const blocks = pending.map(m => {
            const who = m.fromName || m.from || 'user';
            const when = m.createdAt ? new Date(m.createdAt).toISOString() : '';
            return `<incoming-message from="${who}"${when ? ` at="${when}"` : ''}>\n${m.message}\n</incoming-message>`;
          }).join('\n\n');
          conversation.push({
            role: 'user',
            content: `[MESSAGES REÇUS PENDANT TON EXÉCUTION — tiens-en compte]\n\n${blocks}\n\n(Fin des messages. Continue ta tâche en intégrant ces instructions si pertinent. Si une question attend une réponse, réponds-y clairement avant de continuer.)`,
          });
          // Marque les messages comme delivered pour ne pas les réinjecter.
          await AiJob.updateOne(
            { id: jobContext.jobId },
            { $set: { 'pendingMessages.$[elem].delivered': true } },
            { arrayFilters: [{ 'elem.delivered': { $ne: true } }] }
          ).catch(() => {});
          yield { type: 'mailbox.delivered', count: pending.length };
        }
      } catch (e) {
        console.warn('[harness] mailbox drain failed:', e?.message);
      }
    }

    let stream;
    try {
      stream = llm.stream(conversation, toolSet.definitions);
    } catch (streamInitErr) {
      console.error('[harness] LLM stream init error:', streamInitErr?.message || streamInitErr);
      throw streamInitErr;
    }

    const pendingToolCalls = [];
    const toolInputBuffers = new Map();   // id → accumulated JSON string
    const toolMetaResolved = new Set();   // ids where tool.meta already sent
    const previewSessions = new Map();    // id → preview parser session (ui.preview.delta)
    let assistantText = '';
    let eventCount = 0;

    // Manual iteration with per-event timeout (replaces for-await)
    const it = stream[Symbol.asyncIterator]();
    try {
      while (true) {
        if (signal?.aborted) break;
        // Yield to event loop every 20 events so req.on('close') can fire
        if (eventCount > 0 && eventCount % 20 === 0) {
          await new Promise(r => setImmediate(r));
          if (signal?.aborted) break;
        }
        const { done, value: event } = await nextWithTimeout(it, STREAM_TIMEOUT_MS, signal);
        if (done) break;
        eventCount++;

        switch (event.type) {
          case 'text_delta':
            assistantText += event.text;
            yield { type: 'message', text: event.text };
            break;
          case 'tool_use_start':
            console.log(`[harness] stream: tool_use_start → ${event.name} (id=${event.id})`);
            yield { type: 'tool.start', id: event.id, name: event.name };
            // Init live-preview session si le tool est concerné (render_structured, generate_diagram, etc.)
            {
              const pvType = detectPreviewType(event.name);
              if (pvType && !previewSessions.has(event.id)) {
                previewSessions.set(event.id, {
                  session: createPreviewSession(event.id, event.name),
                  previewType: pvType,
                  started: false,
                });
              }
            }
            break;
          case 'tool_input_delta': {
            // Accumulate JSON for early key detection
            let buf = toolInputBuffers.get(event.id) || '';
            buf += event.text;
            toolInputBuffers.set(event.id, buf);
            // Log seulement si AI_DEBUG=1 (trop verbeux sur les gros args)
            if (process.env.AI_DEBUG) console.log(`[harness] stream: tool_input_delta → ${event.name} +${event.text.length}chars (id=${event.id}), buf=${buf.length}chars`);

            yield { type: 'tool.input_delta', id: event.id, name: event.name, text: event.text };

            // ── Live preview: emit `ui.preview.delta` with incremental JSON patch
            {
              const pv = previewSessions.get(event.id);
              if (pv) {
                try {
                  const out = pv.session.apply(event.text);
                  if (out) {
                    if (!pv.started) {
                      pv.started = true;
                      yield {
                        type: 'ui.preview.start',
                        toolId: event.id,
                        toolName: event.name,
                        previewType: pv.previewType,
                      };
                    }
                    yield {
                      type: 'ui.preview.delta',
                      toolId: event.id,
                      toolName: event.name,
                      previewType: pv.previewType,
                      patch: out.patch,
                      // Snapshot inclus pour permettre au front de récupérer l'état complet
                      // sans appliquer manuellement chaque patch si worker indispo.
                      state: out.state,
                    };
                  }
                } catch (pvErr) {
                  // Ne jamais casser le stream à cause d'une preview
                  console.warn('[harness] preview apply error:', pvErr?.message);
                }
              }
            }

            // Early detection: for execute_tool, extract "key" from partial JSON
            if (event.name === 'execute_tool' && !toolMetaResolved.has(event.id)) {
              const keyMatch = buf.match(/"key"\s*:\s*"([^"]+)"/);
              if (keyMatch) {
                toolMetaResolved.add(event.id);
                const templateKey = keyMatch[1];
                console.log(`[harness] early key detected: "${templateKey}" — looking up NodeTemplate`);
                try {
                  const NodeTemplate = require('../db/models/node-template.model');
                  const tpl = await NodeTemplate.findOne({ key: templateKey }, 'title name args').lean();
                  if (tpl) {
                    const { flattenFields } = require('./tools/tool-converter');
                    const displayTitle = tpl.title || tpl.name || templateKey;
                    const fields = flattenFields(tpl.args?.fields || []);
                    const argsSchema = fields.filter(f => f.key).map(f => ({
                      key: f.key, label: f.label || f.title || f.key
                    }));
                    console.log(`[harness] → tool.meta: "${displayTitle}", ${argsSchema.length} fields`);
                    yield { type: 'tool.meta', id: event.id, displayTitle, argsSchema };
                  } else {
                    console.log(`[harness] → NodeTemplate not found for key="${templateKey}"`);
                  }
                } catch (e) {
                  console.error('[harness] early meta resolve error:', e.message);
                }
              }
            }
            break;
          }
          case 'tool_use_end': {
            console.log(`[harness] stream: tool_use_end → ${event.name} (id=${event.id})`);
            const tcEntry = { id: event.id, name: event.name, input: event.input };
            // Fallback: key wasn't detected during deltas (e.g., no deltas streamed)
            if (event.name === 'execute_tool' && event.input?.key && !toolMetaResolved.has(event.id)) {
              try {
                const NodeTemplate = require('../db/models/node-template.model');
                const tpl = await NodeTemplate.findOne({ key: event.input.key }, 'title name args').lean();
                if (tpl) {
                  const { flattenFields } = require('./tools/tool-converter');
                  tcEntry._displayTitle = tpl.title || tpl.name || event.input.key;
                  const fields = flattenFields(tpl.args?.fields || []);
                  const argsSchema = fields.filter(f => f.key).map(f => ({
                    key: f.key, label: f.label || f.title || f.key
                  }));
                  yield { type: 'tool.meta', id: event.id, displayTitle: tcEntry._displayTitle, argsSchema };
                }
              } catch (e) {
                console.error('[harness] title fallback error:', e.message);
              }
            }
            // Signal frontend: args are complete → transition building → running
            yield { type: 'tool.building_done', id: event.id };
            // Flush live preview avec l'état final si session active
            {
              const pv = previewSessions.get(event.id);
              if (pv && pv.started) {
                yield {
                  type: 'ui.preview.building_done',
                  toolId: event.id,
                  toolName: event.name,
                  previewType: pv.previewType,
                  state: pv.session.state,
                };
              }
            }
            pendingToolCalls.push(tcEntry);
            break;
          }
          case 'done':
            if (event.usage) {
              totalUsage.input += event.usage.input || 0;
              totalUsage.output += event.usage.output || 0;
            }
            console.log(`[harness] stream: done (events=${eventCount}, usage=${JSON.stringify(event.usage || {})})`);
            break;
          default:
            console.log(`[harness] stream: unknown event type "${event.type}"`);
            break;
        }
      }
    } catch (streamErr) {
      // Client disconnected — clean exit
      if (streamErr?.message === 'Stream aborted') {
        console.log(`[harness] stream aborted by client after ${eventCount} events`);
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      console.error(`[harness] stream error after ${eventCount} events:`, streamErr?.message || streamErr);
      // If we got text, yield what we have before throwing
      if (assistantText && pendingToolCalls.length === 0) {
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
      throw streamErr;
    }

    console.log(`[harness] stream complete: events=${eventCount}, text=${assistantText.length}chars, pendingTools=${pendingToolCalls.length}`);

    // Client disconnected mid-stream → stop immediately
    if (signal?.aborted) {
      console.log('[harness] aborted after stream, cleaning up');
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // No tool calls → soit l'agent a fini, soit promesse vide à corriger.
    if (pendingToolCalls.length === 0) {
      // Détection promesse vide : message qui annonce une action SANS tool.
      // On laisse au LLM 1 chance de se corriger via un nudge système.
      const EMPTY_PROMISE_PATTERNS = /\b(je\s+(?:lance|exécute|execute|vais|m['e ]occupe|fais|corrige|génère|genere|produis|crée|cree|envoie|extrais|construis|bascule|relance|reprends|continue|dépose|depose|mets|poste|pousse|ajoute|téléverse|televerse|upload|télécharge|telecharge|récupère|recupere|sauvegarde|réessaie|reessaie|retente|publie|partage|regénère|regenere|réexécute|reexecute|recommence|réécris|reecris|prépare|prepare|rédige|redige|finalise|assemble|compile|formate|structure))\b|\bj['e ]exécute\b|\bje\s+viens\s+de\b|\bje\s+le\s+(?:dépose|depose|mets|poste|pousse|sauvegarde|envoie|upload|téléverse|televerse)\b|\bje\s+(?:te|vous)\s+(?:le|la|les)\s+(?:dépose|depose|envoie|partage|transmets|prépare|prepare|renvoie|renvois|montre|livre|affiche|rends)\b|\bje\s+(?:te|vous)\s+(?:prépare|prepare|renvoie|renvois|montre|livre|affiche|rends|donne|génère|genere|propose|fais)\b|\bon\s+(?:repart|reprend|y\s+va|recommence|refait|relance)\b|\bc['e ]est\s+parti\b|maintenant\s*[.!]?$|juste\s+après\b|dans\s+(?:la|le|une|un)\s+(?:foulée|seconde|minute|instant)|j['e ]exécute la correction maintenant/i;
      const looksLikePromise = assistantText && EMPTY_PROMISE_PATTERNS.test(assistantText);
      const _emptyRetries = (jobContext?._emptyPromiseRetries || 0);
      if (looksLikePromise && _emptyRetries < 1) {
        console.warn(`[harness] empty promise detected (no tool, text="${assistantText.slice(0, 120)}…"), nudging LLM to actually execute`);
        if (jobContext) jobContext._emptyPromiseRetries = _emptyRetries + 1;
        // Émet un thinking pour que le frontend affiche "réflexion en cours…"
        // pendant le nudge silencieux (sinon l'user voit juste un blanc).
        yield { type: 'thinking', iteration: loopCount + 1, reason: 'auto_resume_after_empty_promise' };
        // Push assistant message + nudge système
        conversation.push({ role: 'assistant', content: assistantText });
        conversation.push({
          role: 'user',
          content: '[SYSTÈME] Tu viens d\'annoncer une action (au présent, futur OU passé composé type "je viens de déposer / fichier créé") mais n\'as appelé AUCUN tool dans ce tour. C\'est interdit — tu mens à l\'utilisateur. Appelle MAINTENANT le tool qui exécute réellement l\'action (execute_code, project_write, files.upload, etc.). Si une action précédente a échoué, NE prétends PAS qu\'elle a réussi : relis le dernier tool result, reprends le tool correctif avec les BONS IDs du result, et exécute. Si tu manques d\'info, utilise ask_user pour UNE question courte. Interdit de répondre uniquement par du texte.',
        });
        if (jobContext) {
          try { await jobContext.persistCheckpoint(loopCount, conversation); } catch {}
        }
        continue; // relance la boucle LLM
      }
      await toolSet.cleanup();
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // ── Nudge todo_write : si le LLM lance 2+ tools lourds (spawn_subagent,
    // research_deep, execute_code, web_search/fetch) sans avoir encore appelé
    // todo_write, on pousse une instruction système pour qu'il le fasse au
    // prochain tour. Une seule fois par job.
    const HEAVY_TOOLS = new Set(['spawn_subagent', 'research_deep', 'execute_code', 'web_search', 'web_fetch']);
    const heavyCount = pendingToolCalls.filter(tc => HEAVY_TOOLS.has(tc.name)).length;
    const hasTodo = pendingToolCalls.some(tc => tc.name === 'todo_write');
    if (hasTodo && jobContext) jobContext._seenTodoWrite = true;
    const shouldNudgeTodo = heavyCount >= 2
      && !hasTodo
      && !(jobContext?._seenTodoWrite)
      && !(jobContext?._todoNudged)
      && jobContext;
    if (shouldNudgeTodo) {
      console.log(`[harness] todo_write nudge : ${heavyCount} tools lourds sans checklist — push system reminder`);
      jobContext._todoNudged = true;
    }

    // ── GARDE ANTI-HALLUCINATION : si ce tour contient spawn_subagent async
    // + un tool finalizer (render_structured, display_file, etc.), on bloque
    // le finalizer. Raison : le LLM a délégué la production à un subagent →
    // il ne doit PAS produire le livrable lui-même (sinon il hallucine les
    // données que le subagent n'a pas encore fournies).
    const FINALIZER_TOOLS = new Set([
      'render_structured', 'display_file', 'display_image',
      'render_interactive_canvas', 'generate_diagram', 'generate_document',
    ]);
    const hasAsyncSpawn = pendingToolCalls.some(tc =>
      tc.name === 'spawn_subagent' && (tc.input?.async === true || (Array.isArray(tc.input?.depends_on) && tc.input.depends_on.length > 0))
    );
    const finalizersInTurn = pendingToolCalls.filter(tc => FINALIZER_TOOLS.has(tc.name));
    const blockedFinalizerIds = new Set();
    if (hasAsyncSpawn && finalizersInTurn.length > 0) {
      for (const fin of finalizersInTurn) {
        console.warn(`[harness] ANTI-HALLUCINATION : blocage ${fin.name} (id=${fin.id}) car spawn_subagent async est dans le même tour → le subagent doit produire le livrable, pas le parent`);
        blockedFinalizerIds.add(fin.id);
      }
    }

    // Execute tools
    const toolResults = [];
    for (const tc of pendingToolCalls) {
      if (signal?.aborted) { console.log('[harness] aborted before tool:', tc.name); break; }
      const startTime = Date.now();
      console.log(`[harness] tool: ${tc.name}`, JSON.stringify(tc.input || {}).slice(0, 500));

      // ── Permission gate ────────────────────────────────────────────
      let permCheck = { decision: 'allow', risk: 'safe' };
      try {
        permCheck = await checkPermission({
          threadId: modeMetadata.threadId || context._threadId,
          workspaceId: modeMetadata.workspaceId,
          jobId: jobContext?.jobId,
          toolName: tc.name,
          toolArgs: tc.input || {},
          autonomy: context._autonomyLevel || 'autonomous',
          userId: context.userId,
        });
      } catch (permErr) {
        // If the gate itself errors, we default to allow to keep legacy behavior.
        console.error('[harness] permission check error:', permErr?.message);
      }

      // ── Anti-hallucination : si le finalizer est bloqué (spawn_subagent
      // async dans le même tour), on refuse et renvoie un message clair au LLM.
      if (blockedFinalizerIds.has(tc.id)) {
        const blockResult = {
          ok: false,
          error: 'finalizer_blocked_by_async_spawn',
          message: `Tu as appelé ${tc.name} DANS LE MÊME TOUR que spawn_subagent(async). Le subagent que tu viens de lancer est responsable du livrable. TU NE DOIS PAS produire ${tc.name} toi-même maintenant — tu hallucinerais des données que le subagent n'a pas encore fournies. CONDUITE : termine ce tour avec 1-2 phrases narratives ("Subagents lancés, je reviens avec les résultats") puis STOP. L'auto-resume te réveillera quand les subagents auront fini, avec leurs vraies données.`,
        };
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(blockResult), status: 'error', duration: 0 });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: blockResult, status: 'error', duration: 0 };
        continue;
      }

      if (permCheck.decision === 'deny') {
        const denyResult = { ok: false, error: 'permission_denied', reason: permCheck.reason, risk: permCheck.risk };
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
        continue;
      }

      if (permCheck.decision === 'pending') {
        if (!jobContext) {
          // Legacy mode: auto-allow but log a warning.
          console.warn(`[harness] permission pending for ${tc.name} but no jobContext — auto-allowing (legacy)`);
        } else {
          const requestId = crypto.randomUUID();
          const argsPreview = _summarizeArgs(tc.input);
          // Subagent ? → escalade au parent ET à l'user en parallèle.
          // Le premier qui répond gagne. Évite le cas "parent silencieux" (cascade
          // async où l'agent principal n'écoute plus) qui aboutissait au timeout 5min.
          const parentJobId = jobContext.parentJobId ? String(jobContext.parentJobId) : null;
          if (parentJobId) {
            const { emitJobEvent, emitThreadEvent, waitForPermissionFromParent, waitForPermission } = require('./jobs/job-events');
            const threadId = modeMetadata.threadId || context._threadId;
            // 1. Notifie le parent (il peut auto-répondre via subagent.permission.granted)
            emitJobEvent(parentJobId, {
              type: 'subagent.permission.request',
              requestId,
              childJobId: jobContext.jobId,
              toolName: tc.name,
              argsPreview,
              risk: permCheck.risk,
            });
            jobContext.broadcast && jobContext.broadcast({
              type: 'subagent.permission.request',
              requestId, toolName: tc.name, risk: permCheck.risk,
              argsPreview, childJobId: jobContext.jobId, parentJobId,
            });
            // 2. Promotion à l'user via thread stream + AiMessage permission card,
            //    pour qu'il puisse répondre directement sans passer par le parent LLM.
            if (threadId) {
              try {
                const AiMessage = require('../db/models/ai-message.model');
                await AiMessage.create({
                  threadId,
                  // role 'assistant' : le ngSwitch frontend rend la card permission
                  // (le role 'system' est affiché comme "Contexte transféré").
                  role: 'assistant',
                  content: `Permission demandée par sous-agent : ${tc.name}`,
                  metadata: {
                    kind: 'permission_request',
                    permissionRequest: {
                      requestId,
                      toolName: tc.name,
                      argsPreview,
                      risk: permCheck.risk,
                      childJobId: jobContext.jobId,
                      parentJobId,
                      escalatedFromSubagent: true,
                    },
                  },
                });
                emitThreadEvent(String(threadId), {
                  type: 'ai.permission.request',
                  requestId, toolName: tc.name, risk: permCheck.risk,
                  argsPreview, childJobId: jobContext.jobId, parentJobId,
                  escalatedFromSubagent: true,
                });
                emitThreadEvent(String(threadId), { type: 'ai.message.created', kind: 'permission_request' });
              } catch (e) {
                console.error('[harness] subagent permission UI promote failed:', e?.message);
              }
            }
            // 3. Marque le subagent en waiting_permission (UI canvas + DB pour reload)
            try {
              const AiJob = require('../db/models/ai-job.model');
              await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'waiting_permission' } });
              if (threadId) {
                emitThreadEvent(String(threadId), {
                  type: 'canvas.task.update',
                  taskId: jobContext.jobId,
                  status: 'waiting_permission',
                  pendingPermission: { requestId, toolName: tc.name, risk: permCheck.risk },
                });
              }
            } catch { /* non-fatal */ }

            // 4. Race : le parent peut répondre (subagent.permission.granted) OU
            //    l'user peut répondre directement (permission.resolved sur le job).
            const fromParent = waitForPermissionFromParent(parentJobId, requestId, 10 * 60_000);
            const fromUser = waitForPermission(jobContext.jobId, requestId, 10 * 60_000);
            const resolved = await Promise.race([fromParent, fromUser]);

            // 5. Repasse en running (avant le tool exec ou le deny)
            try {
              const AiJob = require('../db/models/ai-job.model');
              await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'running' } });
              if (threadId) {
                emitThreadEvent(String(threadId), {
                  type: 'canvas.task.update',
                  taskId: jobContext.jobId,
                  status: 'running',
                });
              }
            } catch { /* non-fatal */ }

            if (resolved !== 'allow') {
              const denyResult = { ok: false, error: 'permission_denied', reason: 'denied', risk: permCheck.risk };
              toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
              yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
              continue;
            }
          } else {
            // Agent principal : flow classique → demande à l'user via SSE.
            yield {
              type: 'ai.permission.request',
              requestId,
              toolName: tc.name,
              argsPreview,
              risk: permCheck.risk,
            };
            jobContext.broadcast && jobContext.broadcast({
              type: 'ai.permission.request',
              requestId, toolName: tc.name, risk: permCheck.risk,
              argsPreview,
            });
            const resolved = await jobContext.waitForPermission(requestId, 5 * 60_000);
            if (resolved !== 'allow') {
              const denyResult = { ok: false, error: 'permission_denied', reason: 'user_denied', risk: permCheck.risk };
              toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(denyResult), status: 'error', duration: 0 });
              yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: denyResult, status: 'error', duration: 0 };
              continue;
            }
          }
        }
      }

      try {
        const result = await toolSet.execute(tc.name, tc.input, { toolId: tc.id, toolName: tc.name });
        const duration = Date.now() - startTime;

        // ── Handle capsule activation ──
        if (result?._capsuleRequest) {
          const { capsule, reason } = result;
          const activation = toolSet.activateCapsule(capsule);
          console.log(`[harness] capsule ${capsule}:`, JSON.stringify(activation));

          const capsuleInfo = getCapsuleInfo()[capsule];
          const response = activation.activated
            ? {
              ok: true,
              message: `Capsule "${capsule}" activée. ${capsuleInfo?.toolCount || ''} outils disponibles. ` +
                `IMPORTANT : ces outils sont maintenant des tool calls DIRECTS. ` +
                `Appelle-les DIRECTEMENT (ex: create_flow, add_node). ` +
                `NE PAS utiliser search_tools ou get_tool_details pour ces outils.`,
              newTools: activation.newTools,
            }
            : activation.alreadyActive
              ? { ok: true, message: `Capsule "${capsule}" déjà active. Utilise les outils DIRECTEMENT.` }
              : { ok: false, error: activation.error || `Impossible d'activer "${capsule}".` };

          const capsuleStatus = response.ok === false ? 'error' : 'success';
          toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(response), status: capsuleStatus, duration });
          yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result: response, status: capsuleStatus, duration };
          continue;
        }

        // ── Normal tool result ──
        // Use pre-resolved displayTitle (from tool_use_end DB lookup), fallback to _displayTitle side-channel
        let displayTitle = tc._displayTitle;
        if (result?._displayTitle) {
          if (!displayTitle) displayTitle = result._displayTitle;
          delete result._displayTitle; // Clean up before LLM serialization
        }
        const toolStatus = result?.ok === false ? 'error' : 'success';
        console.log(`[harness] tool ${tc.name} ${toolStatus} (${duration}ms), displayTitle="${displayTitle || 'none'}":`, JSON.stringify(result || {}).slice(0, 300));
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify(result), status: toolStatus, duration, result });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, result, status: toolStatus, duration, displayTitle };

        // ── Tracking todo_write : si un item est in_progress, on accumule les
        // tools pour les attacher à l'item au prochain todo_write.
        if (jobContext && tc.name !== 'todo_write') {
          if (!jobContext._todoPendingTools) jobContext._todoPendingTools = [];
          const argsSummary = _summarizeToolArgs(tc.name, tc.input);
          const entry = {
            name: tc.name,
            status: toolStatus,
            duration,
            argsSummary,
            at: new Date(),
          };
          // Enrichit avec roster si spawn_subagent
          if (tc.name === 'spawn_subagent' && tc.input?.subagent_type) {
            try {
              const { getAgent } = require('./subagent/roster');
              const info = getAgent(tc.input.subagent_type);
              if (info) {
                entry.agentName = info.name;
                entry.agentEmoji = info.emoji;
                entry.agentColor = info.color;
                entry.subagentType = tc.input.subagent_type;
              }
            } catch {}
            // Mémorise le jobId du subagent spawné pour que le frontend puisse
            // lier le todo item au rapport agent_report quand il arrivera.
            if (result?.result?.jobId) entry.spawnedJobId = result.result.jobId;
            else if (result?.jobId) entry.spawnedJobId = result.jobId;
          }
          jobContext._todoPendingTools.push(entry);
        }

        // Action events (open_credentials, etc.)
        if (result?._action) {
          yield { type: 'action', action: result.action, providerKey: result.providerKey, providerName: result.providerName };
        }

        // Track tool usage for analytics
        if (tc.name === 'execute_tool' && tc.input?.key && context.userId) {
          trackToolUsage(context.userId, tc.input.key, context.companyId).catch(() => {});
        }

        // Drain side events from capsule executors
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;

      } catch (e) {
        const duration = Date.now() - startTime;
        const errMsg = e?.message || String(e);
        console.error(`[harness] tool ${tc.name} ERROR (${duration}ms):`, errMsg);
        toolResults.push({ id: tc.id, name: tc.name, content: JSON.stringify({ error: errMsg }), status: 'error', duration });
        yield { type: 'tool.end', id: tc.id, name: tc.name, args: tc.input, error: errMsg, status: 'error', duration, displayTitle: tc._displayTitle };

        // Still drain side events
        for (const ev of sideEvents) yield ev;
        sideEvents.length = 0;
      }
    }

    // Check for ask_user — subagent escalates to parent, main agent pauses for user
    const askUserCall = pendingToolCalls.find(tc => tc.name === 'ask_user');
    if (askUserCall) {
      const askResult = toolResults.find(r => r.id === askUserCall.id);
      const parentJobId = jobContext?.parentJobId ? String(jobContext.parentJobId) : null;

      if (parentJobId && askResult?.result) {
        // ── SUBAGENT : escalade la question au parent + visibilité user ───
        const { emitJobEvent, emitThreadEvent, waitForAskUserFromParent } = require('./jobs/job-events');
        const requestId = crypto.randomUUID();
        const threadId = modeMetadata.threadId || context._threadId;
        emitJobEvent(parentJobId, {
          type: 'subagent.ask_user.request',
          requestId,
          childJobId: jobContext.jobId,
          question: askResult.result.text || '',
          options: askResult.result.options || [],
          questionType: askResult.result.questionType || 'text',
          questions: askResult.result.questions || null,
        });
        jobContext.broadcast && jobContext.broadcast({
          type: 'subagent.ask_user.request',
          requestId, childJobId: jobContext.jobId, parentJobId,
          question: askResult.result.text || '',
        });
        // Promotion à l'user : crée un AiMessage visible dans le chat avec la
        // question. L'user peut répondre via le mécanisme question normal.
        if (threadId) {
          try {
            const AiMessage = require('../db/models/ai-message.model');
            await AiMessage.create({
              threadId,
              role: 'assistant',
              content: askResult.result.text || 'Question du sous-agent',
              question: {
                text: askResult.result.text || '',
                questionType: askResult.result.questionType || 'text',
                options: askResult.result.options || [],
                questions: askResult.result.questions || null,
              },
              metadata: {
                extra: {
                  subagentQuestion: true,
                  requestId, parentJobId, childJobId: jobContext.jobId,
                },
              },
            });
            emitThreadEvent(String(threadId), { type: 'ai.message.created', kind: 'subagent_question' });
            // Marque le subagent comme attente question (différent de waiting_permission)
            const AiJob = require('../db/models/ai-job.model');
            await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'waiting_permission' } });
            emitThreadEvent(String(threadId), {
              type: 'canvas.task.update',
              taskId: jobContext.jobId,
              status: 'waiting_permission',
              pendingPermission: { requestId, toolName: 'ask_user', risk: 'safe' },
            });
          } catch (e) { console.error('[harness] subagent ask_user UI promote failed:', e?.message); }
        }
        const { answer, source } = await waitForAskUserFromParent(parentJobId, requestId, 10 * 60_000);
        // Restore running status après réponse
        if (threadId) {
          try {
            const AiJob = require('../db/models/ai-job.model');
            await AiJob.updateOne({ id: jobContext.jobId }, { $set: { status: 'running' } });
            emitThreadEvent(String(threadId), {
              type: 'canvas.task.update', taskId: jobContext.jobId, status: 'running',
            });
          } catch {}
        }
        // Réinjecte la réponse comme tool_result pour que le subagent poursuive sa boucle.
        const answerPayload = {
          ok: true,
          answer: answer == null ? '(pas de réponse — timeout ou non-bloquant)' : answer,
          source: source || 'parent_auto',
        };
        conversation.push({
          role: 'assistant',
          content: assistantText || null,
          tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
        });
        // Tous les autres tool_results déjà calculés + la réponse injectée pour ask_user
        for (const tr of toolResults) {
          if (tr.id === askUserCall.id) continue;
          conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
        }
        conversation.push({
          role: 'tool',
          tool_call_id: askUserCall.id,
          content: JSON.stringify(answerPayload),
        });
        if (jobContext) {
          try { await jobContext.persistCheckpoint(loopCount, conversation); } catch {}
        }
        continue; // relance la boucle LLM avec la réponse
      }

      // ── AGENT PRINCIPAL : flow classique, pause et yield la question à l'user ───
      await toolSet.cleanup();
      if (askResult?.result) {
        const qEvent = { type: 'question', ...askResult.result };
        if (askResult.result.questions) qEvent.questions = askResult.result.questions;
        yield qEvent;
      }
      yield { type: 'done', usage: totalUsage };
      return;
    }

    // Add assistant message + tool results to conversation
    conversation.push({
      role: 'assistant',
      content: assistantText || null,
      tool_calls: pendingToolCalls.map(tc => ({ id: tc.id, name: tc.name, input: tc.input })),
    });
    for (const tr of toolResults) {
      // Si le tool a retourné des _contentBlocks (image/document/audio), les propager au LLM
      // pour qu'il lise nativement via sa vision/audio (pattern Claude Code / Codex).
      // Chaque provider LLM (anthropic/openai/openai-responses) convertit les blocks
      // vers son format natif (image, document PDF, input_file, input_audio).
      const resultObj = tr.result;
      const blocks = Array.isArray(resultObj?._contentBlocks) ? resultObj._contentBlocks : null;
      const MULTIMODAL_TYPES = new Set(['image', 'document', 'audio', 'input_audio']);
      if (blocks && blocks.length) {
        const contentParts = [{ type: 'text', text: tr.content }];
        for (const b of blocks) {
          if (MULTIMODAL_TYPES.has(b.type)) contentParts.push(b);
        }
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: contentParts });
      } else {
        conversation.push({ role: 'tool', tool_call_id: tr.id, content: tr.content });
      }
    }

    // ── Détecteur de boucle infinie : si les 3 derniers tours ont appelé
    // EXACTEMENT le même tool avec les mêmes args et tous ont échoué, on
    // force l'arrêt. Pattern observé : LLM qui appelle execute_tool({key:"noop"})
    // en boucle pour "ne rien faire", ou qui retry un tool inexistant.
    if (jobContext && toolResults.length) {
      const signature = toolResults
        .map(r => `${r.name}:${r.status}:${(r.content || '').slice(0, 100)}`)
        .join('|');
      jobContext._recentToolSigs = (jobContext._recentToolSigs || []).concat(signature).slice(-3);
      const sigs = jobContext._recentToolSigs;
      const allSame = sigs.length === 3 && sigs.every(s => s === sigs[0]);
      const allFailed = sigs.length === 3 && toolResults.every(r => r.status === 'error');
      if (allSame && allFailed) {
        console.warn(`[harness] BOUCLE INFINIE DÉTECTÉE : même tool+erreur 3x consécutifs (${toolResults[0]?.name}). Force stop.`);
        // Inject un message user pour que le LLM comprenne au prochain restart,
        // PUIS on yield done pour sortir de la boucle courante.
        conversation.push({
          role: 'user',
          content: `[SYSTÈME] Tu as appelé le même tool "${toolResults[0]?.name}" 3 fois de suite avec le même résultat d'erreur. C'est une boucle. STOP. Si tu n'as plus rien à faire, réponds juste par du texte (1-2 phrases) pour clore la tâche. Ne rappelle PAS ce tool.`,
        });
        if (jobContext) {
          try { await jobContext.persistCheckpoint(loopCount, conversation); } catch {}
        }
        await toolSet.cleanup();
        yield { type: 'done', usage: totalUsage };
        return;
      }
    }

    // Injection du nudge todo_write si détecté (après exécution des tools)
    if (shouldNudgeTodo) {
      conversation.push({
        role: 'user',
        content: `[SYSTÈME — IMPORTANT] Tu viens d'exécuter ${heavyCount} tools lourds sans avoir créé de checklist via todo_write. C'est une VIOLATION du protocole. Au prochain tour LLM, ta TOUTE PREMIÈRE action DOIT être \`todo_write\` avec 3-6 items couvrant la tâche en cours et à venir, pour que l'utilisateur voie la progression. Les items déjà faits = status "completed", l'étape en cours = "in_progress", les prochaines = "pending". Ensuite continue ton travail normalement.`,
      });
    }

    // Checkpoint + heartbeat (no-op without jobContext)
    if (jobContext) {
      try { await jobContext.persistCheckpoint(loopCount, conversation); } catch { /* non-fatal */ }
      try { await jobContext.heartbeat(); } catch { /* non-fatal */ }
    }
    console.log(`[harness] end of loop ${loopCount}/${maxLoops} — will ${loopCount < maxLoops ? 'continue' : 'STOP (maxLoops reached)'}`);
  }

  // Max loops reached
  console.log(`[harness] maxLoops=${maxLoops} reached → cleanup + done`);
  await toolSet.cleanup();
  yield { type: 'message', text: '\n\n*Limite de boucles atteinte. Reformule ta demande si nécessaire.*' };
  yield { type: 'done', usage: totalUsage };
}

module.exports = { runHarness };
