// Radar — analyse capteurs / production (Étage 4, temps-réel industriel).
// Lit les RadarMeasurement (séries), prévoit (tendance), détecte les anomalies et
// les franchissements de seuil → alertes. Le flux normal = zéro signal ; une dérive
// (OEE en baisse, température anormale, cadence qui chute) = un insight/Event.

const { analyzeSeries } = require('./learning/timeseries');

/** Ingestion d'une mesure (point de série). */
async function recordMeasurement(workspaceId, { assetKey, metric, value, unit, at, connectorId, providerKey }) {
  const RadarMeasurement = require('../db/models/radar-measurement.model');
  return RadarMeasurement.create({ workspaceId, assetKey, metric, value: Number(value), unit, at: at ? new Date(at) : new Date(), source: { connectorId, providerKey } });
}

/**
 * Analyse les séries capteurs d'un workspace, par (asset, métrique).
 * @returns Array<{ assetKey, metric, ...analyse, alert? }>
 */
async function analyzeSensors(workspaceId, { sinceDays = 30 } = {}) {
  const RadarMeasurement = require('../db/models/radar-measurement.model');
  const since = new Date(Date.now() - sinceDays * 86400000);
  const rows = await RadarMeasurement.find({ workspaceId, at: { $gte: since } }).sort({ at: 1 }).lean();
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.assetKey || '?'}|${r.metric}`;
    (groups.get(k) || groups.set(k, []).get(k)).push({ at: r.at, value: r.value, unit: r.unit });
  }
  const out = [];
  for (const [k, series] of groups) {
    if (series.length < 3) continue;
    const [assetKey, metric] = k.split('|');
    const a = analyzeSeries(series);
    let alert = null;
    if (a.anomalies.length) alert = { kind: 'anomaly', severity: 'high', message: `${metric} : ${a.anomalies.length} valeur(s) anormale(s) (dernière z=${a.anomalies[a.anomalies.length - 1].z})` };
    else if (a.direction === 'baisse' && /oee|cadence|rendement|trs/i.test(metric)) alert = { kind: 'downtrend', severity: 'normal', message: `${metric} en baisse (prévision ${a.forecastNext})` };
    else if (a.direction === 'hausse' && /temp|vibration|pression|energy|conso/i.test(metric)) alert = { kind: 'uptrend', severity: 'normal', message: `${metric} en hausse (prévision ${a.forecastNext})` };
    out.push({ assetKey, metric, unit: series[series.length - 1].unit, ...a, alert });
  }
  return out.sort((x, y) => (y.alert ? 1 : 0) - (x.alert ? 1 : 0));
}

module.exports = { recordMeasurement, analyzeSensors };
