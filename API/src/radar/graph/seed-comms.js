// Couche COMMUNICATION simulée, branchée sur les VRAIES affaires.
//
// On n'a pas (encore) de connecteur email réel, mais le cycle d'affaire passe par
// des mails : validation de devis, rappel d'échéance, relance de facture en retard.
// On génère donc ces emails et on les RELIE aux entités réelles (client + pièce),
// pour enrichir le process cross-logiciel (le système "Email" apparaît dans le parcours).
//
// Idempotent (upsert par clé déterministe). Daté en cohérence avec la pièce liée.

const DAY = 86400000;
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
function docDate(e) {
  const a = e.attributes || {};
  const c = num(a.date) || num(a.startDate);
  if (c) return new Date(c < 1e12 ? c * 1000 : c);
  return e.firstSeenAt ? new Date(e.firstSeenAt) : new Date();
}

/** Génère les emails simulés reliés aux affaires réelles. @returns {{emails:number, relations:number}} */
async function seedSimulatedComms(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey aliasKeys label').lean();
  if (!clients.length) return { emails: 0, relations: 0 };
  const clientKeys = new Set(clients.map(c => c.canonicalKey));
  const labelOf = new Map(clients.map(c => [c.canonicalKey, c.label]));
  // résolveur alias→canonique du CLIENT (les relations party_of pointent souvent vers
  // une clé alias « dolibarr:party:N » → on doit la ramener à la clé canonique).
  const clientCanon = new Map();
  for (const c of clients) { clientCanon.set(c.canonicalKey, c.canonicalKey); for (const a of c.aliasKeys || []) clientCanon.set(a, c.canonicalKey); }

  // transactions rattachées à un client (via party_of), avec leur client
  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: { $in: ['quote', 'order', 'invoice'] } })
    .select('canonicalKey aliasKeys subtype label attributes firstSeenAt').lean();
  const keyToCanon = new Map();
  for (const t of txs) { keyToCanon.set(t.canonicalKey, t.canonicalKey); for (const a of t.aliasKeys || []) keyToCanon.set(a, t.canonicalKey); }
  // projets + tickets, avec leur client (pour relier les emails aux bons sujets)
  const projects = await RadarEntity.find({ workspaceId, coreType: 'Project' }).select('canonicalKey aliasKeys label').lean();
  const tickets = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: 'ticket' }).select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  for (const p of projects) { keyToCanon.set(p.canonicalKey, p.canonicalKey); for (const a of p.aliasKeys || []) keyToCanon.set(a, p.canonicalKey); }
  for (const t of tickets) { keyToCanon.set(t.canonicalKey, t.canonicalKey); for (const a of t.aliasKeys || []) keyToCanon.set(a, t.canonicalKey); }

  const rels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOfTx = new Map();
  const clientProject = new Map();   // client → 1 projet (pour rattacher les emails au projet)
  const clientTickets = new Map();   // client → [tickets]
  for (const r of rels) {
    const f = keyToCanon.get(r.fromKey);
    const ck = clientCanon.get(r.toKey);                 // résout l'alias client → canonique
    if (!f || !ck) continue;
    clientOfTx.set(f, ck);
    if (projects.some(p => p.canonicalKey === f)) { if (!clientProject.has(ck)) clientProject.set(ck, f); }
    if (tickets.some(t => t.canonicalKey === f)) { const a = clientTickets.get(ck) || []; a.push(f); clientTickets.set(ck, a); }
  }

  let emails = 0, relations = 0;
  const now = Date.now();
  const upsertEmail = async (key, label, at, links, sentiment = 'neutre', body = '') => {
    await RadarEntity.updateOne(
      { workspaceId, canonicalKey: key },
      { $set: { coreType: 'Communication', subtype: 'email', label, roles: [],
        attributes: { date: Math.floor(new Date(at).getTime() / 1000), sentiment, body: body || label },
        sources: [{ providerKey: 'gmail', externalId: key }] },
        $setOnInsert: { firstSeenAt: new Date(at), lastSeenAt: new Date(now) } },
      { upsert: true }
    );
    emails++;
    for (const [to, role] of links) {
      if (!to) continue;
      await RadarRelation.updateOne(
        { workspaceId, fromKey: key, toKey: to, type: 'references', role },
        { $set: { confidence: 1, source: 'simulation' } }, { upsert: true }
      ).catch(() => {});
      relations++;
    }
  };

  for (const t of txs) {
    const clientKey = clientOfTx.get(t.canonicalKey); if (!clientKey) continue;
    const cname = labelOf.get(clientKey) || 'client';
    const projKey = clientProject.get(clientKey);            // email aussi rattaché au PROJET du client
    const d = docDate(t).getTime();
    const links = (docKey) => [[clientKey, 'client'], [docKey, 'about'], [projKey, 'project']];
    if (t.subtype === 'quote') {
      await upsertEmail(`gmail:email:devis_env_${t.canonicalKey}`, `Envoi du devis ${t.label} à ${cname}`, d + 1 * DAY, links(t.canonicalKey), 'neutre');
      const refused = t.attributes?.state === 'refusé';
      if (refused) await upsertEmail(`gmail:email:devis_refus_${t.canonicalKey}`, `Devis ${t.label} non retenu — trop cher`, d + 6 * DAY, links(t.canonicalKey), 'négatif', `Bonjour, après étude nous ne donnons pas suite à votre devis ${t.label}, le tarif dépasse notre budget. Cordialement.`);
      else await upsertEmail(`gmail:email:devis_val_${t.canonicalKey}`, `Validation du devis ${t.label} — c'est parfait, on lance !`, d + 3 * DAY, links(t.canonicalKey), 'positif', `Merci, le devis ${t.label} nous convient parfaitement. Bon à signer, lançons le projet !`);
    } else if (t.subtype === 'invoice') {
      await upsertEmail(`gmail:email:fact_env_${t.canonicalKey}`, `Envoi de la facture ${t.label}`, d + 1 * DAY, links(t.canonicalKey), 'neutre');
      const paid = (t.attributes?.payment_state === 'payée' || t.attributes?.state === 'payée');
      if (paid) {
        await upsertEmail(`gmail:email:fact_merci_${t.canonicalKey}`, `Paiement effectué — merci pour votre service`, d + 8 * DAY, links(t.canonicalKey), 'positif', `Bonjour, le règlement de la facture ${t.label} est parti. Très satisfaits de la prestation, à bientôt.`);
      } else {
        await upsertEmail(`gmail:email:fact_relance_${t.canonicalKey}`, `Relance — facture ${t.label} en attente de paiement`, d + 20 * DAY, links(t.canonicalKey), 'neutre');
        // PLAINTE client : facture impayée en retard → mécontentement (sentiment négatif)
        await upsertEmail(`gmail:email:fact_plainte_${t.canonicalKey}`, `RÉCLAMATION — retard de livraison sur ${t.label}`, d + 25 * DAY, links(t.canonicalKey), 'négatif', `Bonjour, c'est inadmissible : la livraison liée à la facture ${t.label} a énormément de retard et personne ne nous répond. Nous sommes très mécontents et envisageons de ne pas régler. Merci de réagir vite.`);
      }
    }
  }

  // Emails de SUPPORT reliés aux TICKETS — sentiment NÉGATIF (incident, client agacé)
  for (const tk of tickets) {
    const clientKey = clientOfTx.get(tk.canonicalKey); if (!clientKey) continue;
    const at = (tk.firstSeenAt ? new Date(tk.firstSeenAt).getTime() : now) + 1 * DAY;
    const incident = /incident|bloqu|panne|défaut|lenteur|inaccessible/i.test(tk.label || '');
    await upsertEmail(`gmail:email:ticket_${tk.canonicalKey}`, `Re: ${tk.label}`, at, [[clientKey, 'client'], [tk.canonicalKey, 'about_ticket']],
      incident ? 'négatif' : 'neutre', incident ? `Bonjour, le problème « ${tk.label} » n'est toujours pas résolu, cela impacte notre activité. Merci d'intervenir d'urgence.` : `Re: ${tk.label} — prise en charge.`);
  }

  // Processus ACHAT / FACTURE FOURNISSEUR : réception d'un mail (avec PJ) → saisie de
  // la facture fournisseur → rattachement au tiers. On relie les emails au fournisseur
  // (et à la facture fournisseur si elle existe) pour que ce processus soit riche.
  const suppliers = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'supplier' }).select('canonicalKey label').lean();
  const supInvoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'supplier_invoice' }).select('canonicalKey aliasKeys label attributes firstSeenAt').lean();
  const supInvByCanon = new Map();
  for (const si of supInvoices) { supInvByCanon.set(si.canonicalKey, si); for (const a of si.aliasKeys || []) supInvByCanon.set(a, si); }
  // facture fournisseur → fournisseur (via party_of role supplier)
  const supRels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const supplierKeys = new Set(suppliers.map(s => s.canonicalKey));
  for (const s of suppliers) {
    const sname = s.label;
    // les factures fournisseur de ce fournisseur
    const myInv = supInvoices.filter(si => supRels.some(r => (keyToCanon.get(r.fromKey) === si.canonicalKey || (si.aliasKeys || []).includes(r.fromKey)) && r.toKey === s.canonicalKey));
    const base = `${sname}`;
    const t0 = now - 25 * DAY;
    // 1) réception mail avec pièce jointe
    await upsertEmail(`gmail:email:fourn_recu_${s.canonicalKey}`, `Facture fournisseur reçue (PJ) — ${base}`, t0, [[s.canonicalKey, 'supplier'], ...(myInv[0] ? [[myInv[0].canonicalKey, 'about']] : [])]);
    // 2) saisie / validation dans l'ERP
    await upsertEmail(`gmail:email:fourn_saisie_${s.canonicalKey}`, `Saisie de la facture fournisseur — ${base}`, t0 + 2 * DAY, [[s.canonicalKey, 'supplier'], ...(myInv[0] ? [[myInv[0].canonicalKey, 'about']] : [])]);
    // 3) bon à payer
    await upsertEmail(`gmail:email:fourn_bap_${s.canonicalKey}`, `Bon à payer — ${base}`, t0 + 5 * DAY, [[s.canonicalKey, 'supplier'], ...(myInv[0] ? [[myInv[0].canonicalKey, 'about']] : [])]);
  }

  return { emails, relations };
}

/**
 * Issues d'affaires SIMULÉES (gated RADAR_SIMULATE) : donne de la VARIÉTÉ réaliste aux
 * devis (gagné/signé, perdu/refusé) quand l'API source ne l'a pas produite. Émet des
 * RadarDelta datés (le moteur les lit comme de vrais changements d'état). Le mapping
 * traduit les codes (3→refusé). Idempotent.
 * @returns {Promise<{ outcomes }>}
 */
async function seedDealOutcomes(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarDelta = require('../../db/models/radar-delta.model');
  const RadarConnector = require('../../db/models/radar-connector.model');
  const conn = await RadarConnector.findOne({ workspaceId, providerKey: 'dolibarr' }).select('_id').lean();
  if (!conn) return { outcomes: 0 };
  const quotes = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'quote' }).select('canonicalKey aliasKeys attributes firstSeenAt').lean();
  const now = Date.now();
  const rawIdOf = (e) => { for (const a of [e.canonicalKey, ...(e.aliasKeys || [])]) { const p = String(a).split(':'); if (p[1] === 'quote') return p[2]; } return null; };
  let outcomes = 0;
  for (let i = 0; i < quotes.length; i++) {
    const q = quotes[i]; const id = rawIdOf(q); if (!id) continue;
    // On REMPLACE toute trace antérieure de ce devis (backfill + anciennes sims) pour
    // garantir UNE timeline propre et MONOTONE (sinon brouillon↔signé incohérent).
    await RadarDelta.deleteMany({ workspaceId, entityType: 'quote', entityKey: id });
    // distribution réaliste : ~25% perdus (refusé=3), ~55% gagnés (signé=2), reste validé(1)
    const r = i % 4; const finalState = r === 0 ? '3' : (r === 3 ? '1' : '2');
    const base = q.firstSeenAt ? new Date(q.firstSeenAt).getTime() : now - 30 * DAY;
    const steps = finalState === '1' ? [['0', 0], ['1', 3]] : [['0', 0], ['1', 3], [finalState, 7]];
    for (const [st, dAgo] of steps) {
      await RadarDelta.updateOne({ id: `sim_outcome_quote_${id}_${st}` },
        { $set: { workspaceId, connectorId: conn._id, family: 'crm', entityType: 'quote', entityKey: id,
          type: st === '0' ? 'created' : 'updated', after: { statut: st }, occurredAt: new Date(base + dAgo * DAY), status: 'consumed' } },
        { upsert: true });
    }
    outcomes++;
  }
  return { outcomes };
}

/**
 * Crée un nœud PAIEMENT pour chaque facture payée, relié à la facture (relation `pays`)
 * et au client (`party_of`) → on VOIT le paiement dans la mémoire, rattaché à sa facture.
 * Dérivé de l'état réel (payment_state='payée'). Idempotent. @returns {{ payments }}
 */
async function seedPayments(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  const invoices = await RadarEntity.find({ workspaceId, coreType: 'Transaction', subtype: 'invoice' })
    .select('canonicalKey label attributes firstSeenAt').lean();
  // client de chaque facture (via party_of)
  const rels = await RadarRelation.find({ workspaceId, type: 'party_of' }).select('fromKey toKey').lean();
  const clientOf = new Map(); for (const r of rels) if (!clientOf.has(r.fromKey)) clientOf.set(r.fromKey, r.toKey);
  let payments = 0;
  for (const inv of invoices) {
    if (inv.attributes?.payment_state !== 'payée' && inv.attributes?.state !== 'payée') continue;
    const key = `payment:${inv.canonicalKey}`;
    const rawAmt = inv.attributes?.total_ttc || inv.attributes?.amount_total;
    const amount = rawAmt != null ? Math.round(Number(rawAmt) * 100) / 100 : null;
    const at = docDate(inv);
    await RadarEntity.updateOne({ workspaceId, canonicalKey: key },
      { $set: { coreType: 'Transaction', subtype: 'payment', label: `Paiement ${inv.label || ''}`.trim(),
        roles: [], attributes: { amount, date: Math.floor(at.getTime() / 1000), settles: inv.label },
        sources: [{ providerKey: 'dolibarr', externalId: key }] },
        $setOnInsert: { firstSeenAt: at, lastSeenAt: new Date() } }, { upsert: true });
    await RadarRelation.updateOne({ workspaceId, fromKey: key, toKey: inv.canonicalKey, type: 'pays', role: 'invoice' },
      { $set: { confidence: 1, source: 'derived' } }, { upsert: true }).catch(() => {});
    const cli = clientOf.get(inv.canonicalKey);
    if (cli) await RadarRelation.updateOne({ workspaceId, fromKey: key, toKey: cli, type: 'party_of', role: 'client' },
      { $set: { confidence: 1, source: 'derived' } }, { upsert: true }).catch(() => {});
    payments++;
  }
  return { payments };
}

/**
 * Relie les DEMANDES CLIENT (tickets) au TRAVAIL de traitement (tâches du même client)
 * → chaîne « demande client → prise en charge → tâche ». Relation `addressed_by`
 * (le ticket est traité par la tâche). Dérivé du même client. Idempotent.
 * @returns {{ linked }}
 */
async function linkRequestsToWork(workspaceId) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  // tickets (demandes) + leur client
  const tickets = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: 'ticket' }).select('canonicalKey aliasKeys label firstSeenAt').lean();
  const tasks = await RadarEntity.find({ workspaceId, coreType: 'WorkItem', subtype: 'task' }).select('canonicalKey aliasKeys label firstSeenAt').lean();
  if (!tickets.length || !tasks.length) return { linked: 0 };

  // index toute-clé → canon pour résoudre les relations
  const canon = new Map();
  for (const e of [...tickets, ...tasks]) { canon.set(e.canonicalKey, e.canonicalKey); for (const a of e.aliasKeys || []) canon.set(a, e.canonicalKey); }
  // client de chaque ticket/tâche (via party_of direct, ou part_of projet→client)
  const rels = await RadarRelation.find({ workspaceId, type: { $in: ['party_of', 'part_of', 'relates_to'] } }).select('fromKey toKey role').lean();
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey aliasKeys').lean();
  const partyCanon = new Map(); for (const p of parties) { partyCanon.set(p.canonicalKey, p.canonicalKey); for (const a of p.aliasKeys || []) partyCanon.set(a, p.canonicalKey); }
  const clientOf = new Map();   // workItemCanon → clientCanon
  for (const r of rels) { const f = canon.get(r.fromKey); const c = partyCanon.get(r.toKey); if (f && c && !clientOf.has(f)) clientOf.set(f, c); }

  // tâches par client (pour rattacher un ticket à une tâche du même client)
  const tasksByClient = new Map();
  for (const t of tasks) { const c = clientOf.get(t.canonicalKey); if (!c) continue; (tasksByClient.get(c) || tasksByClient.set(c, []).get(c)).push(t); }

  let linked = 0;
  for (const tk of tickets) {
    const c = clientOf.get(tk.canonicalKey); if (!c) continue;
    const cand = tasksByClient.get(c); if (!cand || !cand.length) continue;
    // la tâche la plus proche dans le temps après le ticket (= prise en charge)
    const tkAt = tk.firstSeenAt ? new Date(tk.firstSeenAt).getTime() : 0;
    const best = cand.slice().sort((a, b) => Math.abs(new Date(a.firstSeenAt) - tkAt) - Math.abs(new Date(b.firstSeenAt) - tkAt))[0];
    await RadarRelation.updateOne(
      { workspaceId, fromKey: tk.canonicalKey, toKey: best.canonicalKey, type: 'addressed_by', role: 'task' },
      { $set: { confidence: 0.7, source: 'derived', evidence: { reason: 'client_request_to_work' } } }, { upsert: true }).catch(() => {});
    linked++;
  }
  return { linked };
}

module.exports = { seedSimulatedComms, seedDealOutcomes, seedPayments, linkRequestsToWork };
