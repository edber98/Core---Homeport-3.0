#!/usr/bin/env node
// Force la suppression des factures PAYÉES restantes : on supprime d'abord les
// paiements (qui verrouillent la facture), puis settodraft, puis delete.
const path = require('path'), fs = require('fs');
try { for (const l of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const cr = decrypt((await Credential.findOne({ providerKey: 'dolibarr' }).lean()).secret);
  const base = cr.url.replace(/\/+$/, ''); const hdr = { DOLAPIKEY: cr.apiKey, 'Content-Type': 'application/json' };
  const api = async (p, method = 'GET', body) => { const r = await fetch(base + '/api/index.php' + p, { method, headers: hdr, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; };

  const invs = (await api('/invoices?limit=500')).j;
  if (!Array.isArray(invs)) { console.log('aucune facture'); return mongoose.disconnect(); }
  let deleted = 0, stuck = 0, payDel = 0;
  for (const inv of invs) {
    const id = inv.id || inv.rowid; if (!id) continue;
    // 1) supprimer les paiements de la facture
    const pays = (await api(`/invoices/${id}/payments`)).j;
    if (Array.isArray(pays)) for (const p of pays) { const pid = p.id || p.rowid || p.ref; if (pid) { const r = await api(`/invoices/payments/${pid}`, 'DELETE'); if (r.status < 300) payDel++; } }
    // 2) repasser en brouillon puis supprimer
    await api(`/invoices/${id}/settodraft`, 'POST', {}).catch(() => {});
    const r = await api(`/invoices/${id}`, 'DELETE');
    if (r.status < 300) deleted++; else stuck++;
  }
  console.log(`Paiements supprimés: ${payDel} · Factures supprimées: ${deleted} · encore bloquées: ${stuck} (sur ${invs.length})`);
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
