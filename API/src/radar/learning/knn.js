// Radar — classifieur k-plus-proches-voisins (Étage 3), JS pur. Pour distiller les
// tâches de classification (significance des mails, fournisseur, pertinence) : on
// vectorise un item (features hashées, pas d'API embeddings requise pour démarrer),
// puis on prédit le label du voisin le plus proche parmi les exemples VALIDÉS.
// Démarrage à froid : peu d'exemples / similarité faible → on retombe sur le LLM.

const DIM = 96;
function hashIdx(token) { let h = 0; for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0; return h % DIM; }

/** Texte → vecteur de features (sac de mots hashé, normalisé). Pure. */
function featurize(text) {
  const v = new Array(DIM).fill(0);
  for (const tok of String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9@._]+/g) || []) {
    if (tok.length < 2) continue;
    v[hashIdx(tok)] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

function cosine(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

/**
 * Prédit par k-NN. examples: [{vec, label}]. @returns {label, confidence, neighbors} | null
 * Retourne null si l'index est vide ou la meilleure similarité < minSim (→ fallback LLM).
 */
function knnPredict(examples, vec, { k = 5, minSim = 0.45 } = {}) {
  if (!examples.length) return null;
  const scored = examples.map(e => ({ label: e.label, sim: cosine(e.vec, vec), meta: e.meta }))
    .sort((a, b) => b.sim - a.sim);
  if (scored[0].sim < minSim) return null;            // trop incertain → LLM
  const top = scored.slice(0, k);
  const votes = {};
  for (const t of top) votes[t.label] = (votes[t.label] || 0) + t.sim;
  const label = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = top.filter(t => t.label === label).reduce((s, t) => s + t.sim, 0) / top.reduce((s, t) => s + t.sim, 0);
  return { label, confidence: Math.round(confidence * 100) / 100, neighbors: top.slice(0, 3).map(t => ({ label: t.label, sim: Math.round(t.sim * 100) / 100, meta: t.meta })) };
}

module.exports = { featurize, cosine, knnPredict, DIM };
