#!/usr/bin/env node
// Nettoyage CIBLÉ des artefacts de test que CE projet a créés dans Dolibarr.
// Ne touche QU'aux documents identifiables sans ambiguïté (préfixes de ref / sujets
// de ticket que nos seeds génèrent). La vraie donnée business est préservée.
//
//   node scripts/cleanup-dolibarr-tests.js          # supprime
//   node scripts/cleanup-dolibarr-tests.js --dry    # liste seulement (aucune suppression)

const path = require('path'), fs = require('fs'), mongoose = require('mongoose');
try { const p = path.resolve(__dirname, '../.env'); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const DRY = process.argv.includes('--dry');

// Marqueurs de nos seeds/diags (jamais utilisés par la vraie donnée).
const PROJECT_REF = /^(PJ|DG|PRB|PRB2)-/i;
const PRODUCT_REF = /^(SRV|MAT)-/i;
const BANK_REF = /^(BANK|BK|BR)-/i;
const TICKET_SUBJECTS = new Set(['Serveur NAS inaccessible', 'Demande de formation supplémentaire', 'Onduleur en défaut batterie', 'Lenteur applicative', 'GED en panne', 'Demande accès CentOS']);

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const { registry } = require('../src/plugins/registry');
  const _l = console.log; console.log = () => {}; await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null); console.log = _l;
  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  const opts = { credentials: decrypt(cred.secret), log: () => {} };
  const call = async (k, a) => { const fn = registry.resolve(k); if (!fn) return { ok: false, error: 'no_handler' }; try { return await fn({ id: 't', model: {} }, { payload: {} }, a, opts); } catch (e) { return { ok: false, error: e.message }; } };
  const arrOf = (r) => (r && r.ok) ? (Object.values(r).find(v => Array.isArray(v)) || []) : [];
  const idOf = (o) => o && (o.id ?? o.rowid);
  const dutils = require('../src/plugins/repos/dolibarr/functions/utils').utils;
  const rawDel = (p) => dutils.dolibarrRequest(opts, p, { method: 'DELETE' }).catch(e => ({ ok: false, error: e.message }));
  const rawPost = (p, body) => dutils.dolibarrRequest(opts, p, { method: 'POST', body: body || {} }).catch(e => ({ ok: false, error: e.message }));

  const stats = {};
  const del = async (label, key, id, rawPath) => {
    if (DRY) { console.log(`  [dry] supprimerait ${label} ${id}`); stats[label] = (stats[label] || 0) + 1; return; }
    let r = key ? await call(key, { id }) : await rawDel(rawPath);
    if (!r.ok && rawPath) r = await rawDel(rawPath);       // fallback raw
    if (r.ok) { stats[label] = (stats[label] || 0) + 1; }
    else console.log(`  ⚠️  ${label} ${id} non supprimé — ${r.error}`);
  };

  // 1. Projets de test → on collecte leurs ids (pour supprimer leurs pièces d'abord)
  const projects = arrOf(await call('dolibarr_projects_list', { limit: 1000 })).filter(p => PROJECT_REF.test(p.ref || ''));
  const projIds = new Set(projects.map(idOf).map(String));
  console.log(`Projets de test : ${projects.length}`);

  // 2. Pièces commerciales liées à ces projets (fk_project) → factures, commandes, devis
  for (const [listKey, delKey, rawBase, label] of [
    ['dolibarr_invoices_list', 'dolibarr_invoice_delete', '/invoices', 'facture'],
    ['dolibarr_orders_list', 'dolibarr_order_delete', '/orders', 'commande'],
    ['dolibarr_proposals_list', 'dolibarr_proposal_delete', '/proposals', 'devis'],
  ]) {
    const docs = arrOf(await call(listKey, { limit: 2000 })).filter(d => projIds.has(String(d.fk_project)));
    console.log(`${label}s liées aux projets de test : ${docs.length}`);
    for (const d of docs) {
      // une pièce validée/payée ne se supprime pas : on la repasse en brouillon d'abord
      if (!DRY && String(d.statut) !== '0') {
        await rawPost(`${rawBase}/${idOf(d)}/settodraft`, {});
        if (label === 'facture') await rawPost(`${rawBase}/${idOf(d)}/settodraft`, { idwarehouse: 0 });
      }
      await del(label, delKey, idOf(d), `${rawBase}/${idOf(d)}`);
    }
  }

  // 3. Projets + tâches
  for (const p of projects) await del('projet', 'dolibarr_project_delete', idOf(p), `/projects/${idOf(p)}`);

  // 4. Produits/services de test
  const products = arrOf(await call('dolibarr_products_list', { limit: 2000 })).filter(p => PRODUCT_REF.test(p.ref || ''));
  console.log(`Produits/services de test : ${products.length}`);
  for (const p of products) await del('produit', 'dolibarr_product_delete', idOf(p), `/products/${idOf(p)}`);

  // 5. Tickets de test (par sujet)
  const tickets = arrOf(await call('dolibarr_tickets_list', { limit: 1000 })).filter(t => TICKET_SUBJECTS.has(t.subject));
  console.log(`Tickets de test : ${tickets.length}`);
  for (const t of tickets) await del('ticket', 'dolibarr_ticket_delete', idOf(t), `/tickets/${idOf(t)}`);

  // 6. Comptes bancaires de test
  const banks = arrOf(await call('dolibarr_bankaccounts_list', { limit: 200 })).filter(b => BANK_REF.test(b.ref || ''));
  console.log(`Comptes bancaires de test : ${banks.length}`);
  for (const b of banks) await del('compte', 'dolibarr_bankaccount_delete', idOf(b), `/bankaccounts/${idOf(b)}`);

  console.log(`\n=== ${DRY ? 'DRY-RUN' : 'SUPPRIMÉ'} ===`, stats);
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
