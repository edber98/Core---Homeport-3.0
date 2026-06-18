// Radar — régression logistique (vrai modèle statistique), JS pur, sans dépendance.
// Entraînée par descente de gradient avec régularisation L2 et standardisation des
// features. Sert au scoring de risque (ex. probabilité d'impayé). Pour des modèles
// plus lourds (séries temporelles ARIMA, réseaux de neurones, PM4Py), on passera
// par le sandbox Python déjà en place — ici un modèle léger, explicable, suffit.

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

/** Standardise les colonnes (moyenne 0, écart-type 1). Retourne {X, mean, std}. */
function standardize(X) {
  const d = X[0].length, n = X.length;
  const mean = new Array(d).fill(0), std = new Array(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / n;
  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2 / n;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1;
  const Xs = X.map(row => row.map((v, j) => (v - mean[j]) / std[j]));
  return { X: Xs, mean, std };
}

/** Entraîne une régression logistique. @returns {w, b, mean, std} */
function fit(Xraw, y, { lr = 0.3, epochs = 800, l2 = 0.001 } = {}) {
  const { X, mean, std } = standardize(Xraw);
  const n = X.length, d = X[0].length;
  let w = new Array(d).fill(0), b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      const p = sigmoid(dot(w, X[i]) + b), err = p - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
      gb += err;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
    b -= lr * (gb / n);
  }
  return { w, b, mean, std };
}

/** Probabilité prédite pour un vecteur de features brut. 0..1 */
function predict(model, xraw) {
  const x = xraw.map((v, j) => (v - model.mean[j]) / (model.std[j] || 1));
  return sigmoid(dot(model.w, x) + model.b);
}

/** Précision sur un jeu (seuil 0.5). */
function accuracy(model, Xraw, y) {
  if (!Xraw.length) return 0;
  let ok = 0;
  for (let i = 0; i < Xraw.length; i++) if ((predict(model, Xraw[i]) >= 0.5 ? 1 : 0) === y[i]) ok++;
  return ok / Xraw.length;
}

module.exports = { fit, predict, accuracy, standardize, sigmoid };
