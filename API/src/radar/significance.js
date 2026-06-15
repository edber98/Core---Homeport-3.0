// Radar — filtre de signifiance à 2 étages.
//
// Étage 1 (règles, gratuit, synchrone) : décide pour chaque RadarDelta :
//   - 'ignore'    → bruit certain (newsletters, no-reply, …) ;
//   - 'signal'    → signifiant par nature (changement métier compta/crm/…) ;
//   - 'ambiguous' → impossible à trancher sans lecture (emails, messages).
// Étage 2 (LLM léger, batché) : classe les ambigus en { significant, category,
// urgency, summary }. Injectable pour les tests ; sans LLM configuré, repli
// prudent : signal low générique (rien n'est perdu, rien ne coûte).
//
// Les deltas passent à 'consumed' (TTL 30 j) ou 'ignored' ; les signifiants
// sont regroupés par (workspace, category, urgency) en RadarSignal.

const { llmCompleteJSON } = require('./llm');
const { checksumJSON } = require('../utils/checksum');

const DISMISSED_MUTE_MS = 24 * 3600_000; // un signal identique écarté < 24 h ne re-réveille pas le superviseur

const NOISE_SENDER_RE = /no-?reply|notification|newsletter|mailer-daemon|donotreply|automated/i;
const NOISE_SUBJECT_RE = /newsletter|d[ée]sabonn|unsubscribe|promo(tion)?|publicit[ée]|sold[ée]s/i;
const AMBIGUOUS_ENTITIES = new Set(['email_message', 'talk_room', 'chat_message']);
const HIGH_AMOUNT_DEFAULT = 10_000;

const FAMILY_CATEGORY = {
  accounting: 'accounting_change',
  crm: 'crm_change',
  storage: 'storage_change',
  productivity: 'task_change',
  calendar: 'calendar_change',
  hr: 'hr_change',
  monitoring: 'monitoring_alert',
  email: 'email_message',
  communication: 'communication_message',
};

function _field(delta, name) {
  return (delta.after && delta.after[name]) ?? (delta.before && delta.before[name]);
}

/**
 * Étage 1 — classement par règles. Pure.
 * @returns {{ decision: 'ignore'|'signal'|'ambiguous', category?: string, urgency?: string, reason?: string }}
 */
function classifyDeltaRules(delta, policy = {}) {
  const entityType = delta.entityType || '';

  // Emails / messages : bruit évident filtré, le reste est ambigu (lecture nécessaire)
  if (AMBIGUOUS_ENTITIES.has(entityType) || delta.family === 'email' || delta.family === 'communication') {
    if (delta.type === 'deleted') return { decision: 'ignore', reason: 'message_deleted' };
    const sender = String(_field(delta, 'from') || _field(delta, 'sender') || _field(delta, 'actor') || '');
    const subject = String(_field(delta, 'subject') || _field(delta, 'title') || '');
    if (NOISE_SENDER_RE.test(sender)) return { decision: 'ignore', reason: 'noise_sender' };
    if (NOISE_SUBJECT_RE.test(subject)) return { decision: 'ignore', reason: 'noise_subject' };
    return { decision: 'ambiguous' };
  }

  // Changements métier : signifiants par nature
  const category = FAMILY_CATEGORY[delta.family] || `${delta.family || 'unknown'}_change`;
  const amount = Number(_field(delta, 'amount_total') ?? _field(delta, 'amount') ?? NaN);
  const high = !Number.isNaN(amount) && Math.abs(amount) >= (Number(policy.highAmountThreshold) || HIGH_AMOUNT_DEFAULT);
  return { decision: 'signal', category, urgency: high ? 'high' : 'normal' };
}

/** Résumé déterministe d'un groupe de deltas (signaux issus des règles). Pure. */
function summarizeDeltas(deltas) {
  const byType = { created: 0, updated: 0, deleted: 0 };
  for (const d of deltas) byType[d.type] = (byType[d.type] || 0) + 1;
  const entity = deltas[0].entityType;
  const parts = [];
  if (byType.created) parts.push(`${byType.created} créé(s)`);
  if (byType.updated) parts.push(`${byType.updated} modifié(s)`);
  if (byType.deleted) parts.push(`${byType.deleted} supprimé(s)`);
  const keys = deltas.slice(0, 5).map(d => d.entityKey).join(', ');
  return `${entity}: ${parts.join(', ')} (${keys}${deltas.length > 5 ? ', …' : ''})`;
}

/** Compacte un delta pour le prompt de l'étage 2. Pure. */
function compactDeltaForLlm(delta) {
  const LONG_FIELDS = new Set(['body', 'text', 'message', 'snippet', 'preview']); // contenu → plus de contexte
  // Extrait transmis au TRI uniquement (le delta/snapshot garde le contenu
  // complet pour le superviseur et les missions). Réglable :
  // RADAR_FILTER_TEXT_LIMIT=5000 pour trier sur la totalité stockée.
  const longLimit = Number(process.env.RADAR_FILTER_TEXT_LIMIT) || 1500;
  const pick = (obj) => {
    if (!obj || typeof obj !== 'object') return undefined;
    const out = {};
    for (const k of ['from', 'sender', 'to', 'subject', 'title', 'snippet', 'preview', 'body', 'text', 'message', 'name', 'state', 'amount_total']) {
      if (obj[k] !== undefined) out[k] = typeof obj[k] === 'string' ? String(obj[k]).slice(0, LONG_FIELDS.has(k) ? longLimit : 400) : obj[k];
    }
    return Object.keys(out).length ? out : undefined;
  };
  return { id: delta.id, family: delta.family, entityType: delta.entityType, type: delta.type, after: pick(delta.after), before: pick(delta.before), changedFields: delta.changedFields };
}

/**
 * Étage 2 par défaut — classification LLM batchée (un batch = un workspace,
 * pour que le débit crédits parte sur le bon solde).
 * @param {Array} deltas - deltas compactés (compactDeltaForLlm)
 * @param {object} [opts] - { billing } cf. radar/billing.js
 * @returns {Promise<Array<{ id, significant, category, urgency, summary, entities }>|null>} null si pas de LLM
 */
async function defaultLlmClassify(deltas, { billing } = {}) {
  const out = await llmCompleteJSON(`Tu es le filtre de signifiance d'un agent superviseur d'entreprise (PME française).
Pour chaque événement ci-dessous (mail reçu, message…), décide s'il mérite l'attention du superviseur.

SIGNIFIANT : toute DEMANDE adressée à l'entreprise (quelle qu'elle soit : information, document, action, rendez-vous), facture ou document à traiter, plainte ou mécontentement, urgence, opportunité commerciale, question nécessitant une réponse.
NON SIGNIFIANT : newsletters, notifications automatiques de machines (CI, monitoring, "vérifiez votre email"), publicité, conversations purement sociales.

RÈGLE EN CAS DE DOUTE : si le message vient d'un humain et contient une demande ou une question, il est SIGNIFIANT. Mieux vaut un faux positif qu'une demande client manquée.

Catégories possibles : accounting_request, client_complaint, client_request, supplier_message, opportunity, urgent_question, document_received, info_only.
Urgences : low | normal | high.

Événements :
${JSON.stringify(deltas, null, 2)}

Réponds UNIQUEMENT en JSON, avec un "summary" pour CHAQUE événement (y compris non signifiants : explique en une phrase pourquoi tu l'écartes) :
{"results":[{"id":"<id du delta>","significant":true/false,"category":"...","urgency":"...","summary":"<une phrase en français>","entities":["..."]}]}`,
  { maxTokens: 2500, billing });
  return out ? out.results : null;
}

/**
 * Passe de signifiance : consomme les RadarDelta pending → RadarSignal.
 * @param {object} [opts]
 * @param {function} [opts.classify] - étage 2 injectable (tests) ; défaut LLM
 * @param {number} [opts.limit] - deltas max par passe
 * @returns {Promise<{ examined: number, ignored: number, signals: number, ambiguous: number }>}
 */
async function runSignificancePass({ classify = defaultLlmClassify, limit = 200, now = new Date(), log = () => {} } = {}) {
  const RadarDelta = require('../db/models/radar-delta.model');
  const RadarSignal = require('../db/models/radar-signal.model');
  const stats = { examined: 0, ignored: 0, signals: 0, ambiguous: 0 };

  const deltas = await RadarDelta.find({ status: 'pending' }).sort({ occurredAt: 1 }).limit(limit).lean();
  if (!deltas.length) return stats;
  stats.examined = deltas.length;

  const toIgnore = [];
  const ruleSignals = new Map(); // ws|category|urgency|entityType → deltas[]
  const ambiguous = [];

  for (const d of deltas) {
    const r = classifyDeltaRules(d);
    if (r.decision === 'ignore') { toIgnore.push(d.id); continue; }
    if (r.decision === 'ambiguous') { ambiguous.push(d); continue; }
    const key = [d.workspaceId, r.category, r.urgency, d.entityType].join('|');
    if (!ruleSignals.has(key)) ruleSignals.set(key, { meta: r, deltas: [] });
    ruleSignals.get(key).deltas.push(d);
  }
  stats.ambiguous = ambiguous.length;

  // Signaux issus des règles (groupés) — avec sourdine : si un signal
  // strictement identique a été ÉCARTÉ par le superviseur il y a moins de
  // 24 h, on n'en recrée pas un (le bruit jugé bruit reste du bruit).
  for (const { meta, deltas: group } of ruleSignals.values()) {
    const dedupeKey = `rules:${meta.category}:${group[0].entityType}:${checksumJSON(group.map(d => d.entityKey).sort()).slice(0, 16)}`;
    const muted = await RadarSignal.findOne({
      workspaceId: group[0].workspaceId, dedupeKey, status: 'dismissed',
      createdAt: { $gte: new Date(now.getTime() - DISMISSED_MUTE_MS) },
    }).select('_id').lean();
    if (muted) { toIgnore.push(...group.map(d => d.id)); stats.muted = (stats.muted || 0) + 1; continue; }
    const sigDoc = await RadarSignal.create({
      workspaceId: group[0].workspaceId, connectorId: group[0].connectorId, family: group[0].family,
      category: meta.category, urgency: meta.urgency, source: 'rules',
      summary: summarizeDeltas(group),
      deltaIds: group.map(d => d.id),
      dedupeKey,
    });
    require('./events').emitRadarEvent(group[0].workspaceId, 'signal.created', { signalId: sigDoc.id, category: sigDoc.category, urgency: sigDoc.urgency, summary: sigDoc.summary });
    stats.signals++;
  }

  // Étage 2 — classification LLM des ambigus, batchée PAR WORKSPACE
  // (chaque batch est débité sur le solde crédits du workspace concerné)
  if (ambiguous.length) {
    const byWs = new Map();
    for (const d of ambiguous) {
      const k = String(d.workspaceId);
      if (!byWs.has(k)) byWs.set(k, []);
      byWs.get(k).push(d);
    }
    const byId = new Map();
    let llmOk = false;
    for (const [wsKey, group] of byWs) {
      try {
        const { resolveBillingFor } = require('./billing');
        const billing = await resolveBillingFor(wsKey, 'significance');
        const results = await classify(group.map(compactDeltaForLlm), { billing });
        if (results) { llmOk = true; for (const r of results) byId.set(r.id, r); }
      } catch (e) { log(`[radar-significance] étage 2 en erreur (ws ${wsKey}): ${e.message}`); }
    }
    const results = llmOk ? true : null;
    for (const d of ambiguous) {
      const r = byId.get(d.id);
      // Verdict tracé sur le delta — visible dans Activité > Ignoré par le filtre
      if (r) {
        await RadarDelta.updateOne({ id: d.id }, { $set: { classification: { significant: !!r.significant, category: r.category, urgency: r.urgency, summary: r.summary } } });
      }
      if (results && r && !r.significant) { toIgnore.push(d.id); continue; }
      // Sans LLM / sans verdict → repli prudent : signal low générique
      const sigDoc = await RadarSignal.create({
        workspaceId: d.workspaceId, connectorId: d.connectorId, family: d.family,
        category: (r && r.category) || FAMILY_CATEGORY[d.family] || 'unclassified',
        urgency: (r && r.urgency) || 'low',
        source: r ? 'llm' : 'rules',
        summary: (r && r.summary) || summarizeDeltas([d]),
        entities: (r && r.entities) || undefined,
        deltaIds: [d.id],
      });
      require('./events').emitRadarEvent(d.workspaceId, 'signal.created', { signalId: sigDoc.id, category: sigDoc.category, urgency: sigDoc.urgency, summary: sigDoc.summary });
      stats.signals++;
    }
  }

  if (toIgnore.length) {
    await RadarDelta.updateMany({ id: { $in: toIgnore } }, { $set: { status: 'ignored', consumedAt: now } });
    stats.ignored = toIgnore.length;
  }
  const consumed = deltas.map(d => d.id).filter(id => !toIgnore.includes(id));
  if (consumed.length) await RadarDelta.updateMany({ id: { $in: consumed } }, { $set: { status: 'consumed', consumedAt: now } });

  log(`[radar-significance] examined=${stats.examined} signals=${stats.signals} ignored=${stats.ignored}`);
  return stats;
}

module.exports = { classifyDeltaRules, summarizeDeltas, compactDeltaForLlm, defaultLlmClassify, runSignificancePass };
