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

  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' }).select('canonicalKey label').lean();
  if (!clients.length) return { emails: 0, relations: 0 };
  const clientKeys = new Set(clients.map(c => c.canonicalKey));
  const labelOf = new Map(clients.map(c => [c.canonicalKey, c.label]));

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
    if (!f || !clientKeys.has(r.toKey)) continue;
    clientOfTx.set(f, r.toKey);
    if (projects.some(p => p.canonicalKey === f)) { if (!clientProject.has(r.toKey)) clientProject.set(r.toKey, f); }
    if (tickets.some(t => t.canonicalKey === f)) { const a = clientTickets.get(r.toKey) || []; a.push(f); clientTickets.set(r.toKey, a); }
  }

  let emails = 0, relations = 0;
  const now = Date.now();
  const upsertEmail = async (key, label, at, links) => {
    await RadarEntity.updateOne(
      { workspaceId, canonicalKey: key },
      { $set: { coreType: 'Communication', subtype: 'email', label, roles: [], attributes: { date: Math.floor(new Date(at).getTime() / 1000) }, sources: [{ providerKey: 'gmail', externalId: key }] },
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
      await upsertEmail(`gmail:email:devis_env_${t.canonicalKey}`, `Envoi du devis ${t.label} à ${cname}`, d + 1 * DAY, links(t.canonicalKey));
      await upsertEmail(`gmail:email:devis_val_${t.canonicalKey}`, `Validation du devis ${t.label}`, d + 3 * DAY, links(t.canonicalKey));
    } else if (t.subtype === 'invoice') {
      await upsertEmail(`gmail:email:fact_env_${t.canonicalKey}`, `Envoi de la facture ${t.label}`, d + 1 * DAY, links(t.canonicalKey));
      const paid = (t.attributes?.payment_state === 'payée' || t.attributes?.state === 'payée');
      if (!paid) await upsertEmail(`gmail:email:fact_relance_${t.canonicalKey}`, `Relance — facture ${t.label} en attente de paiement`, d + 20 * DAY, links(t.canonicalKey));
    }
  }

  // Emails de SUPPORT reliés aux TICKETS (le sujet de l'email = le sujet du ticket)
  for (const tk of tickets) {
    const clientKey = clientOfTx.get(tk.canonicalKey); if (!clientKey) continue;
    const at = (tk.firstSeenAt ? new Date(tk.firstSeenAt).getTime() : now) + 1 * DAY;
    await upsertEmail(`gmail:email:ticket_${tk.canonicalKey}`, `Re: ${tk.label} — prise en charge`, at, [[clientKey, 'client'], [tk.canonicalKey, 'about_ticket']]);
  }
  return { emails, relations };
}

module.exports = { seedSimulatedComms };
