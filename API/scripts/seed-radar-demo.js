#!/usr/bin/env node
// Seed de démonstration du Radar : recrée les connecteurs Dolibarr (collecte
// réelle), simule des emails (analyse sans vrais credentials), et fabrique
// quelques transitions d'état pour alimenter le process mining.
//
//   node scripts/seed-radar-demo.js
//
// Idempotent : ré-exécutable. Ne touche qu'au workspace du credential Dolibarr.

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Charge .env sans dépendance (dotenv non garanti).
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB = process.env.MONGO_DB_NAME || 'homeport';

async function main() {
  await mongoose.connect(MONGO_URL + DB, { serverSelectionTimeoutMS: 4000 });
  console.log(`[seed] connecté à ${DB}`);

  const Provider = require('../src/db/models/provider.model');
  const Credential = require('../src/db/models/credential.model');
  const RadarConnector = require('../src/db/models/radar-connector.model');
  const RadarSnapshot = require('../src/db/models/radar-snapshot.model');
  const RadarDelta = require('../src/db/models/radar-delta.model');
  const RadarEntity = require('../src/db/models/radar-entity.model');
  const { checksumJSON } = require('../src/utils/checksum');
  const { newId } = require('../src/utils/ids');
  const { collectConnector } = require('../src/radar/collector');
  const { linkConnector } = require('../src/radar/graph/linker');
  const { purgeConnectorData } = require('../src/radar/cleanup');
  const { seedOntologyTypes } = require('../src/radar/graph/ontology-seed');
  const { seedDolibarrMappings } = require('../src/radar/graph/mappings-dolibarr');
  const { seedEmailMappings } = require('../src/radar/graph/mappings-email');
  const { seedExtraMappings } = require('../src/radar/graph/mappings-extra');
  const { generateEmails } = require('../src/radar/graph/simulate-email');
  const { generateNextcloud, generateOpenProject } = require('../src/radar/graph/simulate-apps');
  const { correlateByName } = require('../src/radar/graph/correlate');
  const graph = require('../src/radar/graph/query');
  const { mineProcesses } = require('../src/radar/process/miner');
  const { registry } = require('../src/plugins/registry');

  // 1) Seeds (ontologie + mappings)
  console.log(`[seed] ontologie: ${await seedOntologyTypes()} types | mappings dolibarr: ${await seedDolibarrMappings()}, email: ${await seedEmailMappings()}, extra(nc/op): ${await seedExtraMappings()}`);

  // 2) Registry (handlers de plugins)
  await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null);

  // 3) Credential Dolibarr → workspace cible
  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { console.error('[seed] AUCUN credential dolibarr — abandon.'); await mongoose.disconnect(); process.exit(1); }
  const wsId = cred.workspaceId;
  console.log(`[seed] workspace cible: ${wsId}`);

  // 4) Provider.radar = bloc du manifest (avec les watch) — comme le ferait l'import
  const manifest = require('../src/plugins/repos/dolibarr/manifest.json');
  const dolibarrRadar = manifest.providers[0].radar;
  await Provider.updateOne({ key: 'dolibarr' }, { $set: { radar: dolibarrRadar } });
  console.log('[seed] Provider dolibarr.radar mis à jour (watch activées)');

  // 4.5) Créer des factures de démo dans Dolibarr (liées à un projet + autonomes),
  // en valider une partie (brouillon → émise) pour nourrir graphe + process mining.
  const { decrypt } = require('../src/utils/enc');
  const dolOpts = { credentials: decrypt(cred.secret), log: () => {} };
  const callDol = async (key, args) => { const fn = registry.resolve(key); return fn ? fn({ id: 't', model: {} }, { payload: {} }, args, dolOpts) : { ok: false, error: 'no_handler' }; };
  const arrOf = (r) => Array.isArray(r?.data) ? r.data : (Object.values(r || {}).find(v => Array.isArray(v)) || []);
  const idOf = (r) => r && (r.id || r.rowid || (r.data && (r.data.id || r.data)));
  {
    const inv = arrOf(await callDol('dolibarr_invoices_list', { limit: 50 }));
    if (inv.length >= 6) {
      console.log(`[seed] ${inv.length} factures déjà présentes — pas de création`);
    } else {
      const clients = arrOf(await callDol('dolibarr_thirdparties_list', { limit: 30 })).filter(t => String(t.client) === '1');
      const projects = arrOf(await callDol('dolibarr_projects_list', { limit: 20 }));
      const now = Math.floor(Date.now() / 1000);
      let made = 0, validated = 0;
      for (let i = 0; i < 8 && clients.length; i++) {
        const c = clients[i % clients.length];
        const linked = i % 2 === 0 && projects.length;
        const args = { socid: c.id, type: 0, date: now - i * 86400, note_public: linked ? 'Facture liée à un projet' : 'Facture autonome' };
        if (linked) args.fk_project = projects[i % projects.length].id;
        const r = await callDol('dolibarr_invoice_create', args);
        const id = idOf(r);
        if (r.ok && id) { made++; if (i % 3 !== 0) { const v = await callDol('dolibarr_invoice_validate', { id }); if (v.ok) validated++; } }
      }
      console.log(`[seed] factures créées : ${made} (dont ${validated} validées/émises, alternance liée projet / autonome)`);
    }
  }

  // 5) Connecteurs Dolibarr par famille (celles qui ont des watch) → collecte + graphe
  const families = ['accounting', 'crm', 'productivity', 'support'];
  for (const family of families) {
    let c = await RadarConnector.findOne({ workspaceId: wsId, providerKey: 'dolibarr', family });
    if (c) { await purgeConnectorData(c); }     // repart propre
    else {
      c = await RadarConnector.create({
        workspaceId: wsId, family, providerKey: 'dolibarr', credentialId: cred._id,
        label: `Dolibarr (${family})`, status: 'active',
      });
    }
    c.baselineDoneAt = undefined; // force baseline
    const sum = await collectConnector(c, { log: () => {} });
    const link = await linkConnector(c, { log: () => {} });
    const snaps = await RadarSnapshot.countDocuments({ workspaceId: wsId, connectorId: c._id });
    console.log(`[seed] dolibarr/${family}: ${snaps} snapshots, +${link.entities.created} entités, ${link.relations} relations${sum.errors.length ? ' | err: ' + sum.errors.join(', ') : ''}`);
  }

  // 6) Emails simulés : reliés aux tiers connus par leur adresse
  const partyEmails = (await RadarEntity.find({ workspaceId: wsId, coreType: 'Party', canonicalKey: /^email:/ })
    .select('canonicalKey').limit(8).lean()).map(e => e.canonicalKey.replace(/^email:/, ''));
  let mail = await RadarConnector.findOne({ workspaceId: wsId, providerKey: 'gmail', family: 'email' });
  if (mail) { await purgeConnectorData(mail); }
  else { mail = await RadarConnector.create({ workspaceId: wsId, family: 'email', providerKey: 'gmail', label: 'Emails (simulation)', status: 'active' }); }
  const emails = generateEmails({ partyEmails, now: new Date() });
  for (const e of emails) {
    await RadarSnapshot.create({
      workspaceId: wsId, connectorId: mail._id, family: 'email', entityType: 'email',
      entityKey: e.id, contentHash: checksumJSON(e), data: e, firstSeenAt: new Date(), lastSeenAt: new Date(),
    });
  }
  const mailLink = await linkConnector(mail, { log: () => {} });
  console.log(`[seed] emails simulés: ${emails.length} (dont ${partyEmails.length} de clients connus) → +${mailLink.entities.created} entités, ${mailLink.relations} relations vers les tiers`);

  // 6 bis) Nextcloud simulé : arborescence /Clients/<nom>/… nommée d'après les clients
  const clientNames = (await RadarEntity.find({ workspaceId: wsId, coreType: 'Party', roles: 'client' }).select('label').limit(6).lean()).map(e => e.label);
  const seedSim = async (providerKey, family, records, bornAt) => {
    let conn = await RadarConnector.findOne({ workspaceId: wsId, providerKey, family });
    if (conn) await purgeConnectorData(conn);
    else conn = await RadarConnector.create({ workspaceId: wsId, family, providerKey, label: `${providerKey} (simulation)`, status: 'active' });
    for (const rec of records) {
      const entityKey = String(rec.path || rec.id);
      await RadarSnapshot.updateOne(
        { connectorId: conn._id, entityType: rec._t, entityKey },
        { $set: { workspaceId: wsId, family, contentHash: checksumJSON(rec), data: rec, lastSeenAt: new Date() }, $setOnInsert: { firstSeenAt: new Date() } },
        { upsert: true }
      );
    }
    const res = await linkConnector(conn, { log: () => {} });
    // timestamps réalistes : ces éléments sont créés APRÈS le cycle Dolibarr
    if (bornAt) await RadarEntity.updateMany({ workspaceId: wsId, 'sources.connectorId': conn._id }, { $set: { firstSeenAt: bornAt } });
    return res;
  };
  const fewDaysAgo = (d) => new Date(Date.now() - d * 86400000);
  const nc = generateNextcloud({ clientNames, now: new Date() });
  const ncRecs = [...nc.folders.map(f => ({ ...f, _t: 'folder' })), ...nc.files.map(f => ({ ...f, _t: 'file' }))];
  const ncLink = await seedSim('nextcloud', 'storage', ncRecs, fewDaysAgo(4));   // dossiers créés après le cycle
  console.log(`[seed] Nextcloud simulé: ${nc.folders.length} dossiers + ${nc.files.length} fichiers → +${ncLink.entities.created} entités`);

  const op = generateOpenProject({ clientNames, now: new Date() });
  const opRecs = [...op.projects.map(p => ({ ...p, _t: 'project' })), ...op.workPackages.map(w => ({ ...w, _t: 'work_package' }))];
  const opLink = await seedSim('openproject', 'productivity', opRecs, fewDaysAgo(3));
  console.log(`[seed] OpenProject simulé: ${op.projects.length} projets + ${op.workPackages.length} tâches → +${opLink.entities.created} entités`);

  // 6 ter) CORRÉLATION cross-logiciel : relier dossiers/projets aux clients par nom
  const corr = await correlateByName(wsId, {});
  console.log(`[seed] corrélation cross-logiciel: ${corr.matched} entités reliées à un client par nom (+${corr.created} relations)`);

  // 7) Transitions d'état pour le process mining (cycle de vie réel reconstruit) :
  // factures (acc), devis + commandes (crm). 1/3 « négatif » (annulé/non signé).
  const accConn = await RadarConnector.findOne({ workspaceId: wsId, providerKey: 'dolibarr', family: 'accounting' });
  const crmConn = await RadarConnector.findOne({ workspaceId: wsId, providerKey: 'dolibarr', family: 'crm' });
  const day = 86400000; const now = Date.now();
  const lifecycles = [
    { entityType: 'customer_invoice', conn: accConn, ok: ['0', '1', '2'], ko: ['0', '1', '3'] },
    { entityType: 'quote', conn: crmConn, ok: ['0', '1', '2'], ko: ['0', '1', '3'] },
    { entityType: 'order', conn: crmConn, ok: ['0', '1', '2', '3'], ko: ['0', '1', '-1'] },
  ];
  let deltaN = 0;
  for (const lc of lifecycles) {
    if (!lc.conn) continue;
    const snaps = await RadarSnapshot.find({ workspaceId: wsId, entityType: lc.entityType }).limit(8).lean();
    for (let k = 0; k < snaps.length; k++) {
      const s = snaps[k];
      const seq = k % 3 === 0 ? lc.ko : lc.ok;
      for (let i = 0; i < seq.length; i++) {
        await RadarDelta.create({
          id: newId('rdl'), workspaceId: wsId, connectorId: lc.conn._id, family: lc.conn.family,
          entityType: lc.entityType, entityKey: s.entityKey, type: i === 0 ? 'created' : 'updated',
          after: { ...s.data, statut: seq[i] }, occurredAt: new Date(now - (seq.length - i) * 6 * day), status: 'consumed',
        }); deltaN++;
      }
      // l'entité « naît » au début de son cycle (pour l'ordre chronologique cross-process)
      await RadarEntity.updateOne(
        { workspaceId: wsId, canonicalKey: `dolibarr:${lc.entityType}:${s.entityKey}` },
        { $set: { firstSeenAt: new Date(now - seq.length * 6 * day) } }
      );
    }
  }
  console.log(`[seed] ${deltaN} deltas de cycle de vie créés (factures + devis + commandes)`);

  // 8) Récap
  const summary = await graph.graphSummary(wsId);
  const procs = await mineProcesses(wsId);
  console.log(`\n[seed] ✅ GRAPHE : ${summary.entities} entités, ${summary.relations} relations`);
  console.log(`[seed]    types : ${summary.byType.map(b => b.coreType + '.' + (b.subtype || '') + '×' + b.count).join(', ')}`);
  console.log(`[seed] ✅ PROCESSUS : ${procs.length} découvert(s)`);
  for (const p of procs) console.log(`[seed]    ${p.coreType}.${p.subtype} : ${p.entityCount} cas, variantes ${p.variants.map(v => v.sequence + '(' + v.count + ')').join(' | ')}`);

  await mongoose.disconnect();
  console.log('[seed] terminé.');
}

main().catch(e => { console.error('[seed] ERREUR:', e); process.exit(1); });
