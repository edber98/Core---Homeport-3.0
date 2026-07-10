// Radar — EXÉCUTEUR D'ACTIONS (R4). Ferme la boucle du cerveau actionnable :
// la file priorisée d'actions-engine.js (buildActionQueue) est ici TRANSFORMÉE en
// opérations RÉELLES sur le graphe, en RÉUTILISANT les primitives sûres de
// actions.js (mergeEntities / applyCorrelation / executeAction).
//
//   previewActions(workspaceId)  → dry-run : liste les actions EXÉCUTABLES de la file
//   runAction(workspaceId, action) → applique UNE action selon action.kind
//
// Dispatch par kind :
//   'fusion'       → fusionne le doublon (mergeEntities keep ← drop)
//   'rattachement' → crée la relation manquante (applyCorrelation from → to)
//   'relance'      → JOURNALISE une relance : crée/maj une entité Communication
//                    'email' subtype 'relance' (aucun envoi réel) + flag sur la cible
//   'controle'     → marque la cible « à vérifier » (attribut radar_review)
//   'fidelisation' → traité comme un contrôle (à reprendre contact) — flag de suivi
//
// IDEMPOTENT : ré-exécuter une action ne crée pas de doublon (upsert par clé stable,
// flags posés une fois). Ne casse RIEN : si la cible/les clés manquent, on renvoie
// { ok:false } avec une note claire plutôt que de jeter. Retour standardisé :
//   { ok, applied, note }.

const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const slug = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'x';
const nowSec = () => Math.floor(Date.now() / 1000);

/**
 * Résout une cible (canonicalKey OU alias OU slug de libellé) vers son entité.
 * Tolérant : la file expose `target` qui peut être une clé forte ou un libellé slugué.
 */
async function resolveTarget(workspaceId, target) {
  if (!target) return null;
  const RadarEntity = require('../db/models/radar-entity.model');
  // 1) clé canonique directe
  let e = await RadarEntity.findOne({ workspaceId, canonicalKey: target });
  if (e) return e;
  // 2) alias
  e = await RadarEntity.findOne({ workspaceId, aliasKeys: target });
  if (e) return e;
  // 3) libellé exact (ou son slug) — la file slugue parfois le libellé en target
  const all = await RadarEntity.find({ workspaceId }).select('canonicalKey label').lean();
  const hit = all.find((x) => x.label === target || slug(x.label) === slug(target));
  return hit ? RadarEntity.findOne({ workspaceId, canonicalKey: hit.canonicalKey }) : null;
}

/** Pose un flag de suivi idempotent sur une entité (attributes.<flag>). */
async function flagEntity(workspaceId, target, flag, value) {
  const ent = await resolveTarget(workspaceId, target);
  if (!ent) return { ok: false, note: `Cible introuvable : ${target}` };
  ent.attributes = ent.attributes || {};
  if (ent.attributes[flag] && JSON.stringify(ent.attributes[flag]) === JSON.stringify(value)) {
    return { ok: true, applied: false, note: `Déjà marqué (${flag}) sur ${ent.label}` };
  }
  ent.attributes[flag] = value;
  ent.markModified('attributes');
  await ent.save();
  return { ok: true, applied: true, note: `${flag} posé sur ${ent.label}`, entityKey: ent.canonicalKey };
}

/**
 * Journalise une relance SANS envoi réel : upsert d'une entité Communication
 * subtype 'relance' (clé stable par cible) + flag last_relance_at sur la facture.
 * Ré-exécutable : la même cible met à jour l'entité existante (pas de doublon).
 */
async function logRelance(workspaceId, action) {
  const RadarEntity = require('../db/models/radar-entity.model');
  const target = action.target || action.title;
  const key = `radar:relance:${slug(target)}`;
  const label = `Relance — ${action.title || target}`;
  const t = nowSec();

  const res = await RadarEntity.findOneAndUpdate(
    { workspaceId, canonicalKey: key },
    {
      $set: {
        coreType: 'Communication', subtype: 'relance', label, roles: ['relance'],
        'attributes.channel': 'email', 'attributes.kind': 'relance',
        'attributes.about': target, 'attributes.note': action.suggestedAction || 'Relance de paiement',
        'attributes.amount': num(action.impact), 'attributes.date': t,
        'attributes.status': 'journalisée', 'attributes.sent': false,
        lastSeenAt: new Date(),
      },
      $inc: { 'attributes.count': 1 },
      $setOnInsert: { firstSeenAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // flag de suivi sur la facture cible (best-effort, ne bloque pas la relance)
  const flag = await flagEntity(workspaceId, target, 'last_relance_at', t).catch(() => ({ ok: false }));
  const count = res?.attributes?.count || 1;
  return {
    ok: true, applied: true,
    note: `Relance journalisée (x${count}) pour « ${target} »${flag.ok ? ', facture marquée' : ''} — aucun envoi réel`,
    entityKey: key,
  };
}

/**
 * Exécute UNE action de la file (issue de buildActionQueue). Dispatch par kind,
 * en réutilisant actions.js pour les opérations de graphe.
 * @returns {Promise<{ok:boolean, applied:boolean, note:string, [extra]:any}>}
 */
async function runAction(workspaceId, action = {}) {
  if (!workspaceId) return { ok: false, applied: false, note: 'workspaceId manquant' };
  if (!action || !action.kind) return { ok: false, applied: false, note: 'action invalide (kind manquant)' };

  const A = require('./actions');
  const kind = action.kind;

  try {
    switch (kind) {
      // ── FUSION : doublon → on réutilise executeAction/mergeEntities d'actions.js
      case 'fusion': {
        if (!action.keepKey || !action.dropKey) {
          return { ok: false, applied: false, note: 'Fusion impossible : clés keep/drop manquantes' };
        }
        const r = typeof A.executeAction === 'function'
          ? await A.executeAction(workspaceId, { type: 'fusionner', keepKey: action.keepKey, dropKey: action.dropKey })
          : await A.mergeEntities(workspaceId, action.keepKey, action.dropKey);
        if (!r.ok) {
          // entité déjà fusionnée (introuvable) → idempotent, pas une erreur dure
          const idem = r.error === 'entity_not_found' || r.error === 'same_entity';
          return { ok: idem, applied: false, note: idem ? `Déjà fusionné / sans objet (${r.error})` : `Échec fusion : ${r.error}` };
        }
        return { ok: true, applied: true, note: `Fusion : « ${action.dropKey} » → « ${action.keepKey} » (${r.rewired || 0} relation(s) ré-aiguillée(s))`, kept: r.kept };
      }

      // ── RATTACHEMENT : crée la relation manquante (upsert idempotent dans actions.js)
      case 'rattachement': {
        if (!action.fromKey || !action.toKey) {
          return { ok: false, applied: false, note: 'Rattachement impossible : clés from/to manquantes' };
        }
        const r = typeof A.executeAction === 'function'
          ? await A.executeAction(workspaceId, { type: 'rattacher', fromKey: action.fromKey, toKey: action.toKey, role: action.role || 'client' })
          : await A.applyCorrelation(workspaceId, action.fromKey, action.toKey, action.role || 'client');
        if (!r.ok) return { ok: false, applied: false, note: `Échec rattachement : ${r.error}` };
        return { ok: true, applied: true, note: `Rattaché : « ${action.fromKey} » → « ${action.toKey} »` };
      }

      // ── RELANCE : journalisée, jamais envoyée (write réel = actions.js executeWrite + allowWrite)
      case 'relance':
        return await logRelance(workspaceId, action);

      // ── CONTRÔLE / FIDÉLISATION : marque la cible « à vérifier / à recontacter »
      case 'controle':
      case 'fidelisation': {
        const flag = kind === 'controle' ? 'radar_review' : 'radar_followup';
        const r = await flagEntity(workspaceId, action.target, flag, {
          reason: action.suggestedAction || action.title || 'À vérifier', at: nowSec(),
        });
        if (!r.ok) return { ok: false, applied: false, note: r.note };
        return { ok: true, applied: r.applied !== false, note: r.note, entityKey: r.entityKey };
      }

      default:
        return { ok: false, applied: false, note: `Kind non exécutable : ${kind}` };
    }
  } catch (e) {
    return { ok: false, applied: false, note: `Erreur d'exécution (${kind}) : ${String(e && e.message || e)}` };
  }
}

/**
 * DRY-RUN : construit la file via actions-engine.buildActionQueue et renvoie
 * UNIQUEMENT les actions EXÉCUTABLES (executable === true), enrichies d'un drapeau
 * `runnable` indiquant si runAction sait les traiter (kind connu + clés présentes).
 * @returns {Promise<{ executable:Array, counts:{executable,total}, byKind:Object }>}
 */
async function previewActions(workspaceId, opts = {}) {
  const { buildActionQueue } = require('./actions-engine');
  const queue = await buildActionQueue(workspaceId, opts);
  const all = queue.actions || [];

  const RUNNABLE_KINDS = new Set(['fusion', 'rattachement', 'relance', 'controle', 'fidelisation']);
  const hasKeys = (a) =>
    a.kind === 'fusion' ? !!(a.keepKey && a.dropKey)
    : a.kind === 'rattachement' ? !!(a.fromKey && a.toKey)
    : !!(a.target); // relance/controle/fidelisation → besoin d'une cible

  // « exécutable » au sens de la file = action sûre et auto-applicable (fusion/rattachement).
  // On expose AUSSI les actions runnable par runAction (relance/contrôle journalisés).
  const executable = all
    .filter((a) => a.executable === true)
    .map((a) => ({ ...a, runnable: RUNNABLE_KINDS.has(a.kind) && hasKeys(a) }));

  const runnableAll = all
    .filter((a) => RUNNABLE_KINDS.has(a.kind) && hasKeys(a))
    .map((a) => ({ ...a, runnable: true }));

  const byKind = {};
  for (const a of runnableAll) byKind[a.kind] = (byKind[a.kind] || 0) + 1;

  return {
    executable,          // actions marquées executable par la file (fusion/rattachement sûrs)
    runnable: runnableAll, // tout ce que runAction sait appliquer (incl. relance/contrôle)
    counts: { executable: executable.length, runnable: runnableAll.length, total: all.length },
    byKind,
    validation: queue.validation,
  };
}

module.exports = { runAction, previewActions };
