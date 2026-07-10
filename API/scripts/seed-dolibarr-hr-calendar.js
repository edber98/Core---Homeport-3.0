#!/usr/bin/env node
// Seed HR + CALENDRIER (idempotent, SANS recréer d'affaires) :
//  - équipe : quelques utilisateurs Dolibarr (collaborateurs)
//  - heures pointées : duration_effective + planned_workload sur les tâches existantes
//  - calendrier : événements/RDV client (agendaevents) reliés aux tiers
//  - congés : quelques holidays
// → alimente les modules RH (heures, charge), Calendrier (RDV) et la MARGE réelle.
//
//   node scripts/seed-dolibarr-hr-calendar.js

const path = require('path'), fs = require('fs');
try { for (const l of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const mongoose = require('mongoose');
const nowS = () => Math.floor(Date.now() / 1000);
const DAY = 86400;

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const { decrypt } = require('../src/utils/enc');
  const cr = decrypt((await require('../src/db/models/credential.model').findOne({ providerKey: 'dolibarr' }).lean()).secret);
  const base = cr.url.replace(/\/+$/, ''); const hdr = { DOLAPIKEY: cr.apiKey, 'Content-Type': 'application/json' };
  const api = async (p, meth = 'GET', b) => { const r = await fetch(base + '/api/index.php' + p, { method: meth, headers: hdr, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; };
  const id = (v) => typeof v === 'number' ? v : (v && (v.id || v.rowid));
  const list = async (p) => { const r = await api(p + (p.includes('?') ? '&' : '?') + 'limit=500'); return Array.isArray(r.j) ? r.j : []; };

  // ── Équipe : collaborateurs (réutilise par login) ──
  console.log('=== Équipe (utilisateurs) ===');
  const team = [
    { login: 'cdubois', lastname: 'Dubois', firstname: 'Claire', email: 'claire.dubois@c4rbon.fr', job: 'Cheffe de projet' },
    { login: 'mlefevre', lastname: 'Lefèvre', firstname: 'Marc', email: 'marc.lefevre@c4rbon.fr', job: 'Développeur' },
    { login: 'snguyen', lastname: 'Nguyen', firstname: 'Sophie', email: 'sophie.nguyen@c4rbon.fr', job: 'Consultante' },
    { login: 'ybernard', lastname: 'Bernard', firstname: 'Yanis', email: 'yanis.bernard@c4rbon.fr', job: 'Technicien' },
  ];
  const existingUsers = await list('/users');
  const userByLogin = new Map(existingUsers.map(u => [u.login, id(u)]));
  const uids = [];
  for (const t of team) {
    let uid = userByLogin.get(t.login);
    if (!uid) { const r = await api('/users', 'POST', { login: t.login, lastname: t.lastname, firstname: t.firstname, email: t.email, job: t.job, statut: 1 }); uid = id(r.j); }
    if (uid) uids.push(uid);
  }
  console.log(`  ${uids.length} collaborateurs`);

  // ── Heures pointées : duration_effective (réel) + planned_workload (prévu) sur les tâches ──
  console.log('=== Heures pointées sur tâches ===');
  const tasks = await list('/tasks');
  let timed = 0;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]; const tid = id(t); if (!tid) continue;
    // heures variées : certaines tâches en dépassement (réel > prévu = dérive de marge)
    const plannedH = 3 + (i % 5);                          // 3..7 j prévus
    const overrun = i % 4 === 0 ? 1.4 : (i % 3 === 0 ? 0.6 : 1.0);  // 25% en dépassement, 33% sous-budget
    const realH = Math.round(plannedH * overrun * 10) / 10;
    const r = await api(`/tasks/${tid}`, 'PUT', { duration_effective: Math.round(realH * 3600), planned_workload: plannedH * 3600 });
    if (r.status < 300) timed++;
  }
  console.log(`  ${timed}/${tasks.length} tâches avec heures réelles/prévues`);

  // ── Calendrier : RDV client + réunions (agendaevents) reliés aux tiers ──
  console.log('=== Calendrier (RDV / réunions) ===');
  const clients = (await list('/thirdparties?mode=1')).filter(t => String(t.client) !== '0');
  const evTypes = [
    { code: 'AC_RDV', label: 'RDV commercial' }, { code: 'AC_TEL', label: 'Appel de suivi' },
    { code: 'AC_RDV', label: 'Réunion de cadrage' }, { code: 'AC_RDV', label: 'Point d\'avancement' },
    { code: 'AC_RDV', label: 'Présentation devis' },
  ];
  const existingEv = await list('/agendaevents');
  let events = 0;
  if (existingEv.length < 10) {
    for (let i = 0; i < clients.length; i++) {
      const c = clients[i]; const ev = evTypes[i % evTypes.length];
      const when = nowS() - (i % 30) * DAY + 9 * 3600;     // étalé, en matinée
      const r = await api('/agendaevents', 'POST', { label: `${ev.label} — ${c.name}`, datep: when, datef: when + 3600, type_code: ev.code, socid: id(c), userownerid: uids[i % uids.length] || 1, percentage: i % 3 === 0 ? -1 : 100 });
      if (id(r.j)) events++;
    }
  } else { events = existingEv.length; console.log('  (événements déjà présents, réutilisés)'); }
  console.log(`  ${events} événements calendrier`);

  // ── Congés (holidays) pour quelques collaborateurs ──
  console.log('=== Congés ===');
  let leaves = 0;
  const existingLeaves = await list('/holidays');
  if (existingLeaves.length < 3) {
    for (let i = 0; i < Math.min(3, uids.length); i++) {
      const r = await api('/holidays', 'POST', { fk_user: uids[i], date_debut: new Date((nowS() + (10 + i * 7) * DAY) * 1000).toISOString().slice(0, 10), date_fin: new Date((nowS() + (14 + i * 7) * DAY) * 1000).toISOString().slice(0, 10), statut: 2, fk_type: 1, description: 'Congés payés' });
      if (id(r.j) || r.status < 300) leaves++;
    }
  } else leaves = existingLeaves.length;
  console.log(`  ${leaves} congés`);

  console.log('\n✅ HR + calendrier seedés. Relance la synchro radar pour ingérer (avec mappings agenda/heures).');
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
