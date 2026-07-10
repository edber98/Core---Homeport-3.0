// Radar — FLUX DES CHANGEMENTS RÉCENTS (R2, temps-réel). Lit le JOURNAL des deltas
// (radar-delta.model : ce qui a CHANGÉ entre deux observations) et le transforme en
// une liste LISIBLE des changements SIGNIFICATIFS pour une vue temps-réel :
//   - transitions d'état métier : devis signé, facture payée, commande validée,
//     ticket fermé, tâche terminée… (déduites des codes de statut Dolibarr)
//   - nouvelles pièces : devis/commande/facture/projet créés
//   - nouveaux clients
//
// Le delta porte `entityType` (type fournisseur : quote, customer_invoice, task…),
// `entityKey` (id externe), `type` ('created'|'updated') et `after` (champs modifiés,
// typiquement { statut } code numérique ou { status }). On RÉSOUT l'entité concernée
// vers son LABEL via la clé canonique `<provider>:<entityType>:<entityKey>` (comme
// les modules existants : dolibarr:quote:4), avec repli sur sources.externalId.
//
// Aucune infra : un seul scan des deltas récents + un index entité en mémoire.

const HOUR = 3600000;

const slug = (s) => String(s == null ? '' : s).toLowerCase();

// ───────────────────────────────────────────────────────────────────────────
// DICTIONNAIRE des transitions d'état. Les connecteurs Dolibarr écrivent dans
// `after` soit { statut } (code numérique des pièces de gestion) soit { status }
// (code des tâches/tickets). On qualifie chaque transition « atteinte » :
//   label lisible + importance (haute = jalon business : signature, paiement, clôture).
// Code non mappé → transition générique (statut technique), importance normale.
// ───────────────────────────────────────────────────────────────────────────
const TRANSITIONS = {
  // statut (numérique) des pièces de gestion
  quote: {
    field: 'statut',
    map: {
      '0': { label: 'devis remis en brouillon', importance: 'normale' },
      '1': { label: 'devis validé', importance: 'normale' },
      '2': { label: 'devis SIGNÉ', importance: 'haute' },
      '3': { label: 'devis refusé / clôturé', importance: 'haute' },
    },
  },
  order: {
    field: 'statut',
    map: {
      '0': { label: 'commande en brouillon', importance: 'normale' },
      '1': { label: 'commande validée', importance: 'haute' },
      '3': { label: 'commande livrée / traitée', importance: 'haute' },
    },
  },
  customer_invoice: {
    field: 'statut',
    map: {
      '0': { label: 'facture en brouillon', importance: 'normale' },
      '1': { label: 'facture validée (à encaisser)', importance: 'normale' },
      '2': { label: 'facture PAYÉE', importance: 'haute' },
      '3': { label: 'facture abandonnée', importance: 'haute' },
    },
  },
  supplier_invoice: {
    field: 'statut',
    map: {
      '0': { label: 'facture fournisseur en brouillon', importance: 'normale' },
      '1': { label: 'facture fournisseur validée (à payer)', importance: 'normale' },
      '2': { label: 'facture fournisseur PAYÉE', importance: 'haute' },
    },
  },
  project: {
    field: 'statut',
    map: {
      '0': { label: 'projet en brouillon', importance: 'normale' },
      '1': { label: 'projet ouvert', importance: 'normale' },
      '2': { label: 'projet clôturé', importance: 'haute' },
    },
  },
  // status (numérique) des éléments de travail
  task: {
    field: 'status',
    map: {
      '0': { label: 'tâche à faire', importance: 'normale' },
      '1': { label: 'tâche en cours', importance: 'normale' },
      '2': { label: 'tâche TERMINÉE', importance: 'normale' },
    },
  },
  ticket: {
    field: 'status',
    map: {
      '0': { label: 'ticket ouvert (non lu)', importance: 'normale' },
      '1': { label: 'ticket pris en charge', importance: 'normale' },
      '8': { label: 'ticket FERMÉ / résolu', importance: 'haute' },
    },
  },
};

// Types de pièces dont la CRÉATION est un événement notable (nouvelle affaire/flux).
const CREATION_KIND = {
  quote: { label: 'nouveau devis', importance: 'haute' },
  order: { label: 'nouvelle commande', importance: 'haute' },
  customer_invoice: { label: 'nouvelle facture client', importance: 'haute' },
  supplier_invoice: { label: 'nouvelle facture fournisseur', importance: 'normale' },
  project: { label: 'nouveau projet', importance: 'normale' },
  ticket: { label: 'nouveau ticket', importance: 'normale' },
  task: { label: 'nouvelle tâche', importance: 'normale' },
};

// Mots-clés signalant un BLOCAGE dans un label (⚠️ BLOQUÉ) → remonte l'importance.
const BLOCKED_RE = /bloqu|⚠️|blocked|en attente|stuck/i;

/**
 * Flux des changements récents (vue temps-réel) pour un workspace.
 * @param {ObjectId|string} workspaceId
 * @param {object}  [opts]
 * @param {number}  [opts.sinceHours=168]  fenêtre d'observation (jours = 7 par défaut)
 * @param {number}  [opts.limit=50]        nombre max de changements retournés
 * @returns {Promise<{ changes:Array<{at:Date, kind:string, entity:string, label:string,
 *                      detail:string, importance:'haute'|'normale'}>,
 *                      counts:{ total:number, parKind:Object } }>}
 */
async function recentChanges(workspaceId, { sinceHours = 168, limit = 50 } = {}) {
  const RadarDelta = require('../db/models/radar-delta.model');
  const RadarEntity = require('../db/models/radar-entity.model');

  const since = new Date(Date.now() - sinceHours * HOUR);

  // 1) DELTAS récents (le journal des changements), du plus récent au plus ancien.
  const deltas = await RadarDelta.find({ workspaceId, occurredAt: { $gte: since } })
    .select('type entityType entityKey after changedFields occurredAt')
    .sort({ occurredAt: -1 })
    .lean();
  if (!deltas.length) return { changes: [], counts: { total: 0, parKind: {} } };

  // 2) Index ENTITÉ → label, pour résoudre l'entité concernée par chaque delta.
  //    Clés d'accès : clé canonique `<provider>:<entityType>:<externalId>` ET
  //    chaque source externalId (repli). Comme dans les modules existants, on indexe
  //    aussi les aliasKeys pour suivre les renommages.
  const ents = await RadarEntity.find({ workspaceId })
    .select('canonicalKey aliasKeys label coreType subtype sources attributes')
    .lean();
  const byKey = new Map();          // clé quelconque → entité
  const byExternal = new Map();     // `<entityType>:<externalId>` → entité (repli)
  for (const e of ents) {
    byKey.set(e.canonicalKey, e);
    for (const a of e.aliasKeys || []) byKey.set(a, e);
    for (const s of e.sources || []) {
      if (s.externalId) byExternal.set(`${e.subtype || ''}:${s.externalId}`, e);
    }
  }

  const resolveEntity = (d) => {
    // clé canonique probable : <provider>:<entityType>:<entityKey>
    // entityType du delta = segment de la clé canonique (quote, customer_invoice…)
    const guesses = [
      `dolibarr:${d.entityType}:${d.entityKey}`,
      `${d.entityType}:${d.entityKey}`,
    ];
    for (const g of guesses) { const e = byKey.get(g); if (e) return e; }
    return byExternal.get(`${d.entityType}:${d.entityKey}`) || null;
  };

  // 3) Construction des changements LISIBLES.
  const changes = [];
  for (const d of deltas) {
    const ent = resolveEntity(d);
    const label = (ent && ent.label) || `${d.entityType} #${d.entityKey}`;
    const after = d.after || {};

    if (d.type === 'created') {
      const ck = CREATION_KIND[d.entityType] || { label: `nouvelle pièce (${d.entityType})`, importance: 'normale' };
      // Nouveau CLIENT : entité de type Party résolue (ou famille client).
      const isClient = ent && ent.coreType === 'Party';
      const kind = isClient ? 'nouveau_client' : 'creation';
      const importance = isClient ? 'haute' : ck.importance;
      changes.push({
        at: d.occurredAt,
        kind,
        entity: d.entityType,
        label,
        detail: isClient ? `Nouveau client « ${label} » ajouté au radar.` : `${cap(ck.label)} : « ${label} ».`,
        importance,
      });
      continue;
    }

    // d.type === 'updated' : transition d'état si un code de statut a changé.
    const spec = TRANSITIONS[d.entityType];
    const code = spec ? after[spec.field] : undefined;
    if (spec && code !== undefined && code !== null && code !== '') {
      const t = spec.map[String(code)] || { label: `statut → ${code}`, importance: 'normale' };
      let importance = t.importance;
      // un libellé signalant un blocage relève l'importance (tâche/ticket bloqué).
      if (BLOCKED_RE.test(label)) importance = 'haute';
      changes.push({
        at: d.occurredAt,
        kind: 'transition',
        entity: d.entityType,
        label,
        detail: `« ${label} » → ${t.label}.`,
        importance,
      });
      continue;
    }

    // Mise à jour sans transition de statut connue → changement générique discret.
    const fields = (d.changedFields && d.changedFields.length)
      ? d.changedFields.join(', ')
      : Object.keys(after).join(', ');
    changes.push({
      at: d.occurredAt,
      kind: 'mise_a_jour',
      entity: d.entityType,
      label,
      detail: `« ${label} » mis à jour${fields ? ` (${fields})` : ''}.`,
      importance: BLOCKED_RE.test(label) ? 'haute' : 'normale',
    });
  }

  // 4) Tri par date décroissante (le plus récent d'abord) puis troncature.
  changes.sort((a, b) => new Date(b.at) - new Date(a.at));
  const limited = changes.slice(0, Math.max(1, limit));

  // 5) Agrégats : total (avant troncature) + répartition par kind (sur le rendu).
  const parKind = {};
  for (const c of limited) parKind[c.kind] = (parKind[c.kind] || 0) + 1;

  return { changes: limited, counts: { total: changes.length, parKind } };
}

function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

module.exports = { recentChanges };
