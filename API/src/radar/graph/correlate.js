// Radar — corrélation cross-logiciel par NOM (résolution d'identité douce).
//
// Détecte AUTOMATIQUEMENT qu'un dossier Nextcloud « Cartonnage du Château / 2026 »,
// un projet OpenProject « Infra Cartonnage », etc. concernent le tiers
// « Cartonnage du Château » — en reliant les entités dont l'intitulé contient le
// nom normalisé d'un tiers. Déterministe, sans LLM. Le verdict (relation
// relates_to/role client) devient une arête du graphe → lien inter-logiciels.

/** Normalise un libellé : minuscules, sans accents, alphanumérique espacé. Pure. */
function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Le libellé cible contient-il le nom du tiers comme séquence de mots ? Pure. */
function nameMatches(targetNorm, partyNorm) {
  if (partyNorm.length < 4) return false;                 // évite les faux positifs (noms trop courts)
  return (' ' + targetNorm + ' ').includes(' ' + partyNorm + ' ')
    || targetNorm.startsWith(partyNorm) || targetNorm.includes(partyNorm);
}

/**
 * Relie par nom les entités « porteuses d'intitulé » (dossiers, fichiers, projets,
 * tâches) au tiers correspondant. Idempotent.
 * @returns {Promise<{ created, scanned, matched }>}
 */
async function correlateByName(workspaceId, { sourceTypes = ['Asset', 'Document', 'Project', 'WorkItem'], log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey label roles').lean();
  const idx = parties.map(p => ({ key: p.canonicalKey, norm: normalize(p.label), isClient: (p.roles || []).includes('client') }))
    .filter(p => p.norm.length >= 4)
    .sort((a, b) => b.norm.length - a.norm.length);   // noms les plus longs d'abord (plus spécifiques)

  const targets = await RadarEntity.find({ workspaceId, coreType: { $in: sourceTypes } })
    .select('canonicalKey coreType subtype label attributes').lean();

  const out = { created: 0, scanned: targets.length, matched: 0 };
  for (const t of targets) {
    // on cherche le nom du tiers dans le LIBELLÉ ET dans le CHEMIN (arborescence
    // /Clients/<nom>/… : un fichier appartient au client de son dossier).
    const hay = normalize(`${t.label || ''} ${t.attributes?.path || ''}`);
    if (!hay) continue;
    const hit = idx.find(p => nameMatches(hay, p.norm));
    if (!hit) continue;
    out.matched++;
    const r = await RadarRelation.updateOne(
      { workspaceId, fromKey: t.canonicalKey, toKey: hit.key, type: 'relates_to', role: 'client' },
      { $set: { confidence: 0.7, source: 'rule', evidence: { matchedName: hit.norm, via: 'name_correlation' } } },
      { upsert: true }
    );
    if (r.upsertedCount) out.created++;
  }
  log(`[radar-correlate] ${out.matched}/${out.scanned} entités reliées à un tiers par nom (+${out.created} nouvelles)`);
  return out;
}

module.exports = { correlateByName, normalize, nameMatches };
