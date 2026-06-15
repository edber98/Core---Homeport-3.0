// Radar — accès LLM léger (complétion unique, non-streamée côté appelant).
// Utilise la factory `ai/llm` (createLlmClient, adapter du nouveau harness) —
// jamais l'ancien agent-runner. Sert au filtre de signifiance (étage 2) et à
// l'agent critique des missions.

const env = require('../config/env');

/** Config LLM du radar depuis l'environnement (anthropic prioritaire). */
function resolveRadarLlmConfig() {
  if (process.env.AI_PROVIDER === 'openai' || (!env.ANTHROPIC_API_KEY && env.OPENAI_API_KEY)) {
    return { provider: 'openai', apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini' };
  }
  if (env.ANTHROPIC_API_KEY) {
    // Volontairement PAS env.ANTHROPIC_MODEL (modèle de l'assistant, souvent
    // opus) : le filtre/critique tourne sur un modèle léger sauf override.
    return { provider: 'anthropic', apiKey: env.ANTHROPIC_API_KEY, model: process.env.RADAR_LLM_MODEL || 'claude-haiku-4-5-20251001' };
  }
  return null;
}

/**
 * Complétion texte unique. Retourne null si aucun LLM configuré.
 * `billing` ({ userId, workspaceId, kind }, cf. radar/billing.js) : l'usage
 * réel est débité via panel-credits — même circuit que l'assistant.
 */
async function llmComplete(prompt, { maxTokens = 1500, config, billing } = {}) {
  const cfg = config || resolveRadarLlmConfig();
  if (!cfg) return null;
  const { createLlmClient } = require('../ai/llm');
  const llm = createLlmClient(cfg.provider, { ...cfg, maxTokens, temperature: 0 });
  let text = '';
  let usage = null;
  for await (const ev of llm.stream([{ role: 'user', content: prompt }], [])) {
    if (ev.type === 'text_delta') text += ev.text;
    if (ev.type === 'done' && ev.usage) usage = ev.usage;
  }
  if (billing && usage) {
    const { debitRadarUsage } = require('./billing');
    await debitRadarUsage({ billing, provider: cfg.provider, model: cfg.model, usage });
  }
  return text;
}

/**
 * Complétion JSON stricte : retire les fences markdown, extrait le premier
 * objet, et répare un JSON tronqué par maxTokens (fermetures manquantes).
 */
async function llmCompleteJSON(prompt, opts = {}) {
  const text = await llmComplete(prompt, opts);
  if (text == null) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error(`llm_no_json: ${text.slice(0, 200)}`);
  const candidate = cleaned.slice(start, cleaned.lastIndexOf('}') + 1 || undefined);
  try { return JSON.parse(candidate); } catch { /* tronqué → réparation */ }
  let repaired = cleaned.slice(start).trim();
  // ferme une éventuelle string ouverte puis équilibre les accolades/crochets
  const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 === 1) repaired += '"';
  repaired = repaired.replace(/,\s*$/, '');
  const opens = { '{': 0, '[': 0 };
  for (const ch of repaired.replace(/"(?:[^"\\]|\\.)*"/g, '')) {
    if (ch === '{') opens['{']++; else if (ch === '}') opens['{']--;
    else if (ch === '[') opens['[']++; else if (ch === ']') opens['[']--;
  }
  repaired += ']'.repeat(Math.max(0, opens['['])) + '}'.repeat(Math.max(0, opens['{']));
  try { return JSON.parse(repaired); } catch { throw new Error(`llm_no_json: ${text.slice(0, 200)}`); }
}

module.exports = { resolveRadarLlmConfig, llmComplete, llmCompleteJSON };
