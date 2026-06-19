#!/usr/bin/env node
// Seed PRODUCTION (industrie) + arborescence NEXTCLOUD, pour visualiser et tester.
// - Dolibarr : produit fini assemblé via une nomenclature (BOM) + ordre de
//   fabrication (MO) consommant des matières premières ; stock matières VOLONTAIREMENT
//   bas → goulot de production réel.
// - Nextcloud : arborescence /RadarDemo/Clients/<client>/{Devis,Factures,Production}
//   avec des fichiers, pour voir la hiérarchie dans la Mémoire.
//
//   node scripts/seed-dolibarr-production.js
//
// Idempotent (refs stables, réutilise l'existant).

const path = require('path'), fs = require('fs'), mongoose = require('mongoose');
try { const p = path.resolve(__dirname, '../.env'); if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const nowS = () => Math.floor(Date.now() / 1000);

(async () => {
  await mongoose.connect(process.env.MONGO_URL + process.env.MONGO_DB_NAME);
  const Credential = require('../src/db/models/credential.model');
  const { decrypt } = require('../src/utils/enc');
  const { registry } = require('../src/plugins/registry');
  const _l = console.log; console.log = () => {}; await registry.loadFromDir(path.resolve(__dirname, '../src/plugins/repos'), null); console.log = _l;
  const prim = (v) => (typeof v === 'string' || typeof v === 'number') ? v : null;
  const idOf = (r) => { if (!r) return null; return prim(r.id) ?? prim(r.rowid) ?? prim(r.data && r.data.id) ?? prim(r.data); };
  const arrOf = (r) => (r && r.ok) ? (Object.values(r).find(v => Array.isArray(v)) || []) : [];

  // ───────── Dolibarr : production ─────────
  const dol = await Credential.findOne({ providerKey: 'dolibarr' }).lean();
  const dopts = { credentials: decrypt(dol.secret), log: () => {} };
  const dcall = async (k, a) => { const fn = registry.resolve(k); if (!fn) return { ok: false, error: 'no_handler:' + k }; try { return await fn({ id: 't', model: {} }, { payload: {} }, a, dopts); } catch (e) { return { ok: false, error: e.message }; } };

  console.log('=== Dolibarr : produits de production (fini + matières) ===');
  const prodSpecs = [
    { ref: 'FIN-CARTON-IMP', label: 'Carton imprimé personnalisé', type: 0, price: 4.5, stock: 20 },     // produit fini
    { ref: 'MP-CARTON-BRUT', label: 'Carton brut (plaque)', type: 0, price: 1.2, stock: 8 },             // matière (stock BAS → goulot)
    { ref: 'MP-ENCRE', label: 'Encre d\'impression (litre)', type: 0, price: 18, stock: 3 },             // matière (stock TRÈS BAS)
  ];
  const existing = arrOf(await dcall('dolibarr_products_list', { limit: 2000 }));
  const byRef = new Map(existing.map(p => [String(p.ref), prim(p.id) ?? prim(p.rowid)]));
  const prod = {};
  for (const s of prodSpecs) {
    let id = byRef.get(s.ref);
    if (!id) id = idOf(await dcall('dolibarr_product_create', { ref: s.ref, label: s.label, type: s.type, price: s.price, status: 1, status_buy: 1 }));
    prod[s.ref] = id; console.log(`  ${id ? '✅' : '❌'} ${s.label} (id=${id})`);
  }

  // entrepôt + stock (matières basses → tension)
  let wh = idOf(arrOf(await dcall('dolibarr_warehouses_list', { limit: 1 }))[0]);
  if (wh) for (const s of prodSpecs) if (prod[s.ref]) await dcall('dolibarr_stock_movement_create', { product_id: prod[s.ref], warehouse_id: wh, qty: s.stock, type: 0, label: 'Stock initial production' });

  // nomenclature (BOM) du produit fini + ordre de fabrication (MO)
  console.log('=== Nomenclature (BOM) + ordre de fabrication (MO) ===');
  const stamp = Date.now().toString().slice(-5);
  const bomId = idOf(await dcall('dolibarr_bom_create', { ref: `BOM-CARTON-${stamp}`, label: 'Nomenclature Carton imprimé', fk_product: prod['FIN-CARTON-IMP'], qty: 1, bomtype: 0, status: 1 }));
  console.log(`  ${bomId ? '✅' : '⚠️'} BOM Carton imprimé (id=${bomId})`);
  let moOk = 0;
  for (const [i, q] of [[0, 500], [1, 300], [2, 150]]) {
    const mo = await dcall('dolibarr_mo_create', { ref: `MO-CARTON-${stamp}-${i}`, fk_product: prod['FIN-CARTON-IMP'], fk_bom: bomId || '', qty: q, fk_warehouse: wh || '', mrptype: 0, status: i === 0 ? 1 : 0, date_start_planned: nowS() + i * 86400 });
    if (mo.ok && idOf(mo)) moOk++; else console.log(`  ⚠️  MO ${i} — ${mo.error}`);
  }
  console.log(`  ${moOk} ordre(s) de fabrication créé(s)`);

  // ───────── Nextcloud : arborescence ─────────
  console.log('\n=== Nextcloud : arborescence /RadarDemo ===');
  const nc = await Credential.findOne({ providerKey: 'nextcloudFiles' }).lean();
  if (nc) {
    const nopts = { credentials: decrypt(nc.secret), log: () => {} };
    const ncall = async (k, a) => { const fn = registry.resolve(k); if (!fn) return { ok: false }; try { return await fn({ id: 't', model: {} }, { payload: {} }, a, nopts); } catch (e) { return { ok: false, error: e.message }; } };
    const mkdir = async (p) => { const r = await ncall('nc_folder_create', { path: p }); return r.ok; };
    const put = async (p, content) => ncall('nc_file_upload', { path: p, content: Buffer.from(content).toString('base64') });
    // Map socid → nom du tiers, puis refs RÉELLES par client (devis/commande/facture).
    // Les fichiers sont nommés d'après ces refs → le Radar relie le PDF à la VRAIE pièce.
    const tiers = arrOf(await dcall('dolibarr_thirdparties_list', { limit: 200 }));
    const nameBySoc = new Map(tiers.map(t => [String(t.id || t.rowid), t.name]));
    const byClient = new Map();   // nom client → { Devis:[row], Factures:[row], Commandes:[row] }
    const collect = (rows, bucket) => { for (const r of arrOf(rows)) { const n = nameBySoc.get(String(r.socid || r.fk_soc)); if (!n || !r.ref) continue; const e = byClient.get(n) || { Devis: [], Factures: [], Commandes: [] }; e[bucket].push(r); byClient.set(n, e); } };
    collect(await dcall('dolibarr_proposals_list', { limit: 200 }), 'Devis');
    collect(await dcall('dolibarr_orders_list', { limit: 200 }), 'Commandes');
    collect(await dcall('dolibarr_invoices_list', { limit: 200 }), 'Factures');

    const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' €';
    const dt = (u) => { const n = Number(u); return n ? new Date(n * 1000).toLocaleDateString('fr-FR') : 'n/a'; };
    // VRAI contenu : la pièce y est décrite (réf, client, montant, date, échéance) →
    // donne de la matière au LLM (corrélation + RAG) ; on pourra retrouver le doc par sujet.
    const body = (kind, r, c) => [
      `${kind.toUpperCase()} ${r.ref}`, `Client : ${c}`,
      `Montant TTC : ${eur(r.total_ttc)}`, `Date : ${dt(r.date)}`,
      r.date_lim_reglement ? `Échéance de règlement : ${dt(r.date_lim_reglement)}` : '',
      r.note_public ? `Objet : ${r.note_public}` : '',
      '', `Référence interne : ${r.ref} — pièce ${kind} du client ${c}.`,
    ].filter(Boolean).join('\n');

    let folders = 0, files = 0;
    await mkdir('/RadarDemo'); folders++;
    await mkdir('/RadarDemo/Clients'); folders++;
    const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '-');
    // Contenus métier RÉELS et VARIÉS (pour tester corrélation, RAG, recherche par sujet).
    const contratCadre = (c) => `CONTRAT CADRE DE PRESTATION\nEntre : C4rbon Group (le Prestataire)\nEt : ${c} (le Client)\n\nArticle 1 — Objet : fourniture et impression de cartonnage personnalisé, prestations associées.\nArticle 2 — Durée : 12 mois reconductibles.\nArticle 3 — Tarifs : selon devis acceptés, révisables annuellement.\nArticle 4 — Délais : livraison sous 15 jours ouvrés après bon pour accord.\nArticle 5 — Pénalités de retard : 2% du montant par semaine de retard.\nArticle 6 — Confidentialité : voir accord de confidentialité annexé.\nFait pour le client ${c}.`;
    const nda = (c) => `ACCORD DE CONFIDENTIALITÉ (NDA)\nEntre C4rbon Group et ${c}.\n\nLes parties s'engagent à ne pas divulguer les informations confidentielles échangées dans le cadre de leur collaboration : plans techniques, tarifs, données commerciales, savoir-faire d'impression.\nDurée de l'engagement : 5 ans après la fin de la relation.\nTout manquement expose à des dommages et intérêts.\nClient concerné : ${c}.`;
    const analyseTech = (c) => `ANALYSE TECHNIQUE — Dossier ${c}\n\nObjet : étude de faisabilité de l'impression cartonnage pour ${c}.\n1. Support : carton ondulé double cannelure, grammage 450 g/m².\n2. Impression : quadrichromie offset + vernis sélectif.\n3. Contraintes : tenue à l'humidité, résistance à l'empilage (BCT > 12 kg).\n4. Risques identifiés : variation colorimétrique sur tirage long, tension sur le stock d'encre.\n5. Recommandation : valider un bon à tirer (BAT) avant lancement de l'ordre de fabrication.\nConclusion : faisable sous réserve du BAT et d'un réapprovisionnement encre.`;

    for (const [c, deals] of byClient) {
      const base = `/RadarDemo/Clients/${safe(c)}`;
      if (await mkdir(base)) folders++;
      for (const sub of ['Devis', 'Factures', 'Commandes', 'Contrats', 'Confidentialité', 'Analyses techniques']) { if (await mkdir(`${base}/${sub}`)) folders++; }
      // un fichier par pièce réelle, nommé avec la VRAIE réf + contenu réel décrivant la pièce
      for (const r of deals.Devis)     { if ((await put(`${base}/Devis/Devis_${safe(r.ref)}.txt`, body('Devis', r, c))).ok) files++; }
      for (const r of deals.Commandes) { if ((await put(`${base}/Commandes/Commande_${safe(r.ref)}.txt`, body('Commande', r, c))).ok) files++; }
      for (const r of deals.Factures)  { if ((await put(`${base}/Factures/Facture_${safe(r.ref)}.txt`, body('Facture', r, c))).ok) files++; }
      // documents juridiques + techniques (sujets variés → testent la recherche/RAG)
      if ((await put(`${base}/Contrats/Contrat_cadre_${safe(c)}.txt`, contratCadre(c))).ok) files++;
      if ((await put(`${base}/Confidentialité/NDA_${safe(c)}.txt`, nda(c))).ok) files++;
      if ((await put(`${base}/Analyses techniques/Analyse_technique_${safe(c)}.txt`, analyseTech(c))).ok) files++;
    }
    console.log(`  ✅ ${folders} dossiers, ${files} fichiers (Clients : pièces + contrats + NDA + analyses techniques) sous /RadarDemo`);

    // Arborescence PROJET façon bureau d'étude : dossiers nommés d'après les VRAIS
    // projets Dolibarr (corrélés ensuite à l'entité Projet par le nom).
    const projs = arrOf(await dcall('dolibarr_projects_list', { limit: 30 }))
      .map(p => p.title || p.ref).filter(Boolean).slice(0, 8);
    let pf = 0, pfi = 0;
    await mkdir('/RadarDemo/Projets'); pf++;
    for (const title of projs) {
      const safe = title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
      const base = `/RadarDemo/Projets/${safe}`;
      if (await mkdir(base)) pf++;
      for (const sub of ['Plans', 'CAO', 'Documents', 'Livrables', 'Notes de calcul']) { if (await mkdir(`${base}/${sub}`)) pf++; }
      if ((await put(`${base}/CAO/modele.step`, `Modèle CAO du projet ${title}`)).ok) pfi++;
      if ((await put(`${base}/Plans/plan-ensemble.txt`, `PLAN D'ENSEMBLE — ${title}\nÉchelle 1:10. Cotes principales et nomenclature des sous-ensembles du projet ${title}.`)).ok) pfi++;
      if ((await put(`${base}/Documents/cahier-des-charges.txt`, `CAHIER DES CHARGES — ${title}\n\n1. Besoin : ${title}.\n2. Exigences fonctionnelles : résistance, ergonomie, conformité.\n3. Exigences techniques : matériaux, tolérances, normes applicables.\n4. Livrables attendus : plans, notes de calcul, prototype.\n5. Planning : jalons de conception, validation, production.`)).ok) pfi++;
      if ((await put(`${base}/Notes de calcul/note-dimensionnement.txt`, `NOTE DE CALCUL — ${title}\n\nDimensionnement structurel : charges appliquées, coefficients de sécurité, vérification de la tenue mécanique. Résultat : conforme aux exigences du cahier des charges du projet ${title}.`)).ok) pfi++;
      if ((await put(`${base}/Livrables/rapport-final.txt`, `RAPPORT FINAL — ${title}\n\nSynthèse du projet ${title} : objectifs atteints, écarts éventuels, recommandations. Document technique de clôture.`)).ok) pfi++;
    }
    console.log(`  ✅ ${pf} dossiers, ${pfi} fichiers (Projets, façon bureau d'étude) sous /RadarDemo/Projets`);
  } else console.log('  ⚠️  pas de credential nextcloudFiles');

  console.log('\n→ Lance la synchro radar pour ingérer production + arborescence.');
  await mongoose.disconnect();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
