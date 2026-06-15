// Radar — réconciliations nocturnes.
//
// Analyses déterministes (zéro LLM) croisant les snapshots pour produire des
// signaux de haut niveau : devis sans réponse, contrats à échéance, achats
// anormaux, dérive de CA client, position de trésorerie. Reproductible et
// gratuit : le superviseur interprète ensuite librement ces signaux.
//
// Anti re-émission : chaque finding porte un dedupeKey ; un signal identique
// déjà émis dans la fenêtre de silence (défaut 7 j) n'est pas recréé.
//
// Specs temporelles déclarées dans le bloc radar du manifest (sur une entrée
// watch) :
//   "temporal": [
//     { "kind": "stale",    "afterDays": 14, "whenField": "state", "whenIn": ["sent"],
//       "category": "quote_overdue", "label": "Devis sans réponse" },
//     { "kind": "expiring", "dateField": "date_end", "inDays": 45,
//       "category": "contract_expiring", "label": "Contrat arrivant à échéance" }
//   ]

const DAY_MS = 24 * 3600_000;
const DEDUPE_WINDOW_DAYS = 7;

function _num(v) { const n = Number(v); return Number.isNaN(n) ? null : n; }
function _amount(d) { return _num(d?.amount_total) ?? _num(d?.amount) ?? _num(d?.total) ?? null; }
function _partner(d) { return d?.partner_name || d?.partner || (d?.partner_id != null ? `partner_${d.partner_id}` : null); }
function _date(snap) {
  const d = snap.data?.date || snap.data?.invoice_date || snap.data?.create_date;
  const t = d ? Date.parse(d) : NaN;
  return Number.isNaN(t) ? new Date(snap.firstSeenAt).getTime() : t;
}
function _monthKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

/** Specs temporelles : entités restées dans un état trop longtemps / dates qui approchent. Pure. */
function evaluateTemporal(snapshots, temporalSpecs, now = new Date()) {
  const findings = [];
  for (const spec of temporalSpecs || []) {
    for (const s of snapshots) {
      if (s.deletedAt) continue;
      const d = s.data || {};
      if (spec.kind === 'stale') {
        if (spec.whenField && Array.isArray(spec.whenIn) && !spec.whenIn.includes(d[spec.whenField])) continue;
        const since = new Date(s.lastChangedAt || s.firstSeenAt).getTime();
        const days = Math.floor((now.getTime() - since) / DAY_MS);
        if (days >= (spec.afterDays || 14)) {
          findings.push({
            category: spec.category || 'stale_entity', urgency: 'normal',
            dedupeKey: `${spec.category}:${s.entityType}:${s.entityKey}`,
            summary: `${spec.label || 'Entité sans évolution'} : ${s.entityType} ${s.entityKey}${_partner(d) ? ` (${_partner(d)})` : ''}${_amount(d) != null ? ` — ${_amount(d)} €` : ''} — sans évolution depuis ${days} jours`,
            deltaData: { entityType: s.entityType, entityKey: s.entityKey, days, data: d },
          });
        }
      } else if (spec.kind === 'expiring') {
        const raw = d[spec.dateField];
        const t = raw ? Date.parse(raw) : NaN;
        if (Number.isNaN(t)) continue;
        const inDays = Math.ceil((t - now.getTime()) / DAY_MS);
        if (inDays >= 0 && inDays <= (spec.inDays || 45)) {
          findings.push({
            category: spec.category || 'expiring_entity', urgency: inDays <= 7 ? 'high' : 'normal',
            dedupeKey: `${spec.category}:${s.entityType}:${s.entityKey}`,
            summary: `${spec.label || 'Échéance proche'} : ${s.entityType} ${s.entityKey}${_partner(d) ? ` (${_partner(d)})` : ''} — échéance dans ${inDays} jour(s) (${raw})`,
            deltaData: { entityType: s.entityType, entityKey: s.entityKey, inDays, data: d },
          });
        }
      }
    }
  }
  return findings;
}

/** Achats anormaux : total du mois courant vs historique (z-score simple). Pure. */
function evaluateUnusualSpend(supplierSnapshots, now = new Date(), { minMonths = 3, zThreshold = 2 } = {}) {
  const byMonth = new Map();
  for (const s of supplierSnapshots) {
    const amt = _amount(s.data);
    if (amt == null) continue;
    const k = _monthKey(_date(s));
    byMonth.set(k, (byMonth.get(k) || 0) + amt);
  }
  const currentKey = _monthKey(now.getTime());
  const history = [...byMonth.entries()].filter(([k]) => k !== currentKey).map(([, v]) => v);
  const current = byMonth.get(currentKey) || 0;
  if (history.length < minMonths || current <= 0) return [];
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const std = Math.sqrt(history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length) || 1;
  const z = (current - mean) / std;
  if (z < zThreshold || current < mean * 1.5) return [];
  return [{
    category: 'unusual_spend', urgency: 'normal',
    dedupeKey: `unusual_spend:${currentKey}`,
    summary: `Achats inhabituels ce mois-ci : ${Math.round(current)} € de factures fournisseurs contre ${Math.round(mean)} €/mois en moyenne (écart ×${(current / mean).toFixed(1)})`,
    deltaData: { current, mean: Math.round(mean), z: Number(z.toFixed(2)), month: currentKey },
  }];
}

/** Dérive de CA par client : 3 derniers mois vs 3 précédents. Pure. */
function evaluateRevenueDrop(customerSnapshots, now = new Date(), { dropRatio = 0.3, minPrevious = 1000 } = {}) {
  const nowT = now.getTime();
  const recent = new Map(); const previous = new Map();
  for (const s of customerSnapshots) {
    const amt = _amount(s.data); const p = _partner(s.data);
    if (amt == null || !p) continue;
    const age = nowT - _date(s);
    if (age < 0) continue;
    if (age <= 90 * DAY_MS) recent.set(p, (recent.get(p) || 0) + amt);
    else if (age <= 180 * DAY_MS) previous.set(p, (previous.get(p) || 0) + amt);
  }
  const findings = [];
  for (const [partner, prev] of previous) {
    if (prev < minPrevious) continue;
    const cur = recent.get(partner) || 0;
    const drop = (prev - cur) / prev;
    if (drop >= dropRatio) {
      findings.push({
        category: 'revenue_drop_client', urgency: drop >= 0.6 ? 'high' : 'normal',
        dedupeKey: `revenue_drop:${partner}:${_monthKey(nowT)}`,
        summary: `Baisse de CA client « ${partner} » : ${Math.round(cur)} € sur 3 mois contre ${Math.round(prev)} € sur les 3 mois précédents (−${Math.round(drop * 100)} %)`,
        deltaData: { partner, recent: Math.round(cur), previous: Math.round(prev), dropPct: Math.round(drop * 100) },
      });
    }
  }
  return findings;
}

/** Position de trésorerie simple : à encaisser (clients impayés) vs à payer (fournisseurs impayés). Pure. */
function evaluateCashPosition(customerSnapshots, supplierSnapshots, { alertBelow = 0 } = {}) {
  const unpaid = (snaps) => snaps.reduce((sum, s) => {
    const d = s.data || {};
    const paid = d.payment_state === 'paid' || d.state === 'paid' || d.paid === true;
    const cancelled = d.state === 'cancel' || d.state === 'cancelled';
    const amt = _amount(d);
    return (!paid && !cancelled && amt != null) ? sum + amt : sum;
  }, 0);
  const toCollect = unpaid(customerSnapshots);
  const toPay = unpaid(supplierSnapshots);
  const net = toCollect - toPay;
  if (net >= alertBelow) return [];
  return [{
    category: 'cash_forecast_alert', urgency: 'high',
    dedupeKey: `cash_forecast:${_monthKey(Date.now())}`,
    summary: `Tension de trésorerie prévisible : ${Math.round(toCollect)} € à encaisser pour ${Math.round(toPay)} € à payer (solde ${Math.round(net)} €)`,
    deltaData: { toCollect: Math.round(toCollect), toPay: Math.round(toPay), net: Math.round(net) },
  }];
}

/**
 * Passe de réconciliation pour un workspace : évalue tout, crée les RadarSignal
 * dédupliqués (fenêtre 7 j). Appelée pendant la fenêtre nocturne ou à la demande.
 */
async function runReconciliationsForWorkspace(workspaceId, { now = new Date(), log = () => {} } = {}) {
  const RadarConnector = require('../db/models/radar-connector.model');
  const RadarSnapshot = require('../db/models/radar-snapshot.model');
  const Provider = require('../db/models/provider.model');
  const { listWatchSpecs } = require('./capability-registry');

  const connectors = await RadarConnector.find({ workspaceId, status: { $in: ['active', 'error'] } }).lean();
  const findings = [];

  // Specs temporelles par connecteur (déclarées dans le manifest)
  for (const c of connectors) {
    const provider = await Provider.findOne({ key: c.providerKey }).select('radar').lean();
    if (!provider) continue;
    for (const watch of listWatchSpecs({ providerRadar: provider.radar, family: c.family })) {
      if (!Array.isArray(watch.temporal) || !watch.temporal.length) continue;
      const snaps = await RadarSnapshot.find({ connectorId: c._id, entityType: watch.entity, deletedAt: null }).lean();
      findings.push(...evaluateTemporal(snaps, watch.temporal, now).map(f => ({ ...f, connectorId: c._id, family: c.family })));
    }
  }

  // Analyses comptables (snapshots accounting du workspace, toutes sources confondues)
  const acctConnectorIds = connectors.filter(c => c.family === 'accounting').map(c => c._id);
  if (acctConnectorIds.length) {
    const [suppliers, customers] = await Promise.all([
      RadarSnapshot.find({ connectorId: { $in: acctConnectorIds }, entityType: 'supplier_invoice', deletedAt: null }).lean(),
      RadarSnapshot.find({ connectorId: { $in: acctConnectorIds }, entityType: 'customer_invoice', deletedAt: null }).lean(),
    ]);
    const tag = (arr) => arr.map(f => ({ ...f, connectorId: acctConnectorIds[0], family: 'accounting' }));
    findings.push(...tag(evaluateUnusualSpend(suppliers, now)));
    findings.push(...tag(evaluateRevenueDrop(customers, now)));
    findings.push(...tag(evaluateCashPosition(customers, suppliers)));
  }

  // Création des signaux dédupliqués
  const RadarSignal = require('../db/models/radar-signal.model');
  const since = new Date(now.getTime() - DEDUPE_WINDOW_DAYS * DAY_MS);
  let created = 0;
  for (const f of findings) {
    const dup = await RadarSignal.findOne({ workspaceId, dedupeKey: f.dedupeKey, createdAt: { $gte: since } }).select('_id').lean();
    if (dup) continue;
    const sigDoc = await RadarSignal.create({
      workspaceId, connectorId: f.connectorId, family: f.family,
      category: f.category, urgency: f.urgency, source: 'reconciliation',
      summary: f.summary, dedupeKey: f.dedupeKey, deltaIds: [],
    });
    require('./events').emitRadarEvent(workspaceId, 'signal.created', { signalId: sigDoc.id, category: f.category, urgency: f.urgency, summary: f.summary });
    created++;
  }
  if (findings.length) log(`[radar-reconciliation] ws=${workspaceId} findings=${findings.length} nouveaux signaux=${created}`);
  return { findings: findings.length, created };
}

module.exports = {
  runReconciliationsForWorkspace,
  evaluateTemporal,
  evaluateUnusualSpend,
  evaluateRevenueDrop,
  evaluateCashPosition,
};
