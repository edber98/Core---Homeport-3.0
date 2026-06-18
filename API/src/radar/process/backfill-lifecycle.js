// Backfill du CYCLE DE VIE depuis les timestamps réels d'un logiciel.
//
// La collecte baseline n'émet qu'un delta `created` : sans repasser plusieurs fois
// dans le temps, le process mining n'a aucune transition. MAIS les logiciels
// conservent l'historique dans leurs DATES (date_creation, date_validation,
// date_paiement…). On reconstitue donc l'event-log RÉEL en émettant un RadarDelta
// daté par jalon franchi. 100% vraie donnée (aucune valeur inventée), seulement
// l'ordre chronologique déjà présent dans les enregistrements.
//
// Spécifique au logiciel (ici Dolibarr) — c'est le pendant « historique » du
// mapping déclaré. Pour un connecteur dynamique, l'équivalent serait dérivé des
// champs de date détectés par inferSchema.

// Pour chaque entityType : champ d'état brut + jalons ordonnés (valeur d'état +
// champs de date candidats, 1er non vide gagne). `when` filtre un jalon conditionnel.
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const firstTs = (data, fields) => { for (const f of fields) { const n = num(data[f]); if (n) return n; } return null; };

const DOLIBARR_LIFECYCLE = {
  customer_invoice: { stateField: 'statut', steps: [
    { val: '0', at: ['date_creation', 'datec', 'date'] },
    { val: '1', at: ['date_validation', 'datev'] },
    { val: '2', at: ['date_closing', 'date_cloture', 'datem', 'date_modification'], when: (d) => String(d.paye) === '1' || num(d.sumpayed) },
  ] },
  supplier_invoice: { stateField: 'statut', steps: [
    { val: '0', at: ['date_creation', 'datec', 'date'] },
    { val: '1', at: ['date_validation', 'datev'] },
    { val: '2', at: ['date_closing', 'datem'], when: (d) => String(d.paye) === '1' },
  ] },
  quote: { stateField: 'statut', steps: [
    { val: '0', at: ['datec', 'date_creation', 'date'] },
    { val: '1', at: ['datev', 'date_validation'] },
    { val: '2', at: ['date_signature', 'date_cloture'], when: (d) => String(d.statut) === '2' },
    { val: '3', at: ['date_cloture'], when: (d) => String(d.statut) === '3' },
  ] },
  order: { stateField: 'statut', steps: [
    { val: '0', at: ['date_creation', 'date_commande', 'date'] },
    { val: '1', at: ['date_validation'] },
    { val: '3', at: ['delivery_date'], when: (d) => num(d.delivery_date) },
  ] },
  project: { stateField: 'statut', steps: [
    { val: '1', at: ['date_start', 'dateo', 'date_c', 'date_creation'] },
    { val: '2', at: ['date_close', 'date_end', 'datee'], when: (d) => String(d.statut) === '2' || num(d.date_close) },
  ] },
  // L'état d'une tâche vit dans `progress` (le champ `status` reste 0). On dérive
  // donc l'état courant depuis progress via `currentVal`.
  task: { stateField: 'status', currentVal: (d) => Number(d.progress) >= 100 ? '2' : Number(d.progress) > 0 ? '1' : '0', steps: [
    { val: '0', at: ['date_c', 'date_creation', 'date_start'] },
    { val: '1', at: ['date_debut_reel', 'timespent_min_date'], when: (d) => Number(d.progress) > 0 && Number(d.progress) < 100 },
    { val: '2', at: ['date_fin_reel', 'date_end', 'timespent_max_date'], when: (d) => Number(d.progress) >= 100 },
  ] },
  ticket: { stateField: 'status', steps: [
    { val: '0', at: ['datec', 'date_creation'] },
    { val: '1', at: ['date_read'], when: (d) => num(d.date_read) || String(d.status) === '1' },
    { val: '8', at: ['date_close'], when: (d) => num(d.date_close) || String(d.status) === '8' },
  ] },
};

/**
 * Reconstitue les deltas de cycle de vie d'un workspace depuis les snapshots réels.
 * Idempotent (upsert par id déterministe). N'invente jamais une date : un jalon sans
 * timestamp réel est ignoré (sauf le jalon final, ancré sur la dernière modification
 * pour que la transition observée existe au moins une fois).
 * @returns {Promise<{ deltas:number, byType:object }>}
 */
async function backfillDolibarrLifecycle(workspaceId, { providerKey = 'dolibarr' } = {}) {
  const RadarSnapshot = require('../../db/models/radar-snapshot.model');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarConnector = require('../../db/models/radar-connector.model');

  const connectors = await RadarConnector.find({ workspaceId, providerKey }).select('_id family').lean();
  const connByFamily = new Map(connectors.map(c => [c.family, c._id]));
  const anyConn = connectors[0]?._id;
  if (!anyConn) return { deltas: 0, byType: {} };

  const byType = {};
  let total = 0;
  for (const [entityType, def] of Object.entries(DOLIBARR_LIFECYCLE)) {
    const snaps = await RadarSnapshot.find({ workspaceId, entityType, deletedAt: null }).lean();
    if (!snaps.length) continue;
    const connectorId = snaps[0].connectorId || connByFamily.get(snaps[0].family) || anyConn;
    let n = 0;
    for (const snap of snaps) {
      const d = snap.data || {};
      const lastMod = firstTs(d, ['datem', 'date_modification', 'date_m', 'tms']) || firstTs(d, def.steps[0].at);
      // jalons franchis (timestamp réel OU jalon final ancré sur lastMod)
      const curVal = def.currentVal ? def.currentVal(d) : String(d[def.stateField]);
      const reached = [];
      for (const step of def.steps) {
        if (step.when && !step.when(d)) continue;
        let ts = firstTs(d, step.at);
        if (!ts && reached.length && String(curVal) === String(step.val)) ts = lastMod; // état courant atteint sans date → ancre
        if (!ts) continue;
        reached.push({ val: step.val, at: ts });
      }
      if (reached.length < 1) continue;
      reached.sort((a, b) => a.at - b.at);
      for (let i = 0; i < reached.length; i++) {
        const r = reached[i];
        await RadarDelta.updateOne(
          { id: `lc_${providerKey}_${entityType}_${snap.entityKey}_${r.val}` },
          { $set: {
            workspaceId, connectorId, family: snap.family || 'accounting',
            entityType, entityKey: snap.entityKey,
            type: i === 0 ? 'created' : 'updated',
            after: { [def.stateField]: r.val },
            occurredAt: new Date(r.at * 1000), status: 'consumed',
          } },
          { upsert: true }
        );
        n++; total++;
      }
    }
    if (n) byType[entityType] = n;
  }
  return { deltas: total, byType };
}

module.exports = { backfillDolibarrLifecycle, DOLIBARR_LIFECYCLE };
