// Radar — moteur de RECOMMANDATIONS (cerveau, Étage 5). Transforme les insights
// d'analyse (retards, anomalies, financier, goulots) en ACTIONS concrètes, scorées
// et priorisées : le Radar ne dit plus seulement « voici un problème » mais « voici
// quoi faire ». Déterministe ; les actions seront ensuite exécutables (playbooks).

const { analyzeWorkspace } = require('./analytics');
const { forecast } = require('./forecast');
const { findDuplicates } = require('./duplicates');
const { analyzeSensors } = require('./sensors');
const { findDeadlines } = require('./deadlines');

function eur(n) { return (Math.round(n) || 0).toLocaleString('fr-FR') + ' €'; }

/** Produit des recommandations d'action priorisées pour un workspace. */
async function recommend(workspaceId) {
  const a = await analyzeWorkspace(workspaceId);
  const fc = await forecast(workspaceId).catch(() => null);
  const dups = await findDuplicates(workspaceId).catch(() => []);
  const sensors = await analyzeSensors(workspaceId).catch(() => []);
  const deadlines = await findDeadlines(workspaceId).catch(() => []);
  const recs = [];

  // Échéances / SLA → traiter avant la date
  for (const d of deadlines.slice(0, 8)) {
    recs.push({
      type: 'echeance', priority: d.overdue ? 'haute' : (d.dueInDays <= 7 ? 'normale' : 'basse'),
      score: d.score, title: d.message, detail: `${d.type}`, system: d.system,
      action: d.overdue ? `Traiter « ${d.label} » en retard` : `Anticiper l'échéance de « ${d.label} »`,
    });
  }

  // Doublons / double-saisie → fusionner / synchroniser
  for (const d of dups.slice(0, 8)) {
    recs.push({
      type: 'fusionner', priority: d.crossSystem ? 'normale' : 'basse', score: d.score,
      title: `Doublon possible : « ${d.a.label} » et « ${d.b.label} »`,
      detail: d.reason, system: [...new Set([...d.a.systems, ...d.b.systems])].join(' + '),
      action: d.crossSystem ? 'Fusionner / synchroniser entre les deux systèmes' : 'Vérifier et fusionner',
    });
  }
  // Anomalies capteurs / production → vérifier
  for (const s of sensors.filter(x => x.alert).slice(0, 6)) {
    recs.push({
      type: 'capteur', priority: s.alert.severity === 'high' ? 'haute' : 'normale', score: s.alert.severity === 'high' ? 80 : 50,
      title: `Capteur : ${s.alert.message}`, detail: `${s.assetKey} · ${s.metric}`, system: 'Capteurs',
      action: s.alert.kind === 'anomaly' ? `Vérifier ${s.assetKey} (valeur anormale)` : `Surveiller ${s.metric} (${s.alert.kind})`,
    });
  }

  // Factures impayées / entités bloquées → relancer / débloquer
  for (const d of a.delays) {
    const unpaid = d.state === 'émise' || d.state === 'impayée';
    recs.push({
      type: unpaid ? 'relance_facture' : 'debloquer',
      priority: d.sinceDays >= 30 ? 'haute' : 'normale',
      score: (unpaid ? 70 : 45) + Math.min(d.sinceDays, 40),
      title: unpaid ? `Relancer : ${d.label} impayée depuis ${d.sinceDays} j`
                    : `Débloquer : ${d.label} en « ${d.state} » depuis ${d.sinceDays} j`,
      detail: d.reason, system: d.system,
      action: unpaid ? `Envoyer une relance de paiement (${d.label})` : `Faire avancer « ${d.label} »`,
    });
  }

  // Anomalies near_miss → proposer le rattachement (confirmable)
  for (const an of a.anomalies) {
    if (an.kind !== 'near_miss') continue;
    recs.push({
      type: 'rattacher', priority: 'normale', score: an.score,
      title: `Rattacher « ${an.entity} » à ${an.suggestedClient} ?`,
      detail: an.reason, system: an.system,
      action: `Confirmer le rattachement au client « ${an.suggestedClient} »`,
    });
  }

  // Financier global → recouvrement
  if (a.financial.outstanding > 0) {
    recs.push({
      type: 'recouvrement', priority: a.financial.collectionRate < 60 ? 'haute' : 'normale', score: 55,
      title: `${eur(a.financial.outstanding)} en attente de paiement`,
      detail: `${a.financial.invoices - a.financial.paidInvoices} facture(s) impayée(s) · recouvrement ${a.financial.collectionRate}%${fc ? ` · encaissement prévu ~${fc.expectedDays} j` : ''}`,
      action: 'Prioriser le recouvrement des créances',
    });
  }

  // Goulots → optimiser / automatiser
  for (const b of a.bottlenecks.slice(0, 3)) {
    recs.push({
      type: 'optimiser', priority: 'basse', score: Math.min(b.score, 50),
      title: `Optimiser « ${b.process} » : ${b.from} → ${b.to} (${b.avgDays} j)`,
      detail: b.description,
      action: 'Mettre en place une relance/alerte automatique sur cette étape',
    });
  }

  return { recommendations: recs.sort((x, y) => y.score - x.score).slice(0, 20), forecast: fc };
}

module.exports = { recommend };
