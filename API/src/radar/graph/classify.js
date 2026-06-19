// Typage SÉMANTIQUE des entités — 100% DYNAMIQUE par LLM (aucune liste figée).
//
// Le LLM lit le contenu réel (libellé + lignes + contexte) et EXTRAIT librement le
// type métier : secteur d'un client, nature d'un projet, catégorie d'une facture.
// Aucun secteur/produit n'est codé en dur : un métier inconnu est qualifié à la volée.
// Pour la COHÉRENCE, on fournit au LLM les valeurs DÉJÀ découvertes dans le workspace
// (« réutilise-en une si elle convient, sinon crée-en une nouvelle ») — apprentissage
// dynamique, pas hardcode. Les valeurs découvertes s'accumulent dans le graphe.
//
// Stockage : attributes.segment (client), attributes.kind (projet/facture) + typeSource.

const { llmCompleteJSON } = require('../llm');
const { nameSimilarity } = require('../analytics');

// Canonicalise une valeur contre les valeurs DÉJÀ découvertes : si elle est proche
// d'une existante (« marketing_rebranding » ≈ « marketing »), on RÉUTILISE l'existante
// pour éviter les quasi-doublons. C'est la « logique distinct » voulue.
function tokens(s) { return new Set(String(s).split('_').filter(Boolean)); }
function tokenSubset(a, b) {           // un ensemble de tokens inclus dans l'autre ?
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return false;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  for (const t of small) if (!big.has(t)) return false;
  return true;
}
function canonicalize(slugVal, label, knownMap, threshold = 0.6) {
  let best = null, bestSim = 0;
  for (const [kslug, klabel] of knownMap) {
    // match fort : tokens inclus (marketing ⊂ marketing_rebranding) OU similarité de nom
    const sim = tokenSubset(slugVal, kslug) ? 1
      : Math.max(nameSimilarity(label || slugVal, klabel || kslug), nameSimilarity(slugVal, kslug));
    if (sim > bestSim) { bestSim = sim; best = { slug: kslug, label: klabel }; }
  }
  if (best && bestSim >= threshold) return best;        // réutilise l'existant proche
  knownMap.set(slugVal, label || slugVal);              // sinon nouvelle valeur distincte
  return { slug: slugVal, label: label || slugVal };
}

function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
}

/** Cible du typage selon le type d'entité. Pure. */
function targetOf(entity) {
  if (entity.coreType === 'Party') return { field: 'segment', what: "le SECTEUR d'activité de ce client (ex : industrie, formation, service public… ou tout autre secteur pertinent)" };
  if (entity.coreType === 'Project') return { field: 'kind', what: 'la NATURE de ce projet (ex : déploiement, R&D, maintenance, marketing… ou autre)' };
  if (entity.coreType === 'Transaction') return { field: 'kind', what: 'la CATÉGORIE de cette pièce (ex : matériel, prestation, abonnement, formation, acompte… ou autre)' };
  return null;
}

/**
 * Extrait le type sémantique d'une entité PAR LLM (open-ended). @returns {{[field]:slug, label, source:'llm'}|{}}
 * @param {object} entity @param {object} ctx { relatedLabels?, known? } @param {function} complete LLM
 */
async function classifyEntityLLM(entity, ctx = {}, complete = llmCompleteJSON) {
  const tgt = targetOf(entity); if (!tgt) return {};
  const label = entity.label || '';
  const lineText = (entity.attributes?.line_items || []).map(l => l.label || l.product || '').filter(Boolean).join(', ');
  const known = (ctx.known || []).slice(0, 30);
  const prompt = `Tu qualifies des données d'entreprise pour une analyse de processus. Déduis ${tgt.what}.

Élément : "${label}"${lineText ? `\nLignes/articles : ${lineText}` : ''}${ctx.relatedLabels?.length ? `\nContexte (éléments liés) : ${ctx.relatedLabels.slice(0, 10).join(', ')}` : ''}
${known.length ? `\nValeurs déjà utilisées dans cette entreprise (RÉUTILISE-EN une si elle convient, sinon crée-en une nouvelle, courte) : ${known.join(', ')}` : ''}

Réponds en JSON court, en français, valeur en 1-3 mots : {"${tgt.field}":"…","confidence":0-1}
Si vraiment indéterminable, mets "${tgt.field}":"".`;
  // Retry sur échec TRANSITOIRE (throttling sous charge) — sinon une rafale d'appels
  // perd des classifications silencieusement (le .catch renvoyait null = non typé).
  let out = null;
  for (let a = 0; a < 3; a++) {
    out = await complete(prompt, { maxTokens: 220 }).catch(() => null);
    if (out) break;
    await new Promise(r => setTimeout(r, 400 * (a + 1)));
  }
  const val = out && out[tgt.field] && String(out[tgt.field]).trim();
  if (!val) return {};
  return { [tgt.field]: slug(val), label: val, source: 'llm', confidence: out.confidence };
}

/**
 * Classe toutes les entités d'un workspace par LLM (dynamique). Maintient la liste
 * des valeurs découvertes pour les réutiliser (cohérence). Sans LLM → no-op propre.
 * @returns {Promise<{classified, llmUsed, byType, skippedNoLLM?}>}
 */
async function classifyWorkspace(workspaceId, { complete = llmCompleteJSON, maxLLM = 200, log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');
  if (typeof complete !== 'function') { log('[classify] pas de LLM disponible — typage ignoré'); return { classified: 0, llmUsed: 0, byType: {}, skippedNoLLM: true }; }

  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey aliasKeys coreType label attributes').lean();
  const others = await RadarEntity.find({ workspaceId, coreType: { $in: ['Project', 'Transaction'] } }).select('canonicalKey aliasKeys coreType subtype label attributes').lean();

  // contexte client = libellés des projets/factures qui pointent vers lui
  const keyToCanon = new Map();
  for (const p of parties) { keyToCanon.set(p.canonicalKey, p.canonicalKey); for (const a of p.aliasKeys || []) keyToCanon.set(a, p.canonicalKey); }
  const labelByKey = new Map();
  for (const o of others) { labelByKey.set(o.canonicalKey, o.label); for (const a of o.aliasKeys || []) labelByKey.set(a, o.label); }
  const rels = await RadarRelation.find({ workspaceId, type: { $in: ['party_of', 'relates_to'] } }).select('fromKey toKey').lean();
  const relatedLabels = new Map();
  for (const r of rels) { const c = keyToCanon.get(r.toKey); if (c && labelByKey.has(r.fromKey)) { const a = relatedLabels.get(c) || []; a.push(labelByKey.get(r.fromKey)); relatedLabels.set(c, a); } }

  // valeurs découvertes (slug → label), réutilisées pour la cohérence (distinct).
  const known = { segment: new Map(), kind: new Map() };
  let classified = 0, llmUsed = 0; const byType = {};
  const bump = (k, v) => { byType[k] = byType[k] || {}; byType[k][v] = (byType[k][v] || 0) + 1; };

  const apply = async (e, ctx) => {
    if (llmUsed >= maxLLM) return;
    const tgt = targetOf(e); if (!tgt) return;
    const t = await classifyEntityLLM(e, { ...ctx, known: [...known[tgt.field].values()] }, complete); llmUsed++;
    if (!t[tgt.field]) return;
    // réutilise une valeur proche déjà vue, sinon enregistre la nouvelle (logique distinct)
    const canon = canonicalize(t[tgt.field], t.label, known[tgt.field]);
    await RadarEntity.updateOne({ workspaceId, canonicalKey: e.canonicalKey },
      { $set: { [`attributes.${tgt.field}`]: canon.slug, [`attributes.${tgt.field}Label`]: canon.label, 'attributes.typeSource': 'llm' } });
    classified++; bump(e.coreType, canon.slug);
  };
  for (const p of parties) await apply(p, { relatedLabels: relatedLabels.get(p.canonicalKey) || [] });
  for (const o of others) await apply(o, {});

  log(`[classify] ${classified} entités typées par LLM (${llmUsed} appels)`, byType);
  return { classified, llmUsed, byType };
}

module.exports = { classifyEntityLLM, classifyWorkspace, targetOf, slug };
