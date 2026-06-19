// Couche MACHINES + CAPTEURS simulée, branchée sur la VRAIE production.
//
// On n'a pas (encore) de connecteur IoT/MES réel (Home Assistant, SAP MES…), mais
// l'atelier qui fabrique les produits finis a des machines instrumentées. On génère
// donc des machines (Asset/machine) RELIÉES aux produits fabriqués + des séries
// capteurs (température, OEE/cadence) avec des ANOMALIES réelles :
//   - une presse qui surchauffe (pic de température → anomalie z-score) ;
//   - une ligne dont l'OEE décline (tendance baissière → alerte) ;
//   - une panne machine → retard de l'ordre de fabrication → tension de stock.
//
// Idempotent : on purge les mesures simulées de ces machines avant de re-générer.
// Gated par RADAR_SIMULATE (comme les emails) → désactivable pour du 100% réel.

const PROV = 'mes_sim';   // pseudo-connecteur atelier
const DAY = 86400000, HOUR = 3600000;

/**
 * Crée les machines, les relie aux produits fabriqués, et génère 7 jours de séries
 * capteurs horaires avec anomalies. @returns {{machines, measurements, relations}}
 */
async function seedMachinesAndSensors(workspaceId, { now = Date.now() } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const RadarMeasurement = require('../../db/models/radar-measurement.model');
  const { recordMeasurement } = require('../sensors');

  // Produits FABRIQUÉS (produits finis de l'atelier) — on relie les machines à ceux-ci.
  // Heuristique sans hardcode de nom : produits dont la réf/label évoque le fini de prod.
  const products = await RadarEntity.find({ workspaceId, coreType: 'Asset', subtype: 'product' })
    .select('canonicalKey label attributes').lean();
  const finished = products.filter(p => /FIN-|fini|carton imprim/i.test(`${p.attributes?.ref || ''} ${p.label || ''}`));
  const moEntities = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: { $in: ['mo', 'work_order', 'manufacturing_order'] } })
    .select('canonicalKey label').lean();

  const machines = [
    { id: 'PRESSE-01', label: 'Presse d\'impression Heidelberg', metric: 'temperature', unit: '°C', status: 'running' },
    { id: 'DECOUPE-01', label: 'Découpe laser Trotec', metric: 'temperature', unit: '°C', status: 'running' },
    { id: 'LIGNE-ASSEMB', label: 'Ligne d\'assemblage carton', metric: 'oee', unit: '%', status: 'maintenance' },
  ];

  let machineCount = 0, relCount = 0, measCount = 0;
  for (const m of machines) {
    const key = `${PROV}:machine:${m.id}`;
    await RadarEntity.updateOne(
      { workspaceId, canonicalKey: key },
      { $set: { coreType: 'Asset', subtype: 'machine', label: m.label, roles: [],
                attributes: { status: m.status, ref: m.id }, sources: [{ providerKey: PROV, externalId: m.id }] },
        $setOnInsert: { firstSeenAt: new Date(now - 7 * DAY), lastSeenAt: new Date(now) } },
      { upsert: true });
    machineCount++;
    // relier la machine aux produits finis qu'elle fabrique + aux ordres de fabrication
    for (const p of finished) {
      await RadarRelation.updateOne(
        { workspaceId, fromKey: key, toKey: p.canonicalKey, type: 'produces', role: 'product' },
        { $set: { confidence: 0.9, source: 'simulation' } }, { upsert: true }).catch(() => {});
      relCount++;
    }
    for (const mo of moEntities) {
      await RadarRelation.updateOne(
        { workspaceId, fromKey: mo.canonicalKey, toKey: key, type: 'references', role: 'machine' },
        { $set: { confidence: 0.8, source: 'simulation' } }, { upsert: true }).catch(() => {});
      relCount++;
    }
  }

  // purge des mesures simulées précédentes (idempotence) puis re-génération
  await RadarMeasurement.deleteMany({ workspaceId, 'source.providerKey': PROV }).catch(() => {});

  // 7 jours × 24 h de mesures horaires
  for (let h = 0; h < 7 * 24; h++) {
    const at = new Date(now - (7 * 24 - h) * HOUR);
    const dayPhase = h % 24;
    // PRESSE : ~68 °C normal, PIC de surchauffe (panne palier) le jour 5 vers 14 h
    const spike = (h >= 5 * 24 + 13 && h <= 5 * 24 + 15);
    const presseTemp = spike ? 104 + (h % 3) : 66 + (dayPhase % 4);
    await recordMeasurement(workspaceId, { assetKey: `${PROV}:machine:PRESSE-01`, metric: 'temperature', value: presseTemp, unit: '°C', at, providerKey: PROV });
    // DÉCOUPE : stable autour de 58 °C
    await recordMeasurement(workspaceId, { assetKey: `${PROV}:machine:DECOUPE-01`, metric: 'temperature', value: 56 + (dayPhase % 3), unit: '°C', at, providerKey: PROV });
    // LIGNE ASSEMBLAGE : OEE qui DÉCLINE sur la semaine (usure → maintenance) 86 → 52 %
    const oee = Math.max(50, 86 - (h / (7 * 24)) * 34);
    await recordMeasurement(workspaceId, { assetKey: `${PROV}:machine:LIGNE-ASSEMB`, metric: 'oee', value: Math.round(oee), unit: '%', at, providerKey: PROV });
    measCount += 3;
  }

  return { machines: machineCount, relations: relCount, measurements: measCount };
}

module.exports = { seedMachinesAndSensors };
