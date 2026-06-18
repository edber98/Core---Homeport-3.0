// Radar — échéances & SLA (R4.3). Repère les dates d'échéance (tâches en retard,
// délai de paiement de facture, fin de contrat, date limite d'un événement) et alerte
// AVANT qu'il soit trop tard. Déterministe. Les échéances fiscales spécifiques (TVA,
// IS…) viendront via le contexte entreprise + le registre d'ontologie (seuils métier).

const DAY = 86400000;
const DUE_FIELDS = ['dueDate', 'date_lim_reglement', 'echeance', 'due', 'end', 'dueAt', 'date_fin', 'deadline', 'date_end'];

/** Parse une date (timestamp unix s/ms, ISO, Date). Pure. @returns ms | null */
function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;       // unix secondes → ms
  const n = Number(v);
  if (Number.isFinite(n) && /^\d+$/.test(String(v).trim())) return n < 1e12 ? n * 1000 : n;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

const TERMINAL_STATES = new Set(['payée', 'paid', 'terminé', 'done', 'livrée', 'annulée', 'cancelled', 'closed', 'fermé']);

/** Échéances à venir / dépassées, dans l'horizon. @returns liste triée par urgence. */
async function findDeadlines(workspaceId, { horizonDays = 30 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const ents = await RadarEntity.find({ workspaceId, coreType: { $in: ['WorkItem', 'Transaction', 'Document', 'Event', 'Project'] } })
    .select('label coreType subtype attributes sources').lean();
  const now = Date.now();
  const out = [];
  for (const e of ents) {
    const state = (e.attributes && (e.attributes.state || e.attributes.status)) || '';
    if (TERMINAL_STATES.has(String(state).toLowerCase())) continue;   // déjà réglé → pas d'échéance
    let due = null;
    for (const f of DUE_FIELDS) { const d = parseDate(e.attributes && e.attributes[f]); if (d) { due = d; break; } }
    if (due == null) continue;
    const days = Math.round((due - now) / DAY);
    if (days > horizonDays) continue;
    const system = (e.sources && e.sources[0] && e.sources[0].providerKey) || String(e.canonicalKey || '').split(':')[0];
    out.push({
      label: e.label, type: e.subtype || e.coreType, system,
      dueInDays: days, overdue: days < 0,
      score: days < 0 ? 100 : Math.max(0, 100 - days * 2),
      message: days < 0 ? `« ${e.label} » est en RETARD de ${-days} j` : `« ${e.label} » arrive à échéance dans ${days} j`,
    });
  }
  return out.sort((a, b) => a.dueInDays - b.dueInDays).slice(0, 25);
}

module.exports = { findDeadlines, parseDate };
