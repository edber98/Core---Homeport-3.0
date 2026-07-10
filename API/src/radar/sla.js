// Radar — SLA / ÉCHÉANCES (R4). Détecte les MANQUEMENTS (breach) et les RISQUES
// (à risque) de SLA sur trois fronts, en DÉRIVANT les seuils des données plutôt
// qu'en les codant en dur :
//
//   1) FACTURES impayées : échéance = date_lim_reglement si présente, sinon
//      date d'émission + termes par défaut (30 j). Dépassée → 'breach' (sévérité
//      selon les jours de dépassement) ; à < 7 j de l'échéance → 'à risque'.
//   2) TICKETS ouverts (status hors fermé/résolu) anciens depuis > N jours, où N
//      est APPRIS = p75 des durées de résolution observées sur les tickets déjà
//      fermés (firstSeen→lastSeen), avec repli à 14 j si l'historique est trop
//      maigre ou sous-journalier → 'breach' support.
//   3) TÂCHES bloquées (label ⚠️ BLOQUÉ, ou progression basse sur un projet en
//      retard) → risque livraison.
//
// Déterministe, lecture seule, zéro infra. Chaque source est isolée — l'absence
// de l'une (p. ex. aucun ticket) n'empêche pas les autres.

const DAY = 86400000;
const DEFAULT_TERMS_DAYS = 30;     // termes de règlement par défaut (échéance absente)
const DEFAULT_TICKET_SLA_DAYS = 14; // repli si pas d'historique de résolution exploitable

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
// dates : unix secondes (Dolibarr) → ms ; ISO/Date tolérés ; déjà-ms inchangé
function toMs(v) {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) { const n = Number(s); return n < 1e12 ? n * 1000 : n; }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}
const amountOf = (e) => num(e.attributes?.amount_total) || num(e.attributes?.total_ttc) || num(e.attributes?.amount);

const isUnpaid = (e) => e.attributes?.payment_state === 'impayée'
  && e.attributes?.state !== 'brouillon'
  && !(e.attributes?.payment_state === 'payée' || e.attributes?.state === 'payée');

// statut terminal d'un ticket (résolu/fermé) — sortie du SLA support
const CLOSED_TICKET = /^(ferm|résol|resolu|closed|clos|done|terminé)/i;
const isTicketOpen = (t) => !CLOSED_TICKET.test(String(t.attributes?.status || t.attributes?.state || ''));

// échéance d'une facture : date_lim_reglement si présente, sinon émission + termes
function invoiceDueMs(inv, termsDays) {
  const lim = toMs(inv.attributes?.date_lim_reglement);
  if (lim) return lim;
  const d = toMs(inv.attributes?.date);
  return d ? d + termsDays * DAY : 0;
}

// quantile linéaire-interpolé d'un tableau trié croissant
function quantile(sorted, q) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

/**
 * Apprend le seuil SLA support (jours) = p75 des durées de résolution observées
 * sur les tickets déjà fermés. La durée est approximée par lastSeenAt−firstSeenAt
 * (le ticket a été vu ouvert puis fermé). On n'accepte ce seuil appris que s'il
 * repose sur ≥ 3 tickets fermés ET donne une valeur ≥ 1 j (sinon les durées sont
 * sous-journalières / non significatives → repli sur DEFAULT_TICKET_SLA_DAYS).
 * @returns {{ ticketDays:number, learned:boolean, sample:number }}
 */
function learnTicketSla(tickets) {
  const durations = [];
  for (const t of tickets) {
    if (isTicketOpen(t)) continue;               // on n'apprend que sur les RÉSOLUS
    const first = toMs(t.firstSeenAt), last = toMs(t.lastSeenAt);
    if (!first || !last || last < first) continue;
    durations.push((last - first) / DAY);
  }
  durations.sort((a, b) => a - b);
  const p75 = quantile(durations, 0.75);
  if (durations.length >= 3 && p75 != null && p75 >= 1) {
    return { ticketDays: Math.round(p75 * 10) / 10, learned: true, sample: durations.length };
  }
  return { ticketDays: DEFAULT_TICKET_SLA_DAYS, learned: false, sample: durations.length };
}

const SEV_RANK = { haute: 1, normale: 0 };

/**
 * Analyse les manquements et risques de SLA d'un workspace.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts]
 * @param {number} [opts.termsDays=30] termes de règlement par défaut (échéance absente)
 * @param {number} [opts.now=Date.now()] horloge injectable (tests)
 * @returns {Promise<{ breaches:Array, atRisk:Array, counts:{breaches,atRisk}, slaThresholds:{ticketDays:number} }>}
 *   breach/atRisk item : { type, severity:'haute'|'normale', label, target, daysOver, detail }
 *   (daysOver négatif sur un item à risque = jours RESTANTS avant l'échéance)
 */
async function analyzeSLA(workspaceId, { termsDays = DEFAULT_TERMS_DAYS, now = Date.now() } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');

  const breaches = [];
  const atRisk = [];

  // ── 1) FACTURES impayées : échéance dépassée → breach ; < 7 j → à risque ──────
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey label attributes').lean();
  for (const inv of invoices) {
    if (!isUnpaid(inv)) continue;
    const due = invoiceDueMs(inv, termsDays);
    if (!due) continue;                                   // sans date, pas de SLA mesurable
    const daysOver = Math.round((now - due) / DAY);       // > 0 = dépassé, < 0 = jours restants
    const amount = Math.round(amountOf(inv));
    const target = inv.canonicalKey;
    const label = inv.label || inv.attributes?.number || inv.canonicalKey;
    const dueStr = new Date(due).toISOString().slice(0, 10);
    if (daysOver > 0) {
      // sévérité = ampleur du dépassement : > 30 j ou gros montant ⇒ haute
      const severity = (daysOver > 30 || amount >= 5000) ? 'haute' : 'normale';
      breaches.push({
        type: 'facture_impayee', severity, label, target, daysOver,
        detail: `Facture « ${label} » (${amount}€) en retard de ${daysOver} j — échéance dépassée le ${dueStr}.`,
      });
    } else if (daysOver >= -7) {
      atRisk.push({
        type: 'facture_impayee', severity: 'normale', label, target, daysOver,
        detail: `Facture « ${label} » (${amount}€) arrive à échéance dans ${-daysOver} j (le ${dueStr}).`,
      });
    }
  }

  // ── 2) TICKETS support : seuil N appris (p75 résolutions), repli 14 j ─────────
  const tickets = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: 'ticket' })
    .select('canonicalKey label attributes firstSeenAt lastSeenAt').lean();
  const sla = learnTicketSla(tickets);
  for (const t of tickets) {
    if (!isTicketOpen(t)) continue;
    const opened = toMs(t.firstSeenAt);
    if (!opened) continue;
    const ageDays = Math.round((now - opened) / DAY);
    const daysOver = Math.round(ageDays - sla.ticketDays);   // dépassement du seuil SLA
    const label = t.label || t.attributes?.title || t.canonicalKey;
    const target = t.canonicalKey;
    const priority = String(t.attributes?.priority || '').toUpperCase();
    if (daysOver > 0) {
      // sévérité : gros dépassement (> seuil ×2) ou ticket prioritaire ⇒ haute
      const severity = (daysOver > sla.ticketDays || priority === 'HIGH' || priority === 'CRITICAL') ? 'haute' : 'normale';
      breaches.push({
        type: 'ticket_support', severity, label, target, daysOver,
        detail: `Ticket « ${label} » ouvert depuis ${ageDays} j — dépasse de ${daysOver} j le SLA support de ${sla.ticketDays} j${priority ? ` (priorité ${priority})` : ''}.`,
      });
    } else if (daysOver >= -2) {
      // proche du seuil SLA (≤ 2 j restants) → à risque
      atRisk.push({
        type: 'ticket_support', severity: 'normale', label, target, daysOver,
        detail: `Ticket « ${label} » ouvert depuis ${ageDays} j — atteint le SLA support (${sla.ticketDays} j) dans ${-daysOver} j.`,
      });
    }
  }

  // ── 3) TÂCHES bloquées → risque livraison ───────────────────────────────────
  // Signal direct : label ⚠️ BLOQUÉ. Signal dérivé : progression basse + non close.
  const tasks = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: 'task' })
    .select('canonicalKey label attributes firstSeenAt').lean();
  const TASK_DONE = /^(terminé|done|fermé|closed|annulé|cancelled)$/i;
  for (const t of tasks) {
    const label = t.label || t.attributes?.title || t.canonicalKey;
    const target = t.canonicalKey;
    const status = String(t.attributes?.status || '').trim();
    const blockedLabel = /BLOQU/i.test(label) || /⚠/.test(label);
    const progress = num(t.attributes?.progress);          // 0..100
    const opened = toMs(t.firstSeenAt);
    const ageDays = opened ? Math.round((now - opened) / DAY) : 0;
    if (blockedLabel) {
      breaches.push({
        type: 'tache_bloquee', severity: 'haute', label, target, daysOver: ageDays,
        detail: `Tâche bloquée « ${label} » — risque de retard de livraison${status ? ` (statut « ${status} »)` : ''}.`,
      });
    } else if (!TASK_DONE.test(status) && progress > 0 && progress < 40) {
      // progression basse sur une tâche non terminée → livraison à surveiller
      atRisk.push({
        type: 'tache_bloquee', severity: 'normale', label, target, daysOver: ageDays,
        detail: `Tâche « ${label} » à ${progress}% d'avancement${status ? ` (statut « ${status} »)` : ''} — livraison à surveiller.`,
      });
    }
  }

  // ── TRI : sévérité (haute d'abord) puis daysOver décroissant ─────────────────
  const cmp = (a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (b.daysOver - a.daysOver);
  breaches.sort(cmp);
  atRisk.sort(cmp);

  return {
    breaches,
    atRisk,
    counts: { breaches: breaches.length, atRisk: atRisk.length },
    slaThresholds: { ticketDays: sla.ticketDays, ticketSlaLearned: sla.learned, ticketSample: sla.sample, termsDays },
  };
}

module.exports = { analyzeSLA, learnTicketSla };
