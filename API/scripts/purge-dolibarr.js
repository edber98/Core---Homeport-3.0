#!/usr/bin/env node
// Purge des DONNÉES DE TEST Dolibarr (cumulées par les seeds successifs) pour repartir
// propre. On supprime dans l'ordre des dépendances : factures → commandes → devis →
// factures fournisseurs → projets (+tâches) → tickets. On REPASSE en brouillon
// (settodraft) avant suppression (Dolibarr refuse de supprimer une pièce validée).
// On GARDE : tiers (clients/fournisseurs), produits, compte bancaire, entrepôt.
//
//   node scripts/purge-dolibarr.js
//
// Idempotent : ré-exécutable. Tolérant aux erreurs (continue sur échec d'un item).

const path = require('path'), fs = require('fs');
try { for (const l of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const { registry } = require('../src/plugins/registry');
  const _l = console.log; console.log = () => {}; await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null); console.log = _l;
  const dol = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  const cr = decrypt(dol.secret);
  const base = cr.url.replace(/\/+$/, ''); const hdr = { DOLAPIKEY: cr.apiKey, 'Content-Type': 'application/json' };
  const api = async (p, method = 'GET', body) => { const r = await fetch(base + '/api/index.php' + p, { method, headers: hdr, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; };
  const list = async (p) => { const r = await api(p + '?limit=500'); return Array.isArray(r.j) ? r.j : []; };

  // Familles à purger : endpoint liste, endpoint base, libellé. settodraft tenté avant delete.
  const families = [
    { name: 'Factures', base: '/invoices' },
    { name: 'Commandes', base: '/orders' },
    { name: 'Devis', base: '/proposals' },
    { name: 'Factures fournisseur', base: '/supplierinvoices' },
    { name: 'Projets', base: '/projects' },
    { name: 'Tickets', base: '/tickets' },
  ];

  for (const f of families) {
    const items = await list(f.base);
    let deleted = 0, failed = 0;
    for (const it of items) {
      const id = it.id || it.rowid; if (!id) continue;
      await api(`${f.base}/${id}/settodraft`, 'POST', {}).catch(() => {});       // best-effort (ignore si non applicable)
      const r = await api(`${f.base}/${id}`, 'DELETE');
      if (r.status < 300) deleted++; else failed++;
    }
    console.log(`  ${f.name}: ${deleted} supprimés${failed ? `, ${failed} échecs (validés/protégés)` : ''} (sur ${items.length})`);
  }

  // Prospects (client=2) créés comme leads → on les supprime aussi (on garde clients=1 et fournisseurs)
  const tiers = await list('/thirdparties');
  let prospects = 0;
  for (const t of tiers) { if (String(t.client) === '2' && String(t.fournisseur) !== '1') { const r = await api(`/thirdparties/${t.id || t.rowid}`, 'DELETE'); if (r.status < 300) prospects++; } }
  console.log(`  Prospects/leads: ${prospects} supprimés`);

  console.log('\n✅ Purge terminée — relance maintenant le seed propre.');
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
