#!/usr/bin/env node
// Vérification COMPLÈTE du cerveau Radar : passe en revue chaque dimension d'une
// mémoire d'entreprise (affaires, achats, contacts, leads, emails+sentiment, projets
// sains/en difficulté, process, documents, machines) et signale CE QUI MANQUE.
//
//   node scripts/verify-radar.js
//
// Sortie : ✅ couvert · ⚠️ faible/à enrichir · ❌ absent.

const path = require('path'), fs = require('fs'), mongoose = require('mongoose');
try { for (const l of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const E = require('../src/db/models/radar-entity.model');
  const R = require('../src/db/models/radar-relation.model');
  const seed = await E.findOne({ coreType: 'Transaction' }).lean();
  if (!seed) { console.log('❌ Aucune entité — lance la synchro d\'abord.'); process.exit(1); }
  const ws = seed.workspaceId;
  const missing = [];
  const mark = (cond, weak) => cond ? (weak ? '⚠️ ' : '✅ ') : '❌ ';
  const cnt = (q) => E.countDocuments({ workspaceId: ws, ...q });
  const attr = (subtype, field, val) => E.countDocuments({ workspaceId: ws, subtype, [`attributes.${field}`]: val });

  console.log('\n══════════ VÉRIFICATION DU CERVEAU RADAR ══════════\n');

  // 1) Répartition générale
  const byType = await E.aggregate([{ $match: { workspaceId: ws } }, { $group: { _id: { c: '$coreType', s: '$subtype' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  const total = await cnt({});
  console.log(`▸ GRAPHE : ${total} entités`);
  console.log('  ' + byType.map(b => `${b._id.s || b._id.c}×${b.n}`).join(', ') + '\n');

  // 2) Cycle commercial
  const quotes = await cnt({ coreType: 'Transaction', subtype: 'quote' });
  const signed = await attr('quote', 'state', 'signé'), refused = await attr('quote', 'state', 'refusé');
  const orders = await cnt({ coreType: 'Transaction', subtype: 'order' });
  const invoices = await cnt({ coreType: 'Transaction', subtype: 'invoice' });
  const paid = await attr('invoice', 'payment_state', 'payée');
  const payments = await cnt({ coreType: 'Transaction', subtype: 'payment' });
  console.log('▸ CYCLE COMMERCIAL');
  console.log(`  ${mark(quotes >= 10)}Devis : ${quotes} (${signed} signés, ${refused} refusés)`);
  console.log(`  ${mark(orders >= 8)}Commandes : ${orders}`);
  console.log(`  ${mark(invoices >= 10)}Factures : ${invoices} (${paid} payées)`);
  console.log(`  ${mark(payments >= 2)}Paiements (nœuds reliés) : ${payments}`);
  if (quotes < 10) missing.push('Plus de devis');
  if (payments < 2) missing.push('Nœuds Paiement (relancer seedPayments / vérifier paiements Dolibarr)');

  // 3) Achats / fournisseurs
  const suppliers = await cnt({ coreType: 'Party', roles: 'supplier' });
  const supInv = await cnt({ coreType: 'Transaction', subtype: 'supplier_invoice' });
  console.log('\n▸ ACHATS / FOURNISSEURS');
  console.log(`  ${mark(suppliers >= 2)}Fournisseurs : ${suppliers}`);
  console.log(`  ${mark(supInv >= 3, supInv > 0 && supInv < 3)}Factures fournisseurs : ${supInv}`);
  if (supInv === 0) missing.push('Factures fournisseurs (achats) — vérifier création raw /supplierinvoices');

  // 4) CRM : contacts + leads
  const persons = await cnt({ coreType: 'Party', subtype: 'person' });
  const prospects = await E.countDocuments({ workspaceId: ws, coreType: 'Party', 'attributes.client': '2' });
  console.log('\n▸ CRM');
  console.log(`  ${mark(persons >= 4, persons > 0 && persons < 4)}Contacts / personnes : ${persons}`);
  console.log(`  ${mark(prospects >= 1, prospects === 0)}Prospects / leads : ${prospects}`);
  if (persons < 4) missing.push('Contacts CRM — vérifier mapping contact→Party.person + watch');
  if (prospects === 0) missing.push('Leads/prospects (client=2) — vérifier mapping/ingestion');

  // 5) Communications + sentiment
  const emails = await cnt({ coreType: 'Communication', subtype: 'email' });
  const sent = await require('../src/radar/sentiment').analyzeSentiment(ws).catch(() => null);
  console.log('\n▸ COMMUNICATIONS & SENTIMENT');
  console.log(`  ${mark(emails >= 20)}Emails : ${emails}`);
  if (sent) {
    console.log(`  ${mark(sent.counts.négatif > 0)}Sentiment : climat ${sent.overall} (😊 ${sent.counts.positif} · 😐 ${sent.counts.neutre} · 😞 ${sent.counts.négatif})`);
    console.log(`  ${mark(sent.byClient.some(c => c.atRisk), !sent.byClient.some(c => c.atRisk))}Clients à risque : ${sent.byClient.filter(c => c.atRisk).map(c => c.client).join(', ') || 'aucun'}`);
  }
  if (emails < 20) missing.push('Plus d\'emails (relancer seedSimulatedComms après le seed densifié)');

  // 6) Projets sains vs en difficulté
  const projects = await cnt({ coreType: 'Project' });
  const blocked = await E.countDocuments({ workspaceId: ws, coreType: 'WorkItem', subtype: 'task', label: /BLOQU/i });
  console.log('\n▸ PROJETS & EXÉCUTION');
  console.log(`  ${mark(projects >= 10)}Projets : ${projects}`);
  console.log(`  ${mark(blocked > 0, blocked === 0)}Tâches bloquées (projets en difficulté) : ${blocked}`);

  // 7) Process : emails présents ?
  const cross = await require('../src/radar/process/cross-miner').mineCrossProcess(ws, {}).catch(() => null);
  const emailInProc = cross ? cross.activities.some(a => /email|mail/i.test(a.activity)) : false;
  console.log('\n▸ PROCESSUS MÉTIER (cross-logiciel)');
  if (cross) {
    console.log(`  ${mark(cross.cases >= 3)}Cas : ${cross.cases} · transitions : ${cross.transitions.length}`);
    console.log(`  ${mark(emailInProc)}Emails présents dans le process : ${emailInProc ? 'oui' : 'NON'}`);
    console.log(`    activités : ${cross.activities.slice(0, 8).map(a => a.activity).join(' · ')}`);
  }
  if (!emailInProc) missing.push('Emails dans les processus — vérifier liens email→client (references)');

  // 8) Documents
  const Chunk = require('../src/db/models/radar-doc-chunk.model');
  const indexed = await Chunk.countDocuments({ workspaceId: ws });
  const linkedDocs = await R.countDocuments({ workspaceId: ws, type: 'documents' });
  console.log('\n▸ DOCUMENTS');
  console.log(`  ${mark(indexed >= 20)}Indexés (RAG) : ${indexed}`);
  console.log(`  ${mark(linkedDocs > 0)}Fichiers reliés à une pièce : ${linkedDocs}`);

  // 9) Machines / capteurs
  const machines = await cnt({ coreType: 'Asset', subtype: 'machine' });
  const sensors = await require('../src/radar/sensors').analyzeSensors(ws).catch(() => []);
  console.log('\n▸ INDUSTRIE');
  console.log(`  ${mark(machines >= 1, machines === 0)}Machines : ${machines} · alertes capteurs : ${sensors.filter(s => s.alert).length}`);

  // 10) Marges (I10)
  const mg = await require('../src/radar/margin').analyzeMargins(ws).catch(() => null);
  console.log('\n▸ MARGES (I10)');
  if (mg) {
    console.log(`  ${mark(mg.totals.revenue > 0)}CA ${mg.totals.revenue}€ · coût ${mg.totals.cost}€ · marge ${mg.totals.margin}€ (${mg.totals.rate}%)`);
    console.log(`  ${mark(Object.keys(mg.byType).length > 0)}Par type : ${Object.entries(mg.byType).map(([k, v]) => `${k} ${v.rate}%`).join(' · ')} · affaires faible marge : ${mg.lowMargin.length}`);
  }

  // 11) RH + pointage (I11)
  const hr = await require('../src/radar/hr').analyzeHR(ws).catch(() => null);
  console.log('\n▸ RH + POINTAGE (I11)');
  if (hr) {
    const tot = hr.totals || {};
    console.log(`  ${mark((tot.people || 0) >= 1)}Personnes : ${tot.people || 0} · items assignés : ${tot.assignedItems || 0} · heures : ${tot.hours || 0}`);
    console.log(`  ${mark((hr.processHints || []).length > 0, true)}Indices process RH : ${(hr.processHints || []).slice(0, 4).join(', ') || 'aucun'}`);
    if ((tot.hours || 0) === 0) missing.push('Heures pointées (relancer seed HR + re-sync pour le mapping hoursReal)');
  }

  // 12) Calendrier (I12)
  const cal = await require('../src/radar/calendar').analyzeEvents(ws).catch(() => null);
  console.log('\n▸ CALENDRIER / ÉVÉNEMENTS (I12)');
  if (cal) {
    console.log(`  ${mark((cal.events || []).length > 0)}Événements : ${(cal.events || []).length} · RDV sans suite : ${(cal.orphanMeetings || []).length}${cal.note ? ' · ' + cal.note : ''}`);
    if (!(cal.events || []).length) missing.push('Événements calendrier (vérifier watch calendar + handler agendaevents)');
  }

  // 13) Audit temps réel (I13)
  const audit = await require('../src/radar/audit-live').auditDivergences(ws).catch(() => null);
  console.log('\n▸ AUDIT TEMPS RÉEL (I13)');
  if (audit) {
    console.log(`  ${mark((audit.counts?.total || 0) > 0)}Divergences : ${audit.counts?.total || 0} (${audit.counts?.haute || 0} hautes) · score ${audit.score}`);
    (audit.divergences || []).slice(0, 3).forEach(d => console.log(`     • [${d.severity}] ${d.type} : ${(d.label || '').slice(0, 50)}`));
  }

  // 14) LLM réel — interrogation conversationnelle (askRadar)
  console.log('\n▸ LLM CONVERSATIONNEL (askRadar, vrai modèle)');
  const ask = await require('../src/radar/ask').askRadar(ws, 'Quels sont mes 3 problèmes les plus urgents et ma marge globale ?').catch(e => ({ answer: 'ERREUR: ' + e.message }));
  console.log(`  ${mark(ask.answer && !/erreur|indisponible/i.test(ask.answer))}Réponse : ${(ask.answer || '').slice(0, 220)}`);

  // Récap manques
  console.log('\n══════════ CE QUI MANQUE / À ENRICHIR ══════════');
  if (!missing.length) console.log('  ✅ Toutes les dimensions sont couvertes.');
  else missing.forEach(m => console.log('  ⚠️  ' + m));
  console.log('');
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
