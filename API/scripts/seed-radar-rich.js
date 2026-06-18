#!/usr/bin/env node
// DATASET RICHE de démonstration/vision : un MAXIMUM de cas pour voir tout le
// cerveau en action — multi-secteurs (services, industrie, formation), cycles de
// vie cross-logiciel, doublons (exact/casse/flou/cross-système), anomalies de
// corrélation (fautes de frappe), factures impayées/annulées, OF + capteurs
// (séries temporelles avec pics/tendances), historique pour entraîner les modèles,
// dérive de schéma. Purge le graphe du workspace puis reconstruit tout.
//
//   node scripts/seed-radar-rich.js

const path = require('path'); const fs = require('fs'); const mongoose = require('mongoose');
try { const p = path.resolve(__dirname, '../.env'); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const DAY = 86400000;

async function main() {
  await mongoose.connect((process.env.MONGO_URL || 'mongodb://localhost:27017/') + (process.env.MONGO_DB_NAME || 'homeport'));
  const Credential = require('../src/db/models/credential.model');
  const RadarConnector = require('../src/db/models/radar-connector.model');
  const RadarEntity = require('../src/db/models/radar-entity.model');
  const RadarRelation = require('../src/db/models/radar-relation.model');
  const RadarDelta = require('../src/db/models/radar-delta.model');
  const RadarMeasurement = require('../src/db/models/radar-measurement.model');
  const RadarSnapshot = require('../src/db/models/radar-snapshot.model');
  const { newId } = require('../src/utils/ids');
  await require('../src/radar/graph/mappings-dolibarr').seedDolibarrMappings();
  await require('../src/radar/graph/mappings-email').seedEmailMappings();
  await require('../src/radar/graph/mappings-extra').seedExtraMappings();

  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { console.error('pas de credential dolibarr'); process.exit(1); }
  const wsId = cred.workspaceId;
  for (const M of [RadarEntity, RadarRelation, RadarDelta, RadarMeasurement, RadarSnapshot]) await M.deleteMany({ workspaceId: wsId });
  console.log('[rich] graphe purgé');

  const conn = {};
  for (const [k, f] of [['dolibarr', 'accounting'], ['gmail', 'email'], ['openproject', 'productivity'], ['nextcloud', 'storage'], ['sap_mes', 'industry'], ['digiforma', 'productivity']])
    conn[k] = await RadarConnector.findOneAndUpdate({ workspaceId: wsId, providerKey: k, family: f }, { $set: { status: 'paused' }, $setOnInsert: { workspaceId: wsId, providerKey: k, family: f, label: `${k} (démo riche)` } }, { upsert: true, new: true });

  const now = Date.now();
  const ent = (coreType, subtype, key, label, dAgo, roles = [], attrs = {}, sourceProv = null) => RadarEntity.updateOne(
    { workspaceId: wsId, canonicalKey: key },
    { $set: { coreType, subtype, label, roles, attributes: attrs, sources: sourceProv ? [{ providerKey: sourceProv, externalId: key }] : [] }, $setOnInsert: { firstSeenAt: new Date(now - dAgo * DAY), lastSeenAt: new Date() } }, { upsert: true });
  const rel = (from, to, type, role) => RadarRelation.updateOne({ workspaceId: wsId, fromKey: from, toKey: to, type, role: role || null }, { $set: { confidence: 1, source: 'rule' } }, { upsert: true });
  const delta = (provKey, family, entityType, entityKey, statut, dAgo) => RadarDelta.updateOne({ id: `rich_${entityKey}_${statut}` }, { $set: { workspaceId: wsId, connectorId: conn[provKey]._id, family, entityType, entityKey, type: statut === '0' ? 'created' : 'updated', after: { statut }, occurredAt: new Date(now - dAgo * DAY), status: 'consumed' } }, { upsert: true });

  // ── SECTEUR SERVICES : 10 affaires cross-logiciel, issues variées ──
  const CLIENTS = ['Cartonnage du Château', 'Joly Formations', 'ITBS Solutions', 'ADSTRAT', 'BIOFORCE', 'SAMA Conseil', 'Mairie de Cergy', 'TechნPro', 'Atelier Boisé', 'Groupe Verdi'];
  let nDeal = 0;
  for (let i = 0; i < CLIENTS.length; i++) {
    const name = CLIENTS[i], ck = `email:contact@${slug(name)}.fr`;
    const Q = `Q${100 + i}`, O = `O${200 + i}`, F = `F${300 + i}`, P = `op_p${i}`;
    const lost = i % 5 === 4;          // 1/5 perdu (devis refusé)
    const paid = i % 3 !== 2;          // 1/3 impayé
    await ent('Party', 'organization', ck, name, 70, ['client'], { name }, 'dolibarr');
    await ent('Transaction', 'quote', `dolibarr:quote:${Q}`, `Devis ${name}`, 45, [], { number: Q, amount_total: String(1500 + i * 600) }, 'dolibarr');
    await rel(`dolibarr:quote:${Q}`, ck, 'party_of', 'client');
    await delta('dolibarr', 'accounting', 'quote', Q, '0', 45);
    await ent('Communication', 'email', `gmail:email:val_${i}`, `Validation devis ${name}`, 43, [], {}, 'gmail');
    await rel(`gmail:email:val_${i}`, ck, 'party_of', 'author');
    await delta('dolibarr', 'accounting', 'quote', Q, lost ? '3' : '2', 42);
    if (lost) { nDeal++; continue; }
    await ent('Transaction', 'order', `dolibarr:order:${O}`, `Commande ${name}`, 38, [], { number: O, amount_total: String(1500 + i * 600) }, 'dolibarr');
    await rel(`dolibarr:order:${O}`, ck, 'party_of', 'client'); await rel(`dolibarr:order:${O}`, `dolibarr:quote:${Q}`, 'derived_from', null);
    await delta('dolibarr', 'accounting', 'order', O, '0', 38); await delta('dolibarr', 'accounting', 'order', O, '1', 37); await delta('dolibarr', 'accounting', 'order', O, '3', 30);
    await ent('Project', 'project', `openproject:project:${P}`, `Projet ${name}`, 36, [], {}, 'openproject');
    await rel(`openproject:project:${P}`, ck, 'relates_to', 'client'); await rel(`openproject:project:${P}`, `dolibarr:order:${O}`, 'derived_from', null);
    await ent('Asset', 'folder', `nextcloud:folder:/Clients/${name}`, name, 36, [], { path: `/Clients/${name}` }, 'nextcloud');
    await rel(`nextcloud:folder:/Clients/${name}`, ck, 'relates_to', 'client');
    for (const [tn, dd] of [['Cadrage', 33], ['Production', 28], ['Livraison', 20]]) { const w = `wp_${i}_${tn}`; await ent('WorkItem', 'task', `openproject:work_package:${w}`, `${tn} ${name}`, dd, [], {}, 'openproject'); await rel(`openproject:work_package:${w}`, `openproject:project:${P}`, 'part_of', null); }
    await ent('Transaction', 'invoice', `dolibarr:customer_invoice:${F}`, `Facture ${F}`, 18, [], { number: F, amount_total: String(1500 + i * 600), state: paid ? 'payée' : 'émise', payment_state: paid ? 'payée' : 'impayée' }, 'dolibarr');
    await rel(`dolibarr:customer_invoice:${F}`, ck, 'party_of', 'billed_to'); await rel(`dolibarr:customer_invoice:${F}`, `dolibarr:order:${O}`, 'derived_from', null);
    await delta('dolibarr', 'accounting', 'customer_invoice', F, '0', 18); await delta('dolibarr', 'accounting', 'customer_invoice', F, '1', 16); if (paid) await delta('dolibarr', 'accounting', 'customer_invoice', F, '2', 7);
    nDeal++;
  }

  // ── EDGE CASES : doublons + anomalies de corrélation ──
  await ent('Party', 'organization', 'crm:party:dup1', 'ITBS Solution', 60, ['client'], {}, 'hubspot');         // doublon fuzzy cross-système d'ITBS Solutions
  await ent('Party', 'organization', 'dolibarr:party:dup2', 'JOLY FORMATIONS', 60, ['client'], {}, 'dolibarr');  // doublon casse de Joly Formations
  await ent('Project', 'project', 'dolibarr:project:dup3', 'Projet Cartonnage du Château', 36, [], {}, 'dolibarr'); // doublon projet
  await ent('Asset', 'folder', 'nextcloud:folder:/Divers/Cartonage Chateau', 'Cartonage Chateau', 6, [], { path: '/Divers/Cartonage Chateau' }, 'nextcloud'); // anomalie near-miss (faute de frappe)
  await ent('Asset', 'folder', 'nextcloud:folder:/Divers/Truc', 'Dossier sans rattachement', 6, [], { path: '/Divers/Truc' }, 'nextcloud'); // orphelin

  // ── SECTEUR FORMATION (sous-type DYNAMIQUE Event/formation_session) ──
  for (let i = 0; i < 3; i++) { const k = `digiforma:session:${i}`; await ent('Event', 'formation_session', k, `Session Sécurité ${i + 1}`, 20 - i * 5, [], { stagiaires: 8 + i * 3 }, 'digiforma'); await rel(k, `email:contact@${slug(CLIENTS[i])}.fr`, 'party_of', 'client'); }

  // ── SECTEUR INDUSTRIE : machines + OF + CAPTEURS (séries temporelles) ──
  const { recordMeasurement } = require('../src/radar/sensors');
  const machines = [['M1', 'Presse hydraulique'], ['M2', 'Découpe laser'], ['M3', 'Ligne assemblage']];
  for (const [id, label] of machines) await ent('Asset', 'machine', `sap_mes:machine:${id}`, label, 90, [], { status: 'running' }, 'sap_mes');
  for (let i = 0; i < 5; i++) { const of = `OF-${i}`; await ent('WorkItem', 'work_order', `sap_mes:work_order:${of}`, `OF ${of} – Carton ${i}`, 25 - i * 3, [], { quantity: 500 + i * 100, status: i < 3 ? 'in_production' : 'done' }, 'sap_mes'); await rel(`sap_mes:work_order:${of}`, `sap_mes:machine:M${(i % 3) + 1}`, 'references', null); }
  // séries capteurs : M1 température normale ; M2 température avec PIC (anomalie) ; M3 OEE en BAISSE (tendance)
  for (let h = 0; h < 24; h++) {
    await recordMeasurement(wsId, { assetKey: 'sap_mes:machine:M1', metric: 'temperature', value: 68 + (h % 3), unit: '°C', at: new Date(now - (24 - h) * 3600000), providerKey: 'sap_mes' });
    await recordMeasurement(wsId, { assetKey: 'sap_mes:machine:M2', metric: 'temperature', value: h === 18 ? 102 : 70 + (h % 2), unit: '°C', at: new Date(now - (24 - h) * 3600000), providerKey: 'sap_mes' });
    await recordMeasurement(wsId, { assetKey: 'sap_mes:machine:M3', metric: 'oee', value: Math.max(40, 88 - h * 1.4), unit: '%', at: new Date(now - (24 - h) * 3600000), providerKey: 'sap_mes' });
  }

  // ── HISTORIQUE pour entraîner le modèle de risque d'impayé ──
  for (let k = 0; k < 20; k++) { const big = k % 2 === 0; await ent('Transaction', 'invoice', `dolibarr:customer_invoice:H${k}`, `Facture H-${k}`, big ? 80 + k : 8 + k, [], { number: `H-${k}`, amount_total: String(big ? 4500 + k * 250 : 350 + k * 30), state: (big && k % 3 !== 0) ? 'annulée' : 'payée', payment_state: 'payée' }, 'dolibarr'); }
  const tr = await require('../src/radar/learning/payment-risk').trainPaymentRisk(wsId);

  // ── DÉRIVE de schéma : on pose l'ancien checksum sur le mapping, puis un snapshot
  // récent avec un CHAMP EN PLUS → la dérive doit être détectée.
  const { schemaChecksum } = require('../src/radar/graph/mapping');
  await require('../src/db/models/radar-mapping.model').updateOne({ providerKey: 'dolibarr', rawEntityType: 'customer_invoice', workspaceId: null }, { $set: { checksum: schemaChecksum({ id: 1, ref: 'x', total_ttc: '2', date: 1, statut: '1', paye: '0', socid: '1' }) } });
  await RadarSnapshot.create({ workspaceId: wsId, connectorId: conn.dolibarr._id, family: 'accounting', entityType: 'customer_invoice', entityKey: 'DRIFT', contentHash: 'h', data: { id: 'D', ref: 'D', total_ttc: '9', date: 1, statut: '1', paye: '0', socid: '1', NOUVEAU_CHAMP_2026: 'x' }, firstSeenAt: new Date(), lastSeenAt: new Date() });

  // ── Corrélation + récap ──
  const corr = await require('../src/radar/graph/correlate').correlateByName(wsId, {});
  const sum = await require('../src/radar/graph/query').graphSummary(wsId);
  const dups = await require('../src/radar/duplicates').findDuplicates(wsId);
  const procs = await require('../src/radar/process/cross-miner').mineCrossProcess(wsId, {});
  const sensors = (await require('../src/radar/sensors').analyzeSensors(wsId)).filter(s => s.alert);
  const drift = await require('../src/radar/graph/drift').detectDrift(wsId);
  console.log(`\n[rich] ✅ ${nDeal} affaires · GRAPHE ${sum.entities} entités / ${sum.relations} relations`);
  console.log('[rich]   types :', sum.byType.map(b => `${b.subtype || b.coreType}×${b.count}`).join(', '));
  console.log(`[rich] corrélation ${corr.matched}/${corr.scanned} · doublons ${dups.length} · processus cross ${procs.cases} cas`);
  console.log(`[rich] modèle risque impayé : ${tr.status}${tr.accuracy != null ? ' ' + Math.round(tr.accuracy * 100) + '%' : ''} · alertes capteurs ${sensors.length} (${sensors.map(s => s.metric).join(',')}) · dérive ${drift.length}`);
  await mongoose.disconnect();
}
function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
main().catch(e => { console.error('[rich] ERREUR:', e); process.exit(1); });
