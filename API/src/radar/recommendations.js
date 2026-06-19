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
  for (const d of deadlines) {
    recs.push({
      type: 'echeance', priority: d.overdue ? 'haute' : (d.dueInDays <= 7 ? 'normale' : 'basse'),
      score: d.score, title: d.message, detail: `${d.type}`, system: d.system,
      action: d.overdue ? `Traiter « ${d.label} » en retard` : `Anticiper l'échéance de « ${d.label} »`,
    });
  }

  // Doublons / double-saisie → fusionner / corriger l'orthographe
  // Heuristique « bonne graphie » : le libellé le mieux formé (espaces, majuscules,
  // accents, plus long) est la référence ; l'autre est probablement une faute de saisie.
  const wellFormed = (s) => (/[A-ZÀ-Ý]/.test(s) ? 2 : 0) + (/\s/.test(s) ? 2 : 0) + (/[À-ÿ]/.test(s) ? 1 : 0) + String(s).length * 0.02;
  for (const d of dups) {
    const aBetter = wellFormed(d.a.label) >= wellFormed(d.b.label);
    const good = aBetter ? d.a : d.b, bad = aBetter ? d.b : d.a;   // graphie correcte vs probable faute
    // typo probable : très similaires mais orthographes différentes (pas juste 2 systèmes)
    const isTypo = d.similarity >= 88 && good.label !== bad.label && wellFormed(good.label) - wellFormed(bad.label) >= 1.5;
    recs.push({
      type: isTypo ? 'corriger_orthographe' : 'fusionner',
      priority: d.crossSystem ? 'normale' : 'basse', score: d.score + (isTypo ? 8 : 0),
      title: isTypo
        ? `Faute d'orthographe probable : « ${bad.label} » → « ${good.label} »`
        : `Doublon possible : « ${d.a.label} » et « ${d.b.label} »`,
      detail: isTypo
        ? `« ${bad.label} » ressemble à ${d.similarity}% à « ${good.label} » (saisi dans ${(bad.systems || []).join(', ') || 'un autre support'}) — probablement la même entité mal orthographiée.`
        : d.reason,
      system: [...new Set([...d.a.systems, ...d.b.systems])].join(' + '),
      action: isTypo ? `Corriger « ${bad.label} » en « ${good.label} » (et fusionner)` : (d.crossSystem ? 'Fusionner / synchroniser entre les deux systèmes' : 'Vérifier et fusionner'),
      executable: true, keepKey: good.key, dropKey: bad.key,   // R4 : on GARDE la bonne graphie
    });
  }
  // Anomalies capteurs / production → vérifier
  for (const s of sensors.filter(x => x.alert)) {
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
      executable: !!(an.entityKey && an.suggestedClientKey), fromKey: an.entityKey, toKey: an.suggestedClientKey,  // R4
    });
  }

  // Ruptures de process (commande sans devis, facture sans commande) → contrôler
  for (const g of (a.processGaps || [])) {
    recs.push({
      type: 'controle_process', priority: g.severity === 'high' ? 'haute' : 'normale',
      score: (g.severity === 'high' ? 70 : 50), title: g.reason,
      detail: `Étape « ${g.missing} » manquante dans le flux de vente`, system: 'Dolibarr',
      action: `Vérifier « ${g.label} » : pièce ${g.missing} attendue en amont`,
    });
  }
  // Écarts de process (retours en arrière d'état) → contrôler
  const regressions = await require('./process/regressions').findStateRegressions(workspaceId).catch(() => []);
  for (const r of regressions) {
    recs.push({
      type: 'controle_process', priority: 'normale', score: 58, title: r.reason,
      detail: `Régression d'état détectée (${r.from} → ${r.to})`, system: 'Process',
      action: `Vérifier « ${r.entityKey} » : retour en arrière inhabituel`,
    });
  }
  // Goulots de stock (produit sur-demandé vs stock bas) → réapprovisionner
  for (const s of (a.stockRisks || [])) {
    recs.push({
      type: 'reappro_stock', priority: s.severity === 'high' ? 'haute' : 'normale',
      score: (s.severity === 'high' ? 75 : 50), title: `Stock tendu : ${s.product} (${s.stock} pour ${s.demand} demandés)`,
      detail: s.reason, system: 'Catalogue',
      action: `Réapprovisionner « ${s.product} » avant rupture`,
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
  for (const b of a.bottlenecks) {
    recs.push({
      type: 'optimiser', priority: 'basse', score: Math.min(b.score, 50),
      title: `Optimiser « ${b.process} » : ${b.from} → ${b.to} (${b.avgDays} j)`,
      detail: b.description,
      action: 'Mettre en place une relance/alerte automatique sur cette étape',
    });
  }

  // AUCUNE limite : on remonte TOUS les signaux, triés par score (les plus urgents d'abord).
  const all = recs.sort((x, y) => y.score - x.score);
  return { recommendations: all, forecast: fc };
}

module.exports = { recommend };
