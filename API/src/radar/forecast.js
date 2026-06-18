// Radar — forecasting (cerveau, Étage 4). Projection simple, déterministe, à partir
// des données observées : délai moyen d'encaissement (depuis le process de
// facturation), trésorerie prévisionnelle, factures à risque de non-paiement.
// (Évoluera vers un modèle appris — RadarRiskModel — quand assez d'historique.)

const { financialSummary, findDelays } = require('./analytics');
const { mineProcesses } = require('./process/miner');

const DAY = 86400000;

async function forecast(workspaceId) {
  const fin = await financialSummary(workspaceId);

  // délai moyen d'encaissement réel (process « Facturation » : transition → payée)
  let avgPayDays = 30;
  const procs = await mineProcesses(workspaceId);
  const inv = procs.find(p => p.subtype === 'invoice');
  if (inv) {
    const t = inv.transitions.find(x => x.to === 'payée' && x.avgDurationMs);
    if (t) avgPayDays = Math.max(1, Math.round(t.avgDurationMs / DAY));
  }

  // factures à risque : impayées depuis nettement plus que le délai moyen
  const delays = await findDelays(workspaceId, { stuckDays: Math.round(avgPayDays * 1.5) });
  const atRisk = delays.filter(d => d.state === 'émise' || d.state === 'impayée');

  // état du petit modèle de risque d'impayé (s'il a pu s'entraîner)
  const RadarModel = require('../db/models/radar-model.model');
  const mdl = await RadarModel.findOne({ workspaceId, taskType: 'payment_risk' }).select('status metrics').lean();

  return {
    outstanding: fin.outstanding,            // créances en attente (€)
    expectedDays: avgPayDays,                // délai moyen d'encaissement observé
    projectedInflow: fin.outstanding,        // trésorerie prévisionnelle (encaissement attendu)
    atRiskCount: atRisk.length,
    atRisk: atRisk.slice(0, 8).map(d => ({ label: d.label, system: d.system, sinceDays: d.sinceDays })),
    collectionRate: fin.collectionRate,
    riskModel: mdl ? { status: mdl.status, accuracy: mdl.metrics?.accuracy, examples: mdl.metrics?.examples } : null,
  };
}

module.exports = { forecast };
