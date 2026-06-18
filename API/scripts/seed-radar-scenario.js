#!/usr/bin/env node
// Scénario d'affaire RÉALISTE & cohérent, par client, cross-logiciel — pour que le
// process mining montre le vrai enchaînement métier :
//   Devis créé → Email de validation → Devis signé → Commande → (Projet OpenProject
//   ∥ Dossier Nextcloud) → Tâches → Facture créée → émise → payée.
// Insère directement entités + relations + deltas (timestamps maîtrisés). Idempotent.
//
//   node scripts/seed-radar-scenario.js

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const DAY = 86400000;

async function main() {
  await mongoose.connect((process.env.MONGO_URL || 'mongodb://localhost:27017/') + (process.env.MONGO_DB_NAME || 'homeport'));
  const Credential = require('../src/db/models/credential.model');
  const RadarConnector = require('../src/db/models/radar-connector.model');
  const RadarEntity = require('../src/db/models/radar-entity.model');
  const RadarRelation = require('../src/db/models/radar-relation.model');
  const RadarDelta = require('../src/db/models/radar-delta.model');
  const { newId } = require('../src/utils/ids');
  const { seedDolibarrMappings } = require('../src/radar/graph/mappings-dolibarr');
  const { seedEmailMappings } = require('../src/radar/graph/mappings-email');
  const { seedExtraMappings } = require('../src/radar/graph/mappings-extra');
  const { mineCrossProcess } = require('../src/radar/process/cross-miner');

  await seedDolibarrMappings(); await seedEmailMappings(); await seedExtraMappings();
  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { console.error('pas de credential dolibarr'); process.exit(1); }
  const wsId = cred.workspaceId;

  // Table rase du graphe de ce workspace pour une démo cohérente (snapshots des
  // connecteurs réels conservés ; on reconstruit un graphe propre, scénarisé).
  await RadarEntity.deleteMany({ workspaceId: wsId });
  await RadarRelation.deleteMany({ workspaceId: wsId });
  await RadarDelta.deleteMany({ workspaceId: wsId });
  console.log('[scenario] graphe du workspace purgé (table rase)');

  // connecteurs (un par logiciel) pour résoudre les deltas → providerKey
  const conn = {};
  for (const [providerKey, family] of [['dolibarr', 'accounting'], ['gmail', 'email'], ['openproject', 'productivity'], ['nextcloud', 'storage']]) {
    // 'paused' : connecteurs de SCÉNARIO (données simulées) — le scheduler ne les
    // collecte pas (évite provider_not_found ; les vrais connecteurs sont à part).
    conn[providerKey] = await RadarConnector.findOneAndUpdate(
      { workspaceId: wsId, providerKey, family },
      { $set: { status: 'paused' }, $setOnInsert: { workspaceId: wsId, providerKey, family, label: `${providerKey} (scénario)` } },
      { upsert: true, new: true });
  }

  const now = Date.now();
  const ent = (coreType, subtype, key, label, dAgo, roles = [], attrs = {}) => RadarEntity.updateOne(
    { workspaceId: wsId, canonicalKey: key },
    { $set: { coreType, subtype, label, roles, attributes: attrs }, $setOnInsert: { firstSeenAt: new Date(now - dAgo * DAY), lastSeenAt: new Date() } },
    { upsert: true });
  const rel = (from, to, type, role) => RadarRelation.updateOne(
    { workspaceId: wsId, fromKey: from, toKey: to, type, role: role || null },
    { $set: { confidence: 1, source: 'rule' } }, { upsert: true });
  const delta = (providerKey, family, entityType, entityKey, statut, dAgo) => RadarDelta.updateOne(
    { id: `scn_${entityKey}_${statut}` },
    { $set: { workspaceId: wsId, connectorId: conn[providerKey]._id, family, entityType, entityKey, type: statut === '0' ? 'created' : 'updated', after: { statut }, occurredAt: new Date(now - dAgo * DAY), status: 'consumed' } },
    { upsert: true });

  // 3 affaires cohérentes (clients). La 3e dérape (devis refusé) → variante négative.
  const DEALS = [
    { name: 'Cartonnage du Château', mail: 'contact@cartonnage-chateau.fr', happy: true },
    { name: 'Joly Formations', mail: 'direction@joly-formations.fr', happy: true },
    { name: 'ITBS', mail: 'christophe.royen@it-bs.fr', happy: true },
    { name: 'ADSTRAT', mail: 'contact@adstrat.fr', happy: true, paid: false },   // facture en attente
    { name: 'BIOFORCE', mail: 'achats@bioforce.fr', happy: true, paid: false },  // facture en attente
    { name: 'SAMA Conseil', mail: 'direction@sama-conseil.fr', happy: true },
    { name: 'SFR Business', mail: 'compte.pro@sfr-business.fr', happy: false },
    { name: 'EDF Pro', mail: 'marche.public@edf-pro.fr', happy: false },
  ];

  for (let i = 0; i < DEALS.length; i++) {
    const d = DEALS[i];
    const ck = `email:${d.mail}`;
    const Q = `Q${100 + i}`, O = `O${200 + i}`, F = `F${300 + i}`, P = `op_p${i}`;
    await ent('Party', 'organization', ck, d.name, 60, ['client']);

    // 1) Devis créé → 2) Email de validation → 3) Devis signé/refusé
    await ent('Transaction', 'quote', `dolibarr:quote:${Q}`, `Devis ${Q}`, 40);
    await rel(`dolibarr:quote:${Q}`, ck, 'party_of', 'client');
    await delta('dolibarr', 'accounting', 'quote', Q, '0', 40);
    await ent('Communication', 'email', `gmail:email:mail_val_${i}`, `Validation du devis ${Q}`, 38);
    await rel(`gmail:email:mail_val_${i}`, ck, 'party_of', 'author');
    await delta('dolibarr', 'accounting', 'quote', Q, d.happy ? '2' : '3', 37); // signé / refusé

    if (!d.happy) continue; // affaire perdue : pas de suite

    // 4) Commande
    await ent('Transaction', 'order', `dolibarr:order:${O}`, `Commande ${O}`, 35);
    await rel(`dolibarr:order:${O}`, ck, 'party_of', 'client');
    await rel(`dolibarr:order:${O}`, `dolibarr:quote:${Q}`, 'derived_from', null);
    await delta('dolibarr', 'accounting', 'order', O, '0', 35);
    await delta('dolibarr', 'accounting', 'order', O, '1', 34);

    // 5) Projet (OpenProject) ∥ Dossier (Nextcloud) — DÉCOULENT du devis signé / de la commande
    await ent('Project', 'project', `openproject:project:${P}`, `Projet ${d.name}`, 34);
    await rel(`openproject:project:${P}`, ck, 'relates_to', 'client');
    await rel(`openproject:project:${P}`, `dolibarr:order:${O}`, 'derived_from', null);   // projet issu de la commande
    await rel(`openproject:project:${P}`, `dolibarr:quote:${Q}`, 'derived_from', null);   // … donc du devis signé
    await ent('Asset', 'folder', `nextcloud:folder:/Clients/${d.name}`, d.name, 34);
    await rel(`nextcloud:folder:/Clients/${d.name}`, ck, 'relates_to', 'client');
    await rel(`nextcloud:folder:/Clients/${d.name}`, `openproject:project:${P}`, 'part_of', null); // dossier du projet

    // 6) Tâches du projet
    for (const [tname, dd] of [['Cadrage', 30], ['Production', 26], ['Livraison', 20]]) {
      const wk = `wp_${i}_${tname}`;
      await ent('WorkItem', 'task', `openproject:work_package:${wk}`, `${tname} ${d.name}`, dd);
      await rel(`openproject:work_package:${wk}`, `openproject:project:${P}`, 'part_of', null);
      await rel(`openproject:work_package:${wk}`, ck, 'relates_to', 'client');
    }

    // 7) Facture créée → émise → (payée ou EN ATTENTE de paiement selon l'affaire)
    const montant = 1800 + i * 950;
    const paid = d.paid !== false;
    await ent('Transaction', 'invoice', `dolibarr:customer_invoice:${F}`, `Facture ${F}`, 18, [],
      { number: F, amount_total: String(montant), state: paid ? 'payée' : 'émise', payment_state: paid ? 'payée' : 'impayée' });
    await rel(`dolibarr:customer_invoice:${F}`, ck, 'party_of', 'billed_to');
    await rel(`dolibarr:customer_invoice:${F}`, `dolibarr:order:${O}`, 'derived_from', null);
    await delta('dolibarr', 'accounting', 'customer_invoice', F, '0', 18);
    await delta('dolibarr', 'accounting', 'customer_invoice', F, '1', 16);
    if (paid) await delta('dolibarr', 'accounting', 'customer_invoice', F, '2', 8);  // sinon reste « émise » (impayée)
  }

  // Dossier mal nommé À LA MAIN (faute de frappe) et NON rattaché → anomalie à détecter
  await ent('Asset', 'folder', 'nextcloud:folder:/Divers/Cartonage Chateau', 'Cartonage Chateau', 6);

  // Historique de factures RÉSOLUES (payées / annulées) pour ENTRAÎNER le modèle de
  // risque d'impayé : tendance « gros montant + ancien → plus de risque d'annulation ».
  for (let k = 0; k < 18; k++) {
    const big = k % 2 === 0;
    const amt = big ? 4200 + k * 260 : 280 + k * 35;
    const aged = big ? 80 + k : 8 + k;
    const state = (big && k % 3 !== 0) ? 'annulée' : 'payée';
    await ent('Transaction', 'invoice', `dolibarr:customer_invoice:H${k}`, `Facture H-${k}`, aged, [],
      { number: `H-${k}`, amount_total: String(amt), state, payment_state: state === 'payée' ? 'payée' : 'impayée' });
  }
  const tr = await require('../src/radar/learning/payment-risk').trainPaymentRisk(wsId);
  console.log(`[scenario] modèle risque d'impayé : ${tr.status}${tr.accuracy != null ? ' (précision ' + Math.round(tr.accuracy * 100) + '%, ' + tr.examples + ' exemples)' : ' (' + tr.examples + ' exemples)'}`);

  const res = await mineCrossProcess(wsId, {});
  console.log(`[scenario] ✅ ${res.cases} affaires (clients)`);
  console.log('[scenario] PARCOURS dominant :');
  console.log('   ' + (res.variants[0]?.sequence || '—'));
  console.log('[scenario] ACTIONS PARALLÈLES :', res.parallels.slice(0, 4).map(p => p.activities.join(' ∥ ') + '×' + p.count).join('  |  '));
  await mongoose.disconnect();
}
main().catch(e => { console.error('[scenario] ERREUR:', e); process.exit(1); });
