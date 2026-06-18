// Radar — statistiques de séries temporelles (capteurs, production), JS pur.
// Moyenne mobile, tendance (régression linéaire), détection d'anomalie (z-score),
// projection. Sert au forecasting capteur / OEE / trésorerie. Pour ARIMA/NN, on
// passera au sandbox Python ; ici un socle déterministe, explicable, sans dépendance.

function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function std(a) { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); }

/** Régression linéaire y = a·x + b sur des points {x, y}. @returns {slope, intercept} */
function linearTrend(points) {
  const n = points.length; if (n < 2) return { slope: 0, intercept: n ? points[0].y : 0 };
  const mx = mean(points.map(p => p.x)), my = mean(points.map(p => p.y));
  let num = 0, den = 0;
  for (const p of points) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  const slope = den ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

/** Moyenne mobile simple (fenêtre w). */
function movingAverage(values, w = 5) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const s = Math.max(0, i - w + 1);
    out.push(mean(values.slice(s, i + 1)));
  }
  return out;
}

/** Anomalies par z-score (|z| ≥ k). @returns indices + valeurs hors-norme. */
function zAnomalies(values, k = 2.5) {
  const m = mean(values), s = std(values);
  if (!s) return [];
  return values.map((v, i) => ({ i, v, z: (v - m) / s })).filter(p => Math.abs(p.z) >= k);
}

/**
 * Analyse complète d'une série {at, value}. @returns
 * { count, mean, std, trend (slope/intercept), direction, forecastNext, anomalies }
 */
function analyzeSeries(series, { horizon = 1 } = {}) {
  const pts = series.map((p, i) => ({ x: i, y: Number(p.value) })).filter(p => Number.isFinite(p.y));
  const values = pts.map(p => p.y);
  const trend = linearTrend(pts);
  const next = trend.slope * (pts.length - 1 + horizon) + trend.intercept;
  const m = mean(values), s = std(values);
  return {
    count: values.length, mean: round(m), std: round(s),
    trend: { slope: round(trend.slope), intercept: round(trend.intercept) },
    direction: trend.slope > s * 0.05 ? 'hausse' : trend.slope < -s * 0.05 ? 'baisse' : 'stable',
    forecastNext: round(next),
    anomalies: zAnomalies(values).map(a => ({ index: a.i, value: round(a.v), z: round(a.z) })),
  };
}
function round(n) { return Math.round(n * 100) / 100; }

module.exports = { mean, std, linearTrend, movingAverage, zAnomalies, analyzeSeries };
