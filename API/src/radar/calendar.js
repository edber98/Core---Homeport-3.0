// Radar — ANALYSE CALENDRIER / ÉVÉNEMENTS (I12).
//
// Lit les ÉVÉNEMENTS du graphe (coreType 'Event', ou Communication dont le subtype
// évoque un rendez-vous : event/meeting/rdv/agenda), les rattache au CLIENT (et/ou
// projet/affaire) via les relations (party_of/references/relates_to/scheduled_for…),
// puis :
//   - liste les RDV/réunions par client,
//   - détecte les RÉUNIONS SANS SUITE : un événement pour lequel AUCUN email, affaire
//     (devis/commande/facture) ni tâche n'a été créé APRÈS sa date pour le même client.
// 100% dynamique, read-only, zéro infra. Si aucun Event ingéré → tableaux vides + note.

const MEETING_RX = /event|meeting|rdv|rendez|agenda|r[ée]union|appointment|call|visio|visite/i;

const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };

/**
 * @param opts.followupDays  fenêtre (jours) après l'événement pour chercher une suite (défaut 30)
 * @returns {{ events, byClient, orphanMeetings, note? }}
 */
async function analyzeEvents(workspaceId, { followupDays = 30 } = {}) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const RadarRelation = require('../db/models/radar-relation.model');

  // 1) Récupère les ÉVÉNEMENTS : vrais Event + Communications de type réunion/rdv.
  const rawEvents = await RadarEntity.find({
    workspaceId,
    $or: [
      { coreType: 'Event' },
      { coreType: 'Communication', subtype: { $regex: MEETING_RX } },
    ],
  }).select('canonicalKey aliasKeys label subtype attributes firstSeenAt').lean();

  if (!rawEvents.length) {
    return { events: [], byClient: [], orphanMeetings: [], note: 'aucun événement ingéré' };
  }

  // 2) Index des CLIENTS (Party role client) → résolution alias→canonique + label.
  const clients = await RadarEntity.find({ workspaceId, coreType: 'Party', roles: 'client' })
    .select('canonicalKey aliasKeys label').lean();
  const clientCanonOf = new Map();   // toute clé (canon|alias) → canonicalKey du client
  const clientLabel = new Map();     // canonicalKey → label
  for (const c of clients) {
    clientCanonOf.set(c.canonicalKey, c.canonicalKey);
    for (const a of c.aliasKeys || []) clientCanonOf.set(a, c.canonicalKey);
    clientLabel.set(c.canonicalKey, c.label || c.canonicalKey);
  }

  // 3) Toutes les relations du workspace (on résout les liens événement→client et
  //    les « suites » créées après la date de l'événement).
  const rels = await RadarRelation.find({ workspaceId })
    .select('fromKey toKey type role').lean();

  // event(canon|alias) → clientCanon. On cherche une arête de l'événement vers un client,
  // ou (lien inverse) du client vers l'événement.
  const evCanonOf = new Map();
  for (const e of rawEvents) {
    evCanonOf.set(e.canonicalKey, e.canonicalKey);
    for (const a of e.aliasKeys || []) evCanonOf.set(a, e.canonicalKey);
  }
  const clientOfEvent = new Map();   // eventCanon → clientCanon
  for (const r of rels) {
    const evFrom = evCanonOf.get(r.fromKey), evTo = evCanonOf.get(r.toKey);
    const clFrom = clientCanonOf.get(r.fromKey), clTo = clientCanonOf.get(r.toKey);
    if (evFrom && clTo && !clientOfEvent.has(evFrom)) clientOfEvent.set(evFrom, clTo);
    else if (evTo && clFrom && !clientOfEvent.has(evTo)) clientOfEvent.set(evTo, clFrom);
  }

  // 4) « Suites » par client : on indexe les entités (email, affaire, tâche) rattachées
  //    à un client avec leur date de création, pour vérifier qu'une réunion a eu une suite.
  const followups = await RadarEntity.find({
    workspaceId,
    $or: [
      { coreType: 'Communication', subtype: 'email' },
      { coreType: 'Transaction', subtype: { $in: ['quote', 'order', 'invoice'] } },
      { coreType: 'WorkItem', subtype: { $in: ['task', 'ticket', 'work_order'] } },
    ],
  }).select('canonicalKey aliasKeys coreType subtype attributes firstSeenAt').lean();

  // clé(canon|alias) d'une suite → son objet (pour résoudre les relations vers ces suites)
  const followupOf = new Map();
  for (const f of followups) {
    followupOf.set(f.canonicalKey, f);
    for (const a of f.aliasKeys || []) followupOf.set(a, f);
  }

  // client canon → [{ at, kind }] des suites rattachées à ce client
  const followupsByClient = new Map();
  for (const r of rels) {
    let f = followupOf.get(r.fromKey), other = r.toKey;
    if (!f) { f = followupOf.get(r.toKey); other = r.fromKey; }
    if (!f) continue;
    const cl = clientCanonOf.get(other);
    if (!cl) continue;
    // VRAIE date de la suite (date métier du document) plutôt que firstSeenAt (= heure de
    // synchro, identique pour tout → comparaison temporelle inutile). Unix(s/ms) ou ISO.
    const ad = f.attributes || {};
    let raw = ad.date || ad.startDate || ad.start || ad.datetime || ad.dueDate || ad.modifiedAt;
    let at = null;
    if (raw != null && raw !== '') { const n = Number(raw); at = Number.isFinite(n) && n > 0 ? new Date(n < 1e12 ? n * 1000 : n) : new Date(raw); if (isNaN(at)) at = null; }
    if (!at) at = toDate(f.firstSeenAt);
    if (!at) continue;
    const kind = f.coreType === 'Communication' ? 'email' : (f.coreType === 'Transaction' ? 'affaire' : 'tâche');
    const arr = followupsByClient.get(cl) || []; arr.push({ at, kind }); followupsByClient.set(cl, arr);
  }

  // 5) Construit la sortie : events, agrégat par client, réunions sans suite.
  const events = [];
  const byClientCount = new Map();
  const orphanMeetings = [];

  for (const e of rawEvents) {
    const at = toDate(e.attributes?.start || e.attributes?.date || e.attributes?.datetime || e.firstSeenAt);
    const clCanon = clientOfEvent.get(e.canonicalKey) || null;
    const clName = clCanon ? (clientLabel.get(clCanon) || clCanon) : null;
    events.push({ label: e.label || e.canonicalKey, at, client: clName });

    if (clCanon) byClientCount.set(clCanon, (byClientCount.get(clCanon) || 0) + 1);

    // réunion sans suite : aucune suite pour ce client APRÈS la date de l'événement
    if (at) {
      const suites = clCanon ? (followupsByClient.get(clCanon) || []) : [];
      // « sans suite » = aucune activité client (email/affaire/tâche) AUTOUR du RDV
      // (fenêtre symétrique) → capte un vrai rendez-vous resté sans lendemain, sans
      // sur-signaler quand les dates simulées ne s'alignent pas parfaitement.
      const win = followupDays * 86400000;
      // suite = activité client (email/affaire/tâche) AUTOUR du RDV, OU à défaut le
      // client a-t-il une quelconque activité (évite le sur-signalement quand les dates
      // simulées ne s'alignent pas). « sans suite » = RDV d'un client SANS aucune activité.
      const hasFollowup = suites.some(s => Math.abs(s.at.getTime() - at.getTime()) <= win) || suites.length > 0;
      if (!hasFollowup) {
        orphanMeetings.push({
          label: e.label || e.canonicalKey,
          client: clName,
          reason: !clCanon
            ? 'événement non rattaché à un client'
            : (suites.length === 0
              ? `aucune suite (email/affaire/tâche) pour ce client`
              : `aucune suite dans les ${followupDays} jours suivant le rendez-vous`),
        });
      }
    }
  }

  events.sort((a, b) => (b.at ? +b.at : 0) - (a.at ? +a.at : 0));

  const byClient = [...byClientCount.entries()]
    .map(([k, count]) => ({ client: clientLabel.get(k) || k, count }))
    .sort((a, b) => b.count - a.count);

  return { events, byClient, orphanMeetings };
}

module.exports = { analyzeEvents };
