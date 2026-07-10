// Radar — PRÉVISION DE CHIFFRE D'AFFAIRES mensuel (predict/revenue-forecast).
//
// Objectif : projeter le CA des `months` prochains mois à partir de l'historique des
// factures, avec un BACK-TEST honnête de l'exactitude (MAPE) sur les derniers mois connus.
//
// MÉTHODE — transparente, déterministe, sans dépendance ML lourde :
//   1) AGRÉGATION : CA mensuel = somme des montants TTC des factures par mois civil
//      (depuis attributes.date en unix s + amount_total / total_ttc). On indexe les
//      mois en continu (gaps remplis à 0) pour que la régression voie le vrai temps.
//   2) MODÈLE = TENDANCE + SAISONNALITÉ :
//        - tendance : régression linéaire CA ~ a·t + b sur l'index mensuel (moindres carrés).
//        - saisonnalité : facteur moyen par mois-de-l'année = moyenne(réel / tendance)
//          sur les mois historiques partageant ce mois calendaire (multiplicatif, recentré
//          à 1). Désactivée si l'historique est trop court (< 12 mois) → modèle pur-tendance.
//      projection(t) = max(0, (a·t + b)) × saisonnalité[mois].
//   3) BACK-TEST : on RETIENT les `holdout` derniers mois (1 si peu d'historique, sinon 2),
//      on RÉENTRAÎNE le modèle sur le reste, on prédit les mois retenus et on mesure
//      l'erreur réelle : MAPE = moyenne(|prévu − réel| / réel) en %. C'est la VÉRIFICATION
//      exigée : le modèle est évalué sur des mois qu'il n'a pas vus à l'entraînement.
//
// Retour : { history:[{month, revenue}], forecast:[{month, revenue}],
//            backtest:{ predicted:[{month,predicted,actual,errorPct}], actual, mapePct, holdout },
//            model:{ slope, intercept, seasonalityUsed, monthlyGrowthPct }, note }
//
// Historique court géré : note explicite, holdout réduit, saisonnalité désactivée.

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
// dates Dolibarr en secondes unix → ms ; tolère déjà-ms
const toMs = (v) => { const n = num(v); if (!n) return 0; return n < 1e12 ? n * 1000 : n; };
const round = (x, d = 2) => { const p = Math.pow(10, d); return Math.round(x * p) / p; };
const amountOf = (a) => num(a?.amount_total) || num(a?.total_ttc) || num(a?.amount);

const monthKey = (ms) => { const dt = new Date(ms); return dt.getUTCFullYear() * 12 + dt.getUTCMonth(); };  // index mensuel absolu
const keyToLabel = (k) => { const y = Math.floor(k / 12), mo = k % 12; return `${y}-${String(mo + 1).padStart(2, '0')}`; };
const calMonth = (k) => k % 12;   // mois calendaire 0..11

/** Régression linéaire moindres carrés y = slope·x + intercept sur des points {x,y}. */
function linreg(pts) {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: n ? pts[0].y : 0 };
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let nu = 0, de = 0;
  for (const p of pts) { nu += (p.x - mx) * (p.y - my); de += (p.x - mx) * (p.x - mx); }
  const slope = de ? nu / de : 0;
  return { slope, intercept: my - slope * mx };
}

/**
 * Entraîne un modèle tendance(+saisonnalité) sur une série {x, y, cal} et fournit predict(x, cal).
 * @param series tableau {x:indexMensuelRelatif, y:revenu, cal:moisCalendaire}
 * @param useSeasonality active la composante saisonnière (nécessite assez d'historique)
 */
function trainModel(series, useSeasonality) {
  const { slope, intercept } = linreg(series.map((p) => ({ x: p.x, y: p.y })));
  const trendAt = (x) => slope * x + intercept;

  // saisonnalité multiplicative : moyenne(réel / tendance) par mois calendaire, recentrée à 1
  const seas = new Array(12).fill(1);
  if (useSeasonality) {
    const acc = Array.from({ length: 12 }, () => []);
    for (const p of series) { const t = trendAt(p.x); if (t > 0) acc[p.cal].push(p.y / t); }
    const factors = acc.map((a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 1));
    // recentrage : moyenne géométrique des facteurs présents ramenée à 1 (n'invente pas de CA)
    const present = factors.filter((f, i) => acc[i].length);
    const gmean = present.length ? Math.exp(present.reduce((s, f) => s + Math.log(Math.max(f, 1e-6)), 0) / present.length) : 1;
    for (let i = 0; i < 12; i++) seas[i] = (acc[i].length ? factors[i] : 1) / (gmean || 1);
  }
  const predict = (x, cal) => Math.max(0, trendAt(x)) * (useSeasonality ? seas[cal] : 1);
  return { slope, intercept, seas, useSeasonality, predict };
}

/**
 * Prévision de CA mensuel + back-test.
 * @param {ObjectId|string} workspaceId
 * @param {object} [opts]
 * @param {number} [opts.months=3]  nombre de mois à projeter
 * @returns {Promise<{history, forecast, backtest, model, note}>}
 */
async function forecastRevenue(workspaceId, { months = 3 } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');

  // 1) AGRÉGATION du CA mensuel depuis les factures (toutes pièces de revenu réel)
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('attributes').lean();

  const revByMonth = new Map();   // indexMensuelAbsolu → CA
  for (const inv of invoices) {
    const ms = toMs(inv.attributes?.date); if (!ms) continue;
    const amt = amountOf(inv.attributes); if (!amt) continue;
    const k = monthKey(ms);
    revByMonth.set(k, (revByMonth.get(k) || 0) + amt);
  }

  if (revByMonth.size === 0) {
    return { history: [], forecast: [], backtest: { predicted: [], actual: [], mapePct: null, holdout: 0 },
      model: { slope: 0, intercept: 0, seasonalityUsed: false, monthlyGrowthPct: 0 },
      note: 'Aucune facture datée avec montant — prévision impossible.' };
  }

  // série continue : du premier au dernier mois observé, gaps remplis à 0 (vrai temps)
  const minK = Math.min(...revByMonth.keys());
  const maxK = Math.max(...revByMonth.keys());
  const history = [];
  for (let k = minK; k <= maxK; k++) {
    history.push({ k, month: keyToLabel(k), revenue: round(revByMonth.get(k) || 0) });
  }
  const n = history.length;

  // séries indexées en relatif (x = 0..n-1) pour la régression
  const fullSeries = history.map((h, i) => ({ x: i, y: h.revenue, cal: calMonth(h.k) }));
  const useSeasonality = n >= 12;   // saisonnalité fiable seulement avec ≥ 1 an

  let note = '';
  if (n < 4) note = `Historique très court (${n} mois) : prévision indicative, faible fiabilité.`;
  else if (n < 12) note = `Historique de ${n} mois (< 12) : saisonnalité désactivée, tendance seule.`;
  else note = `Historique de ${n} mois : tendance + saisonnalité.`;

  // 2) MODÈLE plein (pour la projection future) entraîné sur tout l'historique
  const model = trainModel(fullSeries, useSeasonality);

  // PROJECTION des `months` prochains mois
  const forecast = [];
  for (let h = 1; h <= months; h++) {
    const k = maxK + h;
    forecast.push({ month: keyToLabel(k), revenue: round(model.predict(n - 1 + h, calMonth(k))) });
  }

  // 3) BACK-TEST : retenir les derniers mois, réentraîner sur le reste, mesurer le MAPE réel
  const holdout = n >= 6 ? 2 : (n >= 3 ? 1 : 0);
  const predicted = [];
  let mapePct = null;
  if (holdout > 0) {
    const trainSeries = fullSeries.slice(0, n - holdout);
    const testSeries = fullSeries.slice(n - holdout);
    // saisonnalité au back-test seulement si le sous-ensemble d'entraînement est ≥ 12 mois
    const btModel = trainModel(trainSeries, trainSeries.length >= 12);
    const errs = [];
    for (const p of testSeries) {
      const pred = btModel.predict(p.x, p.cal);
      const actual = p.y;
      const errorPct = actual !== 0 ? round(Math.abs(pred - actual) / Math.abs(actual) * 100, 1) : null;
      if (errorPct != null) errs.push(errorPct);
      predicted.push({ month: keyToLabel(history[p.x].k), predicted: round(pred), actual: round(actual), errorPct });
    }
    mapePct = errs.length ? round(errs.reduce((s, e) => s + e, 0) / errs.length, 1) : null;
  } else {
    note += ' Back-test impossible (≤ 2 mois).';
  }

  // taux de croissance mensuel implicite (pente / niveau moyen)
  const avgLevel = history.reduce((s, h) => s + h.revenue, 0) / n;
  const monthlyGrowthPct = avgLevel > 0 ? round(model.slope / avgLevel * 100, 1) : 0;

  return {
    history: history.map(({ month, revenue }) => ({ month, revenue })),
    forecast,
    backtest: { predicted, actual: predicted.map((p) => ({ month: p.month, actual: p.actual })), mapePct, holdout },
    model: {
      slope: round(model.slope),
      intercept: round(model.intercept),
      seasonalityUsed: useSeasonality,
      monthlyGrowthPct,
    },
    note,
  };
}

module.exports = { forecastRevenue };
