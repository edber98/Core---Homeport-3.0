#!/usr/bin/env node
// REMISE À ZÉRO + connecteurs RÉELS uniquement (zéro simulation).
// Purge tout le radar du workspace, puis crée de vrais connecteurs sur les vrais
// credentials (Dolibarr, OpenProject, Nextcloud Files), collecte le réel, construit
// le graphe et corrèle. Aucune donnée simulée.
//
//   node scripts/seed-radar-real.js

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

async function main() {
  await mongoose.connect((process.env.MONGO_URL || 'mongodb://localhost:27017/') + (process.env.MONGO_DB_NAME || 'homeport'));
  const Provider = require('../src/db/models/provider.model');
  const Credential = require('../src/db/models/credential.model');
  const RadarConnector = require('../src/db/models/radar-connector.model');
  const M = (n) => require(`../src/db/models/${n}`);
  const { registry } = require('../src/plugins/registry');
  await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null);
  await require('../src/radar/graph/mappings-dolibarr').seedDolibarrMappings();
  await require('../src/radar/graph/mappings-email').seedEmailMappings();
  await require('../src/radar/graph/mappings-extra').seedExtraMappings();

  const dolCred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!dolCred) { console.error('pas de credential dolibarr'); process.exit(1); }
  const wsId = dolCred.workspaceId;

  // ── PURGE TOTALE du radar de ce workspace ──
  for (const n of ['radar-connector.model', 'radar-snapshot.model', 'radar-delta.model', 'radar-entity.model', 'radar-relation.model', 'radar-model.model', 'radar-signal.model']) {
    try { const r = await M(n).deleteMany({ workspaceId: wsId }); if (r.deletedCount) console.log(`[real] purge ${n}: ${r.deletedCount}`); } catch {}
  }
  console.log('[real] ✅ radar purgé — on repart de 0');

  // ── Provider.radar RÉELS (avec watch) ──
  const dolibarrManifest = require('../src/plugins/repos/dolibarr/manifest.json');
  await Provider.updateOne({ key: 'dolibarr' }, { $set: { radar: dolibarrManifest.providers[0].radar } });
  await Provider.updateOne({ key: 'openproject' }, { $set: { radar: [{
    family: 'productivity',
    capabilities: { listProjects: { template: 'list_openproject_projects' }, listTasks: { template: 'list_openproject_tasks' }, createTask: { template: 'add_openproject_task' } },
    watch: [
      { entity: 'project', via: 'listProjects', key: 'id', hashFields: ['name', 'status', 'description'] },
      { entity: 'work_package', via: 'listTasks', key: 'id', hashFields: ['subject', 'status', 'project', 'dueDate'] },
    ],
  }] } });
  // nextcloudFiles a déjà son bloc watch (entity 'file')

  // ── Connecteurs RÉELS ──
  const credOf = {};
  for (const k of ['dolibarr', 'openproject', 'nextcloudFiles', 'smtp_imap']) credOf[k] = await Credential.findOne({ providerKey: k }).lean();
  const plan = [
    ['dolibarr', 'accounting'], ['dolibarr', 'crm'], ['dolibarr', 'productivity'], ['dolibarr', 'support'], ['dolibarr', 'catalog'],
    ['openproject', 'productivity'],
    ['nextcloudFiles', 'storage'],
    ['smtp_imap', 'email'],     // emails RÉELS (boîte perso) — floutent souvent, mais ajoutent la dimension réelle
  ];
  const { collectConnector } = require('../src/radar/collector');
  const { linkConnector } = require('../src/radar/graph/linker');
  for (const [providerKey, family] of plan) {
    if (!credOf[providerKey]) { console.log(`[real] ${providerKey}: pas de credential, ignoré`); continue; }
    const c = await RadarConnector.create({ workspaceId: wsId, family, providerKey, credentialId: credOf[providerKey]._id, label: `${providerKey} (${family})`, status: 'active' });
    const sum = await collectConnector(c, { log: () => {} });
    const link = await linkConnector(c, { log: () => {} });
    const snaps = await M('radar-snapshot.model').countDocuments({ connectorId: c._id });
    console.log(`[real] ${providerKey}/${family}: ${snaps} obs, +${link.entities.created} entités, ${link.relations} rel${sum.errors.length ? ' | err: ' + sum.errors.join(', ') : ''}`);
  }

  // ── Cycle de vie RÉEL : reconstitué depuis les timestamps Dolibarr ──
  const lc = await require('../src/radar/process/backfill-lifecycle').backfillDolibarrLifecycle(wsId);
  console.log(`[real] cycle de vie reconstitué : ${lc.deltas} deltas datés`, lc.byType);

  // ── Typage sémantique (secteur client, nature projet, catégorie facture) ──
  const cls = await require('../src/radar/graph/classify').classifyWorkspace(wsId);
  console.log(`[real] typage sémantique : ${cls.classified} entités typées`, JSON.stringify(cls.byType));

  // ── Corrélation cross-logiciel par nom ──
  const corr = await require('../src/radar/graph/correlate').correlateByName(wsId, {});
  console.log(`[real] corrélation: ${corr.matched}/${corr.scanned} reliées`);

  // ── Déduplication auto des quasi-identiques (≥95%) : nettoie le bruit (re-créations) ──
  // En boucle (les fusions révèlent de nouveaux doublons) jusqu'à épuisement.
  const { mergeEntities } = require('../src/radar/actions');
  let deduped = 0;
  for (let round = 0; round < 6; round++) {
    const dups = await require('../src/radar/duplicates').findDuplicates(wsId, { limit: 400 });
    const strong = dups.filter(d => d.similarity >= 95);
    if (!strong.length) break;
    for (const d of strong) { await mergeEntities(wsId, d.a.key, d.b.key).catch(() => {}); deduped++; }
  }
  console.log(`[real] déduplication : ${deduped} doublons quasi-identiques fusionnés`);

  // ── Couche communication (emails simulés) reliée aux vraies affaires ──
  const comms = await require('../src/radar/graph/seed-comms').seedSimulatedComms(wsId);
  console.log(`[real] emails simulés : ${comms.emails} (validation devis, envoi/relance facture) — ${comms.relations} liens`);

  // ── Chaîne d'affaire : devis→commande→facture reliés directement (par articles/montant) ──
  const dc = await require('../src/radar/graph/deal-chains').inferDealChains(wsId);
  console.log(`[real] chaînes d'affaire : ${dc.linked} liens devis→commande→facture (${dc.byClient} clients)`);

  // ── Identité cross-source : projets présents dans Dolibarr ET OpenProject → 1 entité ──
  const xsP = await require('../src/radar/graph/cross-source').resolveCrossSource(wsId, { coreType: 'Project', subtype: 'project' });
  console.log(`[real] projets multi-sources : ${xsP.merged} fusionnés, ${xsP.suggestions.length} suggestions (sur ${xsP.scanned})`);
  if (xsP.mergedDetail?.length) console.log('   ex:', xsP.mergedDetail.slice(0, 4).map(m => `${m.label}(${m.similarity}%${m.sameClient ? ',client✓' : ''})`).join(' · '));

  // ── Processus découverts (vérif) ──
  const procs = await require('../src/radar/process/miner').mineProcesses(wsId);
  console.log(`[real] processus (cycle de vie) : ${procs.map(p => `${p.subtype} ${p.entityCount}cas/${p.transitions.length}trans`).join(', ') || 'aucun'}`);
  const cross = await require('../src/radar/process/cross-miner').mineCrossProcess(wsId, {});
  console.log(`[real] cross-logiciel : ${cross.cases} cas, ${cross.transitions.length} transitions, ${cross.parallels.length} parallèles`);

  const sum = await require('../src/radar/graph/query').graphSummary(wsId);
  console.log(`\n[real] ✅ GRAPHE RÉEL : ${sum.entities} entités, ${sum.relations} relations`);
  console.log('[real]   ', sum.byType.map(b => `${b.coreType}.${b.subtype || ''}×${b.count}`).join(', '));
  await mongoose.disconnect();
}
main().catch(e => { console.error('[real] ERREUR:', e); process.exit(1); });
