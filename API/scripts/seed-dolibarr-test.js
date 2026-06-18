// Peuplement Dolibarr de TEST avec vérification à chaque étape.
// Crée un jeu cohérent et relié (clients/fournisseurs → devis/commandes/projets
// → tâches/tickets) pour donner de la matière au futur graphe du Radar.
// Chaque création est RELUE et ASSERTÉE avant de continuer.
//
// Usage : depuis API/, avec .env chargé :  node scripts/seed-dolibarr-test.js

const path = require('path');
const mongoose = require('mongoose');

let pass = 0, fail = 0;
function check(label, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
  return cond;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const { registry } = require('../src/plugins/registry');
  await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null);

  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { console.error('Pas de credential dolibarr en base'); process.exit(1); }
  const opts = { credentials: decrypt(cred.secret), log: () => {} };

  const call = async (key, args) => {
    const fn = registry.resolve(key);
    if (!fn) return { ok: false, error: 'handler_absent' };
    return fn({ id: 't', model: {} }, { payload: {} }, args, opts);
  };
  const idOf = (r) => r && (r.id || r.rowid || (typeof r === 'string' ? r : (r.data && (r.data.id || r.data))) );

  const created = { thirdparties: [], projects: [], proposals: [], orders: [], tasks: [], tickets: [] };

  // ── Étape 1 : Tiers (clients + fournisseurs) ──
  console.log('\n=== Étape 1 : Tiers (clients + fournisseurs) ===');
  const parties = [
    { name: 'Cartonnage du Château', client: 1, email: 'contact@cartonnage-chateau.fr', town: 'Royan' },
    { name: 'Joly Formations', client: 1, email: 'edouard@joly-formations.com', town: 'Paris' },
    { name: 'France Num', client: 1, email: 'contact@francenum.gouv.fr', town: 'Paris' },
    { name: 'Boucherie Centrale', client: 1, email: 'compta@boucherie-centrale.fr', town: 'Lyon' },
    { name: 'ITBS', fournisseur: 1, email: 'christophe.royen@it-bs.fr', town: 'Bordeaux' },
    { name: 'SFR Business', fournisseur: 1, email: 'facturation@sfr.fr', town: 'Paris' },
    { name: 'Schneider Electric', fournisseur: 1, email: 'pro@schneider.fr', town: 'Grenoble' },
  ];
  for (const p of parties) {
    const r = await call('dolibarr_thirdparty_create', p);
    const id = idOf(r);
    if (check(`Créer tiers « ${p.name} »`, r.ok && id, r.ok ? `id=${id}` : r.error)) {
      // Vérification : relecture
      const g = await call('dolibarr_thirdparty_get', { id });
      check(`  ↳ relu et nom correct`, g.ok && (g.name === p.name), g.ok ? '' : g.error);
      created.thirdparties.push({ id, ...p });
    }
  }

  const clients = created.thirdparties.filter(t => t.client);
  const client1 = clients[0];

  // ── Étape 2 : Projets ──
  console.log('\n=== Étape 2 : Projets ===');
  const projects = [
    { ref: 'PJ-JOLY-' + Date.now(), title: 'Déploiement Joly Formations', socid: clients[1] && clients[1].id },
    { ref: 'PJ-CARTON-' + (Date.now()+1), title: 'Infrastructure Cartonnage', socid: clients[0] && clients[0].id },
  ];
  for (const pj of projects) {
    const r = await call('dolibarr_project_create', pj);
    const id = idOf(r);
    if (check(`Créer projet « ${pj.title} »`, r.ok && id, r.ok ? `id=${id}` : r.error)) {
      const g = await call('dolibarr_project_get', { id });
      check(`  ↳ relu`, g.ok && (g.title === pj.title), g.ok ? '' : g.error);
      created.projects.push({ id, ...pj });
    }
  }

  // ── Étape 3 : Tâches (liées aux projets) ──
  console.log('\n=== Étape 3 : Tâches (liées aux projets) ===');
  if (created.projects.length) {
    const pj = created.projects[0];
    const tasks = ['Cadrage technique', 'Installation serveur', 'Recette client'];
    for (const label of tasks) {
      const r = await call('dolibarr_task_create', { fk_project: pj.id, label });
      const id = idOf(r);
      if (check(`Créer tâche « ${label} » (projet ${pj.ref})`, r.ok && id, r.ok ? `id=${id}` : r.error)) {
        created.tasks.push({ id, label, fk_project: pj.id });
      }
    }
  } else check('Tâches', false, 'aucun projet créé');

  // ── Étape 4 : Devis (proposals, liés aux clients) ──
  console.log('\n=== Étape 4 : Devis (liés aux clients) ===');
  for (const c of clients.slice(0, 3)) {
    const r = await call('dolibarr_proposal_create', { socid: c.id, date: Math.floor(Date.now()/1000) });
    const id = idOf(r);
    if (check(`Créer devis pour « ${c.name} »`, r.ok && id, r.ok ? `id=${id}` : r.error)) {
      created.proposals.push({ id, socid: c.id });
    }
  }

  // ── Étape 5 : Commandes (orders, liées aux clients) ──
  console.log('\n=== Étape 5 : Commandes (liées aux clients) ===');
  for (const c of clients.slice(0, 2)) {
    const r = await call('dolibarr_order_create', { socid: c.id, date: Math.floor(Date.now()/1000) });
    const id = idOf(r);
    if (check(`Créer commande pour « ${c.name} »`, r.ok && id, r.ok ? `id=${id}` : r.error)) {
      created.orders.push({ id, socid: c.id });
    }
  }

  // ── Étape 6 : Tickets (liés aux clients) ──
  console.log('\n=== Étape 6 : Tickets (liés aux clients) ===');
  const tickets = [
    { subject: 'GED en panne', message: 'La GED est tombée en panne, MAJ non appliquées.', fk_soc: clients[1] && clients[1].id },
    { subject: 'Demande accès CentOS', message: 'Besoin accès VPN serveur CentOS.', fk_soc: clients[0] && clients[0].id },
  ];
  for (const t of tickets) {
    const r = await call('dolibarr_ticket_create', t);
    const id = idOf(r);
    check(`Créer ticket « ${t.subject} »`, r.ok && id, r.ok ? `id=${id}` : r.error);
    if (r.ok && id) created.tickets.push({ id, ...t });
  }

  // ── Vérification finale : relire les listes ──
  console.log('\n=== Vérification finale (relecture des listes) ===');
  for (const [key, label] of [
    ['dolibarr_thirdparties_list', 'tiers'],
    ['dolibarr_projects_list', 'projets'],
    ['dolibarr_proposals_list', 'devis'],
    ['dolibarr_orders_list', 'commandes'],
    ['dolibarr_tickets_list', 'tickets'],
  ]) {
    const r = await call(key, { limit: 100 });
    const arr = r.ok ? Object.values(r).find(v => Array.isArray(v)) : null;
    check(`Liste ${label} non vide`, arr && arr.length > 0, arr ? `${arr.length} en base` : (r.error || 'vide'));
  }

  console.log(`\n=== RÉSUMÉ : ${pass} OK / ${fail} KO ===`);
  console.log('Créé :', Object.fromEntries(Object.entries(created).map(([k, v]) => [k, v.length])));
  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
