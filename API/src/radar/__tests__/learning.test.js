// Petit modèle statistique : la régression logistique s'entraîne réellement et
// sépare les classes (risque faible vs élevé). Pur, déterministe, sans dépendance.

const test = require('node:test');
const assert = require('node:assert/strict');
const { fit, predict, accuracy } = require('../learning/logreg');

// Risque d'impayé : [montant, âge en jours]. Petit montant + récent = OK (0) ;
// gros montant + ancien = risque (1).
const X = [
  [100, 2], [220, 3], [150, 5], [120, 1], [300, 4], [90, 2],
  [5000, 90], [6000, 120], [5500, 80], [7000, 100], [4800, 110], [6200, 95],
];
const y = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];

test('logreg : apprend à séparer les classes (précision élevée)', () => {
  const m = fit(X, y, { epochs: 1000 });
  assert.ok(accuracy(m, X, y) >= 0.9, 'précision ≥ 90% sur le jeu appris');
});

test('logreg : prédit le bon risque pour des cas nouveaux', () => {
  const m = fit(X, y, { epochs: 1000 });
  assert.ok(predict(m, [120, 2]) < 0.4, 'petite facture récente = risque faible');
  assert.ok(predict(m, [6500, 130]) > 0.6, 'grosse facture ancienne = risque élevé');
});

test('logreg : la standardisation gère des échelles très différentes', () => {
  // montant en milliers vs âge en unités — sans standardisation, ça diverge
  const m = fit(X, y, { epochs: 800 });
  assert.ok(Number.isFinite(predict(m, [5000, 100])), 'pas de NaN/divergence');
});
