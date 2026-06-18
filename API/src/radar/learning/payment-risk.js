// Radar — petit modèle « risque d'impayé » (Étage 3-4). Régression logistique
// entraînée sur les factures RÉSOLUES (payée = 0, annulée/impayée définitive = 1),
// features [montant, âge en jours]. Démarrage à froid géré : si pas assez de données,
// statut 'insufficient_data' → on retombe sur l'heuristique (pas de régression).

const { fit, predict, accuracy } = require('./logreg');
const DAY = 86400000;
const MIN_EXAMPLES = 8, MIN_PER_CLASS = 2;

function amountOf(e) { return parseFloat(String(e.attributes?.amount_total || '0').replace(',', '.')) || 0; }
function ageDays(e, now) { return Math.max(0, Math.round((now - new Date(e.firstSeenAt || now).getTime()) / DAY)); }

/** Jeu d'entraînement : factures résolues. Pure-ish (lit la base). */
async function buildDataset(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const invs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['invoice', 'supplier_invoice'] } })
    .select('attributes firstSeenAt').lean();
  const X = [], y = [], now = Date.now();
  for (const e of invs) {
    const st = e.attributes?.state;          // brouillon | émise | payée | annulée
    const pay = e.attributes?.payment_state; // payée | impayée
    const isPaid = st === 'payée' || pay === 'payée';
    // Risqué : annulée, OU émise mais impayée (le signal d'impayé vit dans payment_state,
    // pas dans state — sinon le dataset n'avait qu'une classe → insufficient_data).
    const isRisk = st === 'annulée' || (pay === 'impayée' && st !== 'brouillon');
    if (isPaid) { X.push([amountOf(e), ageDays(e, now)]); y.push(0); }
    else if (isRisk) { X.push([amountOf(e), ageDays(e, now)]); y.push(1); }
  }
  return { X, y };
}

/** Entraîne et enregistre le modèle. @returns {status, examples, accuracy?} */
async function trainPaymentRisk(workspaceId) {
  const RadarModel = require('../../db/models/radar-model.model');
  const { X, y } = await buildDataset(workspaceId);
  const pos = y.filter(v => v === 1).length, neg = y.length - pos;
  if (X.length < MIN_EXAMPLES || pos < MIN_PER_CLASS || neg < MIN_PER_CLASS) {
    await RadarModel.updateOne({ workspaceId, taskType: 'payment_risk' },
      { $set: { kind: 'logreg', features: ['amount', 'age_days'], status: 'insufficient_data', 'metrics.examples': X.length } }, { upsert: true });
    return { status: 'insufficient_data', examples: X.length };
  }
  const cut = Math.floor(X.length * 0.8);
  const m = fit(X.slice(0, cut), y.slice(0, cut));
  const Xte = X.slice(cut), yte = y.slice(cut);
  const acc = accuracy(m, Xte.length ? Xte : X, Xte.length ? yte : y);
  await RadarModel.updateOne({ workspaceId, taskType: 'payment_risk' },
    { $set: { kind: 'logreg', features: ['amount', 'age_days'], params: m, status: acc >= 0.7 ? 'active' : 'shadow', metrics: { examples: X.length, accuracy: Math.round(acc * 100) / 100, trainedAt: new Date() } } }, { upsert: true });
  return { status: 'trained', examples: X.length, accuracy: acc };
}

/** Probabilité d'impayé pour une facture, si un modèle actif existe. Sinon null. */
async function predictRisk(workspaceId, entity) {
  const RadarModel = require('../../db/models/radar-model.model');
  const mdl = await RadarModel.findOne({ workspaceId, taskType: 'payment_risk', status: 'active' }).lean();
  if (!mdl || !mdl.params) return null;
  return predict(mdl.params, [amountOf(entity), ageDays(entity, Date.now())]);
}

module.exports = { trainPaymentRisk, predictRisk, buildDataset };
