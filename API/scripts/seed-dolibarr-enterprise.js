#!/usr/bin/env node
// Peuplement Dolibarr RÉEL et COMPLET — société de services (IT/infogérance) qui
// vend aussi du matériel. Objectif : donner au Radar de la VRAIE donnée riche,
// reliée par identifiants entre enregistrements (factures→articles via fk_product,
// devis→commande→facture, projets→tâches, tickets), avec du STOCK pour révéler les
// goulots d'approvisionnement, des factures payées ET impayées en retard (anomalies),
// et des cycles de vie complets (brouillon → validé → payé).
//
//   node scripts/seed-dolibarr-enterprise.js
//
// Idempotent au mieux : réutilise les tiers existants par email, refs horodatées.

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
try { const p = path.resolve(__dirname, '../.env'); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const DAY = 86400;            // en secondes (Dolibarr attend des timestamps unix en s)
const nowS = () => Math.floor(Date.now() / 1000);
let pass = 0, fail = 0, warn = 0;
function ok(label, cond, detail = '') { if (cond) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); } else { fail++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); } return cond; }
function soft(label, cond, detail = '') { if (cond) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); } else { warn++; console.log(`  ⚠️  ${label}${detail ? ' — ' + detail : ''}`); } return cond; }

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const { registry } = require('../src/plugins/registry');
  // Chargement silencieux des plugins (logs d'import très verbeux sinon)
  const _log = console.log; console.log = () => {};
  await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null);
  console.log = _log;

  const cred = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  if (!cred) { console.error('Pas de credential dolibarr en base'); process.exit(1); }
  const opts = { credentials: decrypt(cred.secret), log: () => {} };
  const call = async (key, args) => { const fn = registry.resolve(key); if (!fn) return { ok: false, error: 'handler_absent: ' + key }; try { return await fn({ id: 't', model: {} }, { payload: {} }, args, opts); } catch (e) { return { ok: false, error: e.message }; } };
  // Extrait un id PRIMITIF (jamais un objet — sinon socid devient "[object]" → 500 Dolibarr).
  const prim = (v) => (typeof v === 'string' || typeof v === 'number') ? v : null;
  const idOf = (r) => { if (!r) return null; return prim(r.id) ?? prim(r.rowid) ?? prim(r.data && r.data.id) ?? prim(r.data && r.data.rowid) ?? prim(r.data) ?? prim(r); };
  const arrOf = (r) => (r && r.ok) ? (Object.values(r).find(v => Array.isArray(v)) || []) : [];
  const stamp = Date.now().toString().slice(-6);
  // Appel DIRECT à l'API Dolibarr (pour les endpoints non wrappés : close devis/commande).
  const dutils = require('../src/plugins/repos/dolibarr/functions/utils').utils;
  const raw = (p, body, method = 'POST') => dutils.dolibarrRequest(opts, p, { method, body: body || {} }).catch(e => ({ ok: false, error: e.message }));
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Réessaie sur erreur serveur transitoire (Dolibarr 500 sur créations rapprochées = collision de compteur).
  const callRetry = async (key, args) => {
    for (let a = 0; a < 3; a++) {
      const r = await call(key, args);
      if (r.ok) return r;
      if (!/Internal Server|Error creating|5\d\d/.test(String(r.error || r.status))) return r;
      await wait(400);
    }
    return call(key, args);
  };

  // ───────────────────────── Étape 1 : Clients & fournisseurs ─────────────────────────
  console.log('\n=== 1. Tiers (réutilise par email) ===');
  const partySpecs = [
    { name: 'Joly Formations', client: 1, email: 'edouard@joly-formations.com', town: 'Paris' },
    { name: 'Cartonnage du Château', client: 1, email: 'contact@cartonnage-chateau.fr', town: 'Royan' },
    { name: 'Boucherie Centrale', client: 1, email: 'compta@boucherie-centrale.fr', town: 'Lyon' },
    { name: 'France Num', client: 1, email: 'contact@francenum.gouv.fr', town: 'Paris' },
    { name: 'Mairie de Cergy', client: 1, email: 'si@ville-cergy.fr', town: 'Cergy' },
    // clients supplémentaires (secteurs variés → typage sémantique + segments riches)
    { name: 'Clinique du Parc', client: 1, email: 'achats@clinique-parc.fr', town: 'Lyon' },
    { name: 'Garage Moderne SARL', client: 1, email: 'contact@garage-moderne.fr', town: 'Nantes' },
    { name: 'Lycée Jean Moulin', client: 1, email: 'intendance@lycee-jeanmoulin.fr', town: 'Lille' },
    { name: 'BioFerme Coopérative', client: 1, email: 'gestion@bioferme-coop.fr', town: 'Rennes' },
    { name: 'TechNova Studio', client: 1, email: 'hello@technova-studio.com', town: 'Bordeaux' },
    { name: 'Hôtel des Voyageurs', client: 1, email: 'direction@hotel-voyageurs.fr', town: 'Nice' },
    { name: 'Cabinet Durand & Associés', client: 1, email: 'contact@durand-associes.fr', town: 'Strasbourg' },
    { name: 'Logistique Atlantique', client: 1, email: 'ops@log-atlantique.fr', town: 'Le Havre' },
    { name: 'Pharmacie Centrale', client: 1, email: 'commande@pharma-centrale.fr', town: 'Toulouse' },
    // fournisseurs
    { name: 'ITBS', fournisseur: 1, email: 'christophe.royen@it-bs.fr', town: 'Bordeaux' },
    { name: 'Schneider Electric', fournisseur: 1, email: 'pro@schneider.fr', town: 'Grenoble' },
    { name: 'Papeterie Industrielle SA', fournisseur: 1, email: 'ventes@papeterie-indus.fr', town: 'Angoulême' },
    { name: 'Encres & Cie', fournisseur: 1, email: 'pro@encres-cie.fr', town: 'Tours' },
  ];
  // Résolution fiable des ids : on liste les tiers existants (ids numériques propres)
  // et on matche par email, sinon on crée. (L'endpoint email-by-email renvoie une
  // forme dont l'id n'est pas extractible proprement → socid invalide.)
  const existing = arrOf(await call('dolibarr_thirdparties_list', { limit: 500 }));
  const byEmail = new Map(existing.filter(t => t.email).map(t => [String(t.email).toLowerCase(), prim(t.id) ?? prim(t.rowid)]));
  const parties = [];
  for (const p of partySpecs) {
    let id = byEmail.get(p.email.toLowerCase());
    if (!id) { id = idOf(await callRetry('dolibarr_thirdparty_create', p)); }
    if (ok(`Tiers « ${p.name} » (socid ${id})`, id != null && typeof id !== 'object', `id=${id}`)) parties.push({ id, ...p });
  }
  const clients = parties.filter(t => t.client);

  // ───────────────────────── Étape 2 : Catalogue (services + produits) ─────────────────────────
  console.log('\n=== 2. Catalogue — prestations de service + matériel ===');
  // Refs STABLES (pas de stamp) → idempotent : on réutilise le produit s'il existe
  // déjà (plus de doublons à chaque exécution). type: 0 = produit, 1 = service.
  const catalogSpecs = [
    { ref: 'SRV-CONSEIL', label: 'Prestation de conseil (jour)', type: 1, price: 850, tva_tx: 20 },
    { ref: 'SRV-DEV', label: 'Développement logiciel (jour)', type: 1, price: 700, tva_tx: 20 },
    { ref: 'SRV-FORMATION', label: 'Formation utilisateur (jour)', type: 1, price: 1200, tva_tx: 20 },
    { ref: 'SRV-INFOGERANCE', label: 'Infogérance (forfait mois)', type: 1, price: 450, tva_tx: 20 },
    { ref: 'MAT-NAS', label: 'Serveur NAS Synology DS923+', type: 0, price: 620, tva_tx: 20, stockTarget: 3 },   // stock VOLONTAIREMENT faible → goulot
    { ref: 'MAT-ONDULEUR', label: 'Onduleur APC Smart-UPS 1500VA', type: 0, price: 540, tva_tx: 20, stockTarget: 8 },
    { ref: 'MAT-SWITCH', label: 'Switch réseau 24 ports PoE', type: 0, price: 380, tva_tx: 20, stockTarget: 25 },
    { ref: 'MAT-LICENCE', label: 'Licence Microsoft 365 Business', type: 0, price: 12, tva_tx: 20, stockTarget: 200 },
  ];
  const existingProds = arrOf(await call('dolibarr_products_list', { limit: 2000 }));
  const prodByRef = new Map(existingProds.map(p => [String(p.ref), prim(p.id) ?? prim(p.rowid)]));
  const products = [];
  for (const c of catalogSpecs) {
    let id = prodByRef.get(c.ref);                         // réutilise si déjà créé
    // prix de revient (cost_price) → permet le calcul de MARGE. Services ~45% de coût
    // (forte marge), matériel ~70% (faible marge) → marges réalistes et variées.
    const cost = Math.round(c.price * (c.type === 1 ? 0.45 : 0.70) * 100) / 100;
    if (!id) id = idOf(await call('dolibarr_product_create', { ref: c.ref, label: c.label, type: c.type, price: c.price, cost_price: cost, tva_tx: c.tva_tx, status: 1, status_buy: 1 }));
    // si le produit existait déjà sans coût, on le met à jour (idempotent)
    if (id) await raw(`/products/${id}`, { cost_price: cost }, 'PUT').catch(() => {});
    if (ok(`${c.type === 1 ? 'Service' : 'Produit'} « ${c.label} »`, !!id, id ? `id=${id}` : '')) products.push({ id, ...c });
  }
  const services = products.filter(p => p.type === 1);
  const goods = products.filter(p => p.type === 0);

  // ───────────────────────── Étape 3 : Entrepôt + stock initial ─────────────────────────
  console.log('\n=== 3. Entrepôt & stock initial (mouvements) ===');
  let warehouseId = idOf(arrOf(await call('dolibarr_warehouses_list', { limit: 1 }))[0]);
  if (!warehouseId) warehouseId = idOf(await call('dolibarr_warehouse_create', { label: `Entrepôt principal ${stamp}`, town: 'Bordeaux' }));
  ok('Entrepôt disponible', !!warehouseId, `id=${warehouseId}`);
  if (warehouseId) for (const g of goods) {
    const r = await call('dolibarr_stock_movement_create', { product_id: g.id, warehouse_id: warehouseId, qty: g.stockTarget, type: 0, label: 'Stock initial (seed)' });
    soft(`Stock ${g.stockTarget}× « ${g.label} »`, r.ok, r.ok ? '' : r.error);
  }

  // Compte bancaire (requis pour les paiements). IMPORTANT : il faut un compte de type
  // BANQUE (courant=1). Un compte CAISSE (courant=2) refuse les virements/chèques
  // ("ErrorCashAccountAcceptsOnlyCashMoney"). On réutilise un compte banque existant,
  // sinon on en crée un explicitement avec courant=1.
  // On liste via l'endpoint BRUT (le handler wrappé parse mal cette ressource) et on
  // prend un compte de type BANQUE (courant=1, non clos). La création API échoue en 500
  // sur cette instance → si aucun compte banque, on prévient (à créer 1× dans l'UI).
  const racc = await raw('/bankaccounts', null, 'GET');
  const accounts = Array.isArray(racc) ? racc : (Array.isArray(racc?.data) ? racc.data : arrOf(racc));
  let accountId = idOf(accounts.find(a => String(a.courant) === '1' && String(a.clos) !== '1'));
  if (!accountId) {
    const cr8 = await raw('/bankaccounts', { ref: `BANK-${stamp}`, label: `Compte courant ${stamp}`, courant: 1, type: 1, currency_code: 'EUR', country_id: 1, clos: 0 });
    accountId = idOf(cr8);
  }
  soft('Compte bancaire (banque, courant=1) disponible', accountId != null, accountId != null ? `id=${accountId}` : '⚠️ crée 1 compte « Compte courant » dans Dolibarr (Banque)');

  // ───────────────────────── Étape 4 : Affaires complètes (devis→cmd→facture→paiement) ─────────────────────────
  console.log('\n=== 4. Affaires : devis → commande → facture (avec lignes articles) → paiement ===');
  const made = { proposals: 0, qSigned: 0, qRefused: 0, orders: 0, oDelivered: 0, invoices: 0, paid: 0, overdue: 0, projects: 0, tasks: 0, lines: 0 };
  // Plan de cas par client (cf. RADAR_TEST_PLAN.md) : on force la VARIÉTÉ des états.
  //   quote: signé | refusé | validé(seul)     order: livrée | validée(seul)
  //   invoice: payée | en retard impayée | brouillon(non validée)
  const CASES = [
    { quote: 'signed',  order: 'delivered', invoice: 'paid' },     // deal gagné complet
    { quote: 'refused', order: 'none',      invoice: 'none' },     // devis perdu
    { quote: 'signed',  order: 'validated', invoice: 'overdue' },  // livré mais impayé en retard
    { quote: 'validated', order: 'delivered', invoice: 'paid' },   // en cours de signature
    { quote: 'signed',  order: 'delivered', invoice: 'draft' },    // facture pas encore émise
    { quote: 'signed',  order: 'delivered', invoice: 'paid' },     // 2e deal gagné (récurrence)
    { quote: 'none',    order: 'validated', invoice: 'none' },     // ⚠️ COMMANDE SANS DEVIS — anomalie de flux à détecter
    { quote: 'validated', order: 'validated', invoice: 'overdue' },// en cours, paiement tardif
  ];
  // Sujets de projet variés → typage sémantique (nature) + segments riches.
  const SUBJECTS = ['Refonte site web', 'Migration infrastructure', 'Audit sécurité', 'Déploiement ERP',
    'Campagne impression', 'Formation équipe', 'Maintenance annuelle', 'Étude de faisabilité',
    'Intégration logicielle', 'Fourniture matériel', 'Conseil organisation', 'Développement application'];

  // Plusieurs AFFAIRES par client, ÉTALÉES sur ~6 mois (process mining riche).
  const DEALS_PER_CLIENT = Number(process.env.SEED_DEALS_PER_CLIENT || 4);
  const deals = [];
  for (let ci = 0; ci < clients.length; ci++)
    for (let d = 0; d < DEALS_PER_CLIENT; d++)
      deals.push({ c: clients[ci], gi: deals.length, di: d,
        plan: CASES[(ci + d) % CASES.length],
        age: d * 40 + (ci % 3) * 12,                                  // décalage : étale sur ~6 mois
        subject: SUBJECTS[(ci * DEALS_PER_CLIENT + d) % SUBJECTS.length] });

  console.log(`  → ${deals.length} affaires planifiées (${clients.length} clients × ${DEALS_PER_CLIENT})`);
  for (let g = 0; g < deals.length; g++) {
    const { c, plan, age, subject, di } = deals[g];
    const svc = services[g % services.length];
    const good = goods[g % goods.length];
    const lines = [
      { desc: svc.label, qty: 2 + (g % 4), subprice: svc.price, tva_tx: 20, fk_product: svc.id },
      { desc: good.label, qty: 1 + (g % 3), subprice: good.price, tva_tx: 20, fk_product: good.id },
    ];
    const total = lines.reduce((s, l) => s + l.qty * l.subprice * 1.2, 0);

    // Projet + tâches (titre = sujet varié pour la sémantique)
    const projId = idOf(await callRetry('dolibarr_project_create', { ref: `PJ-${stamp}-${g}`, title: `${subject} — ${c.name}`, socid: c.id }));
    // SANTÉ du projet : sain (avance bien, se clôture) vs EN DIFFICULTÉ (retard, blocage)
    const troubled = plan.invoice === 'overdue' || plan.order === 'validated';
    if (projId) {
      made.projects++;
      // sain : tâches bien avancées/terminées ; en difficulté : tâche BLOQUÉE + retard
      const prog = troubled ? [70, 25, 0] : [100, 100, 90];
      const tlabels = troubled
        ? ['Cadrage', 'Réalisation (en retard)', '⚠️ BLOQUÉ — en attente client']
        : ['Cadrage', 'Réalisation', 'Recette'];
      for (let ti = 0; ti < 3; ti++) {
        const tid = idOf(await call('dolibarr_task_create', { fk_project: projId, label: `${tlabels[ti]} — ${c.name}` }));
        if (tid) { made.tasks++; if (prog[ti]) await call('dolibarr_task_update', { id: tid, progress: prog[ti] }); }
      }
      // clôture du projet SAIN gagné complet → cycle ouvert→fermé ; les projets en
      // difficulté restent OUVERTS (anomalie détectable).
      if (!troubled && plan.invoice === 'paid' && plan.order === 'delivered') await raw(`/projects/${projId}/close`, {});
    }

    // DEVIS → validé, puis signé / refusé selon le plan (rattaché au projet).
    // quote='none' = scénario « commande sans devis » → on NE crée PAS de devis (anomalie).
    // IMPORTANT : sur Dolibarr 23, POST /proposals/{id}/lines est CASSÉ (lignes vides) →
    // on crée le devis AVEC les lignes EMBARQUÉES en une requête (raw POST /proposals).
    const propLines = lines.map(l => ({ ...l, product_type: 0 }));
    const propId = plan.quote === 'none' ? null : idOf(await raw('/proposals', { socid: c.id, date: nowS() - (age + 30) * DAY, fk_project: projId || '', lines: propLines }));
    if (propId) { made.proposals++; made.lines += propLines.length;
      await call('dolibarr_proposal_validate', { id: propId });
      if (plan.quote === 'signed')  { if ((await raw(`/proposals/${propId}/close`, { status: 2 })).ok) made.qSigned++; }
      if (plan.quote === 'refused') { if ((await raw(`/proposals/${propId}/close`, { status: 3 })).ok) made.qRefused++; }
    }

    // COMMANDE → validée, puis livrée selon le plan
    if (plan.order !== 'none') {
      const ordId = idOf(await callRetry('dolibarr_order_create', { socid: c.id, date: nowS() - (age + 22) * DAY, fk_project: projId || '' }));
      if (ordId) { made.orders++;
        for (const l of lines) await call('dolibarr_order_add_line', { id: ordId, ...l });
        await call('dolibarr_order_validate', { id: ordId });
        if (plan.order === 'delivered') { if ((await raw(`/orders/${ordId}/close`, {})).ok) made.oDelivered++; }
      }
    }

    // FACTURE → brouillon | émise | payée | en retard impayée
    if (plan.invoice !== 'none') {
      const overdue = plan.invoice === 'overdue';
      const invId = idOf(await callRetry('dolibarr_invoice_create', { socid: c.id, date: nowS() - (age + 15) * DAY, date_lim_reglement: nowS() - (age + (overdue ? 20 : 5)) * DAY, fk_project: projId || '' }));
      if (invId) { made.invoices++;
        for (const l of lines) if ((await call('dolibarr_invoice_add_line', { id: invId, ...l })).ok) made.lines++;
        if (plan.invoice !== 'draft') {                       // 'draft' = on laisse en brouillon
          const v = await call('dolibarr_invoice_validate', { id: invId });
          if (v.ok && plan.invoice === 'paid') {
            const pay = await call('dolibarr_payment_create', { id: invId, datepaye: nowS() - (age + 3) * DAY, amount: Math.round(total * 100) / 100, paymentid: 2, closepaidinvoices: 'yes', accountid: accountId });
            if (pay.ok) made.paid++; else if (g < 3) console.log(`  ⚠️  Paiement « ${c.name} » — ${pay.error}`);
          } else if (v.ok && overdue) made.overdue++;
        }
      }
    }
    // Ticket d'INCIDENT pour les affaires en difficulté (retard/blocage) → SAV/support
    if (troubled) {
      const sev = g % 4 === 0 ? 'HIGH' : 'NORMAL';
      const ti = idOf(await call('dolibarr_ticket_create', { subject: `Incident — ${subject} (${c.name})`,
        message: `Problème signalé sur l'affaire « ${subject} » du client ${c.name} : retard de livraison / blocage. Client mécontent, à traiter en priorité.`,
        fk_soc: c.id, severity_code: sev }));
      if (ti) { made.incidents = (made.incidents || 0) + 1; if (g % 3 === 0) await call('dolibarr_ticket_update', { id: ti, status: 1 }); }
    }
    if (g < 8 || g % 12 === 0) console.log(`  ✅ ${c.name} : ${subject} — devis=${plan.quote} cmd=${plan.order} facture=${plan.invoice}${troubled ? ' ⚠️ EN DIFFICULTÉ' : ''}`);
  }
  console.log(`  → ${made.proposals} devis · ${made.orders} commandes · ${made.invoices} factures (${made.paid} payées) · ${made.projects} projets · ${made.incidents || 0} incidents`);

  // ───────────────────────── Étape 4c : ACHATS — factures fournisseurs ─────────────────────────
  console.log('\n=== 4c. Achats : factures fournisseurs (matières, sous-traitance) ===');
  const suppliers = parties.filter(t => t.fournisseur);
  const purchaseLabels = ['Matières premières — carton', 'Encres d\'impression', 'Sous-traitance découpe', 'Maintenance machines', 'Fournitures bureau', 'Licences logicielles'];
  let supInv = 0, supPaid = 0;
  for (let si = 0; si < suppliers.length; si++) {
    const s = suppliers[si];
    for (let k = 0; k < 3; k++) {                                  // 3 factures fournisseur par fournisseur
      const age = k * 35 + si * 10;
      const amount = 200 + ((si * 3 + k) % 6) * 350;
      const r = await raw('/supplierinvoices', { socid: s.id, type: 0, date: nowS() - (age + 18) * DAY,
        ref_supplier: `FF-${stamp}-${si}-${k}`, label: `${purchaseLabels[(si * 3 + k) % purchaseLabels.length]} — ${s.name}` });
      const invId = idOf(r);
      if (!invId) continue;
      supInv++;
      await raw(`/supplierinvoices/${invId}/lines`, { fk_product: (goods[k % goods.length] || {}).id || 0, qty: 1 + (k % 3), pu_ht: amount, tva_tx: 20, product_type: 0, desc: purchaseLabels[(si * 3 + k) % purchaseLabels.length] });
      await raw(`/supplierinvoices/${invId}/validate`, {});
      // ~la moitié payées, le reste en attente (dette fournisseur)
      if ((si + k) % 2 === 0) { const p = await raw(`/supplierinvoices/${invId}/payments`, { datepaye: nowS() - (age + 2) * DAY, amount, accountid: accountId, paymentid: 2 }); if (p.status < 400 || p.ok) supPaid++; }
    }
  }
  ok('Factures fournisseurs (achats)', supInv > 0, `${supInv} créées (${supPaid} payées)`);

  // ───────────────────────── Étape 4d : Contacts CRM (interlocuteurs clients) ─────────────────────────
  console.log('\n=== 4d. Contacts CRM (interlocuteurs chez les clients) ===');
  const firstNames = ['Marie', 'Pierre', 'Sophie', 'Thomas', 'Julie', 'Nicolas', 'Camille', 'Laurent', 'Émilie', 'Antoine', 'Claire', 'David', 'Léa', 'Hugo'];
  const postes = ['Directeur achats', 'Responsable technique', 'Comptable', 'Directeur général', 'Chef de projet', 'Responsable SI'];
  let contacts = 0;
  for (let ci = 0; ci < clients.length; ci++) {
    const c = clients[ci];
    for (let n = 0; n < 2; n++) {                                  // 2 interlocuteurs par client
      const fn = firstNames[(ci * 2 + n) % firstNames.length];
      const r = await call('dolibarr_contact_create', { lastname: c.name.split(' ')[0], firstname: fn,
        email: `${fn.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@${(c.email || 'x@x').split('@')[1]}`,
        socid: c.id, poste: postes[(ci * 2 + n) % postes.length] });
      if (idOf(r)) contacts++;
    }
  }
  ok('Contacts CRM (interlocuteurs)', contacts > 0, `${contacts} contacts`);

  // ───────────────────────── Étape 4e : LEADS / prospects (pipeline commercial) ─────────────────────────
  console.log('\n=== 4e. Leads commerciaux (prospects à convertir) ===');
  const leadSpecs = [
    { name: 'Prospect — Restaurant Le Gourmet', email: 'contact@le-gourmet.fr', town: 'Dijon' },
    { name: 'Prospect — Startup GreenTech', email: 'hello@greentech.io', town: 'Montpellier' },
    { name: 'Prospect — Mairie de Vannes', email: 'si@vannes.fr', town: 'Vannes' },
    { name: 'Prospect — Imprimerie Rapide', email: 'devis@imprimerie-rapide.fr', town: 'Reims' },
    { name: 'Prospect — Cabinet Médical Saint-Roch', email: 'secretariat@cabinet-saintroch.fr', town: 'Avignon' },
  ];
  let leads = 0, leadProps = 0;
  for (let li = 0; li < leadSpecs.length; li++) {
    const ls = leadSpecs[li];
    let id = byEmail.get(ls.email.toLowerCase());
    if (!id) id = idOf(await callRetry('dolibarr_thirdparty_create', { ...ls, client: 2 }));   // client=2 = PROSPECT
    if (!id) continue;
    leads++;
    // opportunité ouverte : un devis en brouillon/validé (pas encore signé) = lead dans le pipeline
    const svc = services[li % services.length];
    const propId = idOf(await raw('/proposals', { socid: id, date: nowS() - (li * 7 + 5) * DAY, lines: [{ desc: svc.label, qty: 1 + li, subprice: svc.price, tva_tx: 20, fk_product: svc.id, product_type: 0 }] }));
    if (propId) { leadProps++;
      if (li % 2 === 0) await call('dolibarr_proposal_validate', { id: propId });   // moitié envoyés, moitié en cours de rédaction
    }
  }
  ok('Leads / prospects (pipeline)', leads > 0, `${leads} prospects, ${leadProps} opportunités ouvertes`);

  // ───────────────────────── Étape 5 : Support (tickets clients, cycle de vie) ─────────────────────────
  console.log('\n=== 5. Tickets support (reçu → résolu/fermé) ===');
  // état cible varié : 8=fermé, 1=lu/en cours, 0=non lu (reçu). On le pose via
  // ticket_update(status) → le backfill ancre la transition sur la dernière modif.
  const ticketSpecs = [
    { subject: 'Serveur NAS inaccessible', message: 'Le NAS ne répond plus depuis ce matin.', soc: clients[0], status: 8 },
    { subject: 'Demande de formation supplémentaire', message: 'Besoin d\'une session pour 3 nouveaux arrivants.', soc: clients[1], status: 1 },
    { subject: 'Onduleur en défaut batterie', message: 'Voyant rouge sur l\'onduleur APC.', soc: clients[2], status: 8 },
    { subject: 'Lenteur applicative', message: 'L\'ERP est très lent en fin de journée.', soc: clients[3 % clients.length], status: 0 },
  ];
  let tk = 0, tkClosed = 0;
  for (const t of ticketSpecs) {
    if (!t.soc) continue;
    const id = idOf(await call('dolibarr_ticket_create', { subject: t.subject, message: t.message, fk_soc: t.soc.id }));
    if (id) { tk++; if (t.status) { const u = await call('dolibarr_ticket_update', { id, status: t.status }); if (u.ok && t.status === 8) tkClosed++; } }
  }
  ok('Tickets créés', tk > 0, `${tk} (dont ${tkClosed} fermés)`);

  // ───────────────────────── Récap ─────────────────────────
  console.log('\n=== RÉSUMÉ ===');
  console.log(`  Tiers ${parties.length} · Catalogue ${products.length} (${services.length} services / ${goods.length} produits)`);
  console.log(`  Devis : ${made.proposals} (${made.qSigned} signés, ${made.qRefused} refusés) · Commandes : ${made.orders} (${made.oDelivered} livrées)`);
  console.log(`  Factures : ${made.invoices} (${made.paid} payées, ${made.overdue} en retard impayées) · ${made.lines} lignes d'articles`);
  console.log(`  Projets ${made.projects} · Tâches ${made.tasks} · Tickets ${tk} (${tkClosed} fermés)`);
  console.log(`\n  ${pass} OK / ${warn} avert. / ${fail} KO`);
  console.log('  → Lance ensuite la synchro Radar du connecteur Dolibarr pour ingérer tout ça (familles : crm, accounting, productivity, support, catalog).');
  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
