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

/**
 * Relie les fichiers/dossiers aux PROJETS par nom (arborescence façon bureau d'étude :
 * /Projets/<titre projet>/Plans, /CAO… → les fichiers appartiennent à ce projet).
 * Relation part_of (le fichier fait partie du projet). Idempotent.
 */
async function correlateFilesToProjects(workspaceId, { log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const projects = await RadarEntity.find({ workspaceId, coreType: 'Project' }).select('canonicalKey label').lean();
  const idx = projects.map(p => ({ key: p.canonicalKey, norm: normalize(p.label) }))
    .filter(p => p.norm.length >= 4)
    .sort((a, b) => b.norm.length - a.norm.length);
  if (!idx.length) return { created: 0, scanned: 0, matched: 0 };

  const files = await RadarEntity.find({ workspaceId, coreType: { $in: ['Document', 'Asset'] }, subtype: { $in: ['file', 'folder'] } })
    .select('canonicalKey label attributes').lean();
  const out = { created: 0, scanned: files.length, matched: 0 };
  for (const f of files) {
    const hay = normalize(`${f.label || ''} ${f.attributes?.path || ''}`);
    if (!hay) continue;
    const hit = idx.find(p => nameMatches(hay, p.norm));
    if (!hit) continue;
    out.matched++;
    const r = await RadarRelation.updateOne(
      { workspaceId, fromKey: f.canonicalKey, toKey: hit.key, type: 'part_of', role: 'project' },
      { $set: { confidence: 0.7, source: 'rule', evidence: { matchedName: hit.norm, via: 'project_name_correlation' } } },
      { upsert: true }
    );
    if (r.upsertedCount) out.created++;
  }
  log(`[radar-correlate] ${out.matched}/${out.scanned} fichiers reliés à un projet (+${out.created})`);
  return out;
}

/** Compacte un libellé en jeton alphanumérique brut (insensible aux tirets/espaces). Pure. */
function compactToken(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
}

/**
 * Relie un FICHIER à la pièce comptable réelle (devis/commande/facture) dont il porte
 * la RÉFÉRENCE dans son nom. Niveau de détail « bureau réel » : un PDF
 * « Devis_PR2506-0001.pdf » rangé dans /Clients/<x>/Devis est relié à l'entité Devis
 * PR2506-0001 elle-même — pas seulement au dossier. On extrait la référence
 * (jeton type LETTRES+CHIFFRES) du nom de fichier/chemin et on la matche contre la
 * référence réelle de la transaction (attributes.ref/number ou libellé). Idempotent.
 * Relation `documents` (le fichier documente la pièce). Déterministe, sans LLM.
 */
async function correlateFilesToDeals(workspaceId, { log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  const txs = await RadarEntity.find({ workspaceId, coreType: 'Transaction' })
    .select('canonicalKey subtype label attributes').lean();
  // index ref (compactée) → transaction. La ref doit être assez longue/discriminante.
  const idx = [];
  for (const t of txs) {
    const ref = t.attributes?.ref || t.attributes?.number || t.attributes?.numero || t.label;
    const tok = compactToken(ref);
    if (tok.length >= 6 && /[a-z]/.test(tok) && /[0-9]/.test(tok)) idx.push({ key: t.canonicalKey, tok, subtype: t.subtype, ref });
  }
  idx.sort((a, b) => b.tok.length - a.tok.length);   // refs les plus longues d'abord (plus spécifiques)
  if (!idx.length) return { created: 0, scanned: 0, matched: 0 };

  const files = await RadarEntity.find({ workspaceId, coreType: { $in: ['Document', 'Asset'] }, subtype: 'file' })
    .select('canonicalKey label attributes').lean();
  const out = { created: 0, scanned: files.length, matched: 0 };
  for (const f of files) {
    const hay = compactToken(`${f.label || ''} ${f.attributes?.path || ''}`);
    if (hay.length < 6) continue;
    const hit = idx.find(t => hay.includes(t.tok));
    if (!hit) continue;
    out.matched++;
    const r = await RadarRelation.updateOne(
      { workspaceId, fromKey: f.canonicalKey, toKey: hit.key, type: 'documents', role: hit.subtype || 'transaction' },
      { $set: { confidence: 0.9, source: 'rule', evidence: { matchedRef: hit.ref, via: 'file_ref_correlation' } } },
      { upsert: true }
    );
    if (r.upsertedCount) out.created++;
  }
  log(`[radar-correlate] ${out.matched}/${out.scanned} fichiers reliés à une pièce par référence (+${out.created})`);
  return out;
}

module.exports = { correlateByName, correlateFilesToProjects, correlateFilesToDeals, normalize, nameMatches, compactToken };
