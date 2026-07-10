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
  // nextcloudFiles a déjà son bloc watch (entity 'file'). On relève profondeur+plafond
  // pour atteindre l'arbo de démo /RadarDemo/Clients/<client>/Devis/… (profondeur 5)
  // tout en gardant les fichiers réels. Configurable (RADAR_NC_DEPTH / RADAR_NC_MAX).
  {
    const ncP = await Provider.findOne({ key: 'nextcloudFiles' }).lean();
    if (ncP?.radar?.[0]?.capabilities?.listTree?.args) {
      const r = ncP.radar;
      r[0].capabilities.listTree.args.maxDepth = Number(process.env.RADAR_NC_DEPTH || 6);
      r[0].capabilities.listTree.args.maxItems = Number(process.env.RADAR_NC_MAX || 1500);
      await Provider.updateOne({ key: 'nextcloudFiles' }, { $set: { radar: r } });
    }
  }

  // ── Connecteurs RÉELS ──
  const credOf = {};
  for (const k of ['dolibarr', 'openproject', 'nextcloudFiles', 'smtp_imap']) credOf[k] = await Credential.findOne({ providerKey: k }).lean();
  const plan = [
    ['dolibarr', 'accounting'], ['dolibarr', 'crm'], ['dolibarr', 'productivity'], ['dolibarr', 'support'], ['dolibarr', 'catalog'], ['dolibarr', 'industry'], ['dolibarr', 'calendar'],
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

  // ── Couches SIMULÉES (équipe + emails). Séparables : RADAR_SIMULATE=0 → 100% réel.
  // Ce ne sont QUE des données ; les moteurs d'analyse restent dynamiques et tournent
  // sur le réel. À couper dès que tu as de vrais emails/utilisateurs connectés.
  const SIMULATE = process.env.RADAR_SIMULATE !== '0';
  if (SIMULATE) {
    const team = await require('../src/radar/people').seedTeamAndAssign(wsId);
    const wl = await require('../src/radar/people').workloadStats(wsId);
    console.log(`[real] [SIM] équipe : ${team.team} personnes · ${team.assigned} affectations · charge: ${wl.byPerson.map(p => `${p.person}(${p.open})`).join(', ')}`);
    // machines d'atelier + capteurs (température/OEE) reliés à la production réelle
    const mac = await require('../src/radar/graph/seed-machines').seedMachinesAndSensors(wsId);
    console.log(`[real] [SIM] atelier : ${mac.machines} machines · ${mac.relations} liens production · ${mac.measurements} mesures capteurs`);
    const sens = await require('../src/radar/sensors').analyzeSensors(wsId);
    const alerts = sens.filter(s => s.alert);
    console.log(`[real] [SIM] capteurs analysés : ${sens.length} séries · ${alerts.length} alerte(s)${alerts.length ? ' → ' + alerts.map(a => `${a.assetKey.split(':').pop()}/${a.metric}`).join(', ') : ''}`);
  } else {
    console.log('[real] RADAR_SIMULATE=0 → couches simulées (équipe/emails) DÉSACTIVÉES, 100% données réelles.');
  }

  // ── Passe ADAPTATIVE (R3) : ré-entraîne les modèles + dérive de schéma + re-type ──
  const ad = await require('../src/radar/adapt').runAdaptivePass(wsId, { log: () => {} });
  console.log(`[real] adaptatif : modèle risque=${ad.model?.status}${ad.model?.accuracy != null ? ' ' + Math.round(ad.model.accuracy * 100) + '%' : ''} · dérive=${ad.drift.length} · ${ad.reclassified} entités typées`);

  // ── Corrélation cross-logiciel par nom ──
  const corr = await require('../src/radar/graph/correlate').correlateByName(wsId, {});
  console.log(`[real] corrélation: ${corr.matched}/${corr.scanned} reliées`);
  // fichiers/dossiers (arborescence projet) → projets par nom
  const corrP = await require('../src/radar/graph/correlate').correlateFilesToProjects(wsId, {});
  console.log(`[real] fichiers→projets: ${corrP.matched}/${corrP.scanned} (+${corrP.created})`);
  // fichiers PDF nommés d'après une réf → reliés à la VRAIE pièce (devis/commande/facture)
  const corrD = await require('../src/radar/graph/correlate').correlateFilesToDeals(wsId, {});
  console.log(`[real] fichiers→pièces (par réf): ${corrD.matched}/${corrD.scanned} (+${corrD.created})`);
  // file d'attente : les fichiers SANS réf dans le nom → l'IA lit le contenu et relie
  if (process.env.RADAR_DOC_ANALYSIS !== '0') {
    const dq = await require('../src/radar/doc-queue').analyzeDocuments(wsId, { limit: Number(process.env.RADAR_DOC_LIMIT || 30) }).catch(e => { console.log('[real] doc-queue skip:', e.message); return null; });
    if (dq) console.log(`[real] analyse documents (LLM) : ${dq.read}/${dq.queued} lus · ${dq.linked} reliés · ${dq.review} en revue`);
  }
  // index RAG : lit le texte des documents pour la recherche par sujet (« où est le contrat de X »).
  // Exploration AGENTIQUE (l'IA choisit les dossiers à fouiller) sur des racines configurables ;
  // sinon repli sur les Documents déjà dans le graphe.
  if (process.env.RADAR_DOC_INDEX !== '0') {
    const roots = (process.env.RADAR_INDEX_ROOTS || '/RadarDemo').split(',').map(s => s.trim()).filter(Boolean);
    const di = require('../src/radar/doc-index');
    const ixE = await di.indexDocuments(wsId, { useExplorer: true, roots, maxFolders: Number(process.env.RADAR_INDEX_FOLDERS || 80), maxFiles: Number(process.env.RADAR_INDEX_MAX || 250) }).catch(e => { console.log('[real] doc-index explorer skip:', e.message); return null; });
    if (ixE) console.log(`[real] index RAG (explorateur ${roots.join(',')}) : ${ixE.indexed} docs indexés (${ixE.skipped} ignorés / ${ixE.totalFiles})`);
    const ixG = await di.indexDocuments(wsId, { useExplorer: false, maxFiles: Number(process.env.RADAR_INDEX_MAX || 250) }).catch(() => null);
    if (ixG) console.log(`[real] index RAG (graphe réel) : ${ixG.indexed} docs indexés (${ixG.skipped} ignorés / ${ixG.totalFiles})`);
    // L'explorateur vient d'AJOUTER les fichiers démo au graphe → on (re)corrèle MAINTENANT
    // pour relier les « Facture_IN…txt » à la VRAIE facture (l'ordre comptait : avant, les
    // fichiers n'étaient pas encore dans le graphe).
    const C = require('../src/radar/graph/correlate');
    const corrD2 = await C.correlateFilesToDeals(wsId, {});
    console.log(`[real] fichiers→pièces (après index) : ${corrD2.matched}/${corrD2.scanned} (+${corrD2.created})`);
    // (re)corrélation fichier/dossier → CLIENT (par nom dans le chemin) + → PROJET, sur
    // les fichiers démo fraîchement ajoutés par l'explorateur (l'ordre comptait).
    const corrN2 = await C.correlateByName(wsId, {});
    console.log(`[real] fichiers/dossiers→client (après index) : ${corrN2.matched}/${corrN2.scanned} (+${corrN2.created})`);
    const corrP2 = await C.correlateFilesToProjects(wsId, {});
    console.log(`[real] fichiers→projets (après index) : ${corrP2.matched}/${corrP2.scanned} (+${corrP2.created})`);
  }

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

  // ── Couche communication (emails simulés) reliée aux vraies affaires — SIMULÉE ──
  if (SIMULATE) {
    const comms = await require('../src/radar/graph/seed-comms').seedSimulatedComms(wsId);
    console.log(`[real] [SIM] emails simulés : ${comms.emails} (devis/facture/fournisseur/SAV) — ${comms.relations} liens`);
    const oc = await require('../src/radar/graph/seed-comms').seedDealOutcomes(wsId);
    console.log(`[real] [SIM] issues d'affaires : ${oc.outcomes} devis avec dénouement varié (signé/refusé/perdu)`);
  }

  // ── Paiements : nœud Paiement relié à chaque facture payée (visible dans la mémoire) ──
  const pay = await require('../src/radar/graph/seed-comms').seedPayments(wsId);
  console.log(`[real] paiements : ${pay.payments} nœuds Paiement reliés aux factures payées`);
  // ── Demandes client → travail : ticket relié à la tâche de traitement (addressed_by) ──
  const reqw = await require('../src/radar/graph/seed-comms').linkRequestsToWork(wsId);
  console.log(`[real] demandes client → tâches : ${reqw.linked} tickets reliés au travail`);
  // ── Emails → personnes (contacts) avec NIVEAU : destinataire 'to' (fort) vs 'cc' (faible) ──
  const ec = await require('../src/radar/graph/seed-comms').linkEmailsToContacts(wsId);
  console.log(`[real] emails → contacts : ${ec.links} liens (to/cc, niveaux différenciés)`);

  // ── Chaîne d'affaire : devis→commande→facture reliés directement (par articles/montant) ──
  const dc = await require('../src/radar/graph/deal-chains').inferDealChains(wsId);
  console.log(`[real] chaînes d'affaire : ${dc.linked} liens devis→commande→facture (${dc.byClient} clients)`);

  // ── Identité cross-source : projets présents dans Dolibarr ET OpenProject → 1 entité ──
  const xsP = await require('../src/radar/graph/cross-source').resolveCrossSource(wsId, { coreType: 'Project', subtype: 'project' });
  console.log(`[real] projets multi-sources : ${xsP.merged} fusionnés, ${xsP.suggestions.length} suggestions (sur ${xsP.scanned})`);
  // PERSONNES présentes dans plusieurs systèmes (IDs différents) → 1 utilisateur unique
  const xsU = await require('../src/radar/graph/cross-source').resolveCrossSource(wsId, { coreType: 'Party', subtype: 'person', strongWithClient: 0.8 });
  console.log(`[real] utilisateurs multi-sources : ${xsU.merged} fusionnés, ${xsU.suggestions.length} suggestions (sur ${xsU.scanned})`);
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
