// Typage SÉMANTIQUE des entités — la clé de voûte de l'analyse « intelligente ».
//
// On enrichit les entités d'un TYPE métier (secteur client, nature de projet,
// catégorie de facture) pour cibler le process mining et l'analyse des goulots
// (« les déploiements industriels traînent à la livraison »). Hybride predict-or-ask :
//   1. déterministe par mots-clés (rapide, testable, sans LLM) ;
//   2. LLM optionnel sur le gris (libellé + lignes + contexte) ;
//   3. agents web (futur) pour qualifier un client à partir de son nom/site.
//
// Stockage : attributes.segment (client), attributes.kind (projet/facture).

// secteur d'activité d'un CLIENT (par mots-clés du nom + libellés liés)
const SECTOR_RULES = [
  ['industrie', /\b(industr|usine|production|manufactur|fonderie|m[ée]tallurg|plasturg|cartonn|embalrage|emballage|a[ée]ronaut|automobil|chimie|mat[ée]riaux)\b/i],
  ['formation', /\b(formation|cfa|organisme.*format|acad[ée]m|e-?learning|stagiaire|p[ée]dagog)\b/i],
  ['service_public', /\b(mairie|ville|commune|d[ée]partement|r[ée]gion|pr[ée]fecture|minist|gouv|cci|chambre|[ée]tablissement public|h[ôo]pital|chu)\b/i],
  ['btp', /\b(b[âa]timent|travaux|construction|ma[çc]on|[ée]lectricien|plomb|charpent|g[ée]nie civil)\b/i],
  ['sante', /\b(clinique|m[ée]dical|pharma|sant[ée]|cabinet.*m[ée]dec|laboratoire.*analyse|ehpad)\b/i],
  ['commerce', /\b(boucher|boulanger|[ée]picerie|magasin|boutique|commerce|retail|distribution|n[ée]goce)\b/i],
  ['tech', /\b(logiciel|software|saas|digital|num[ée]rique|web|informatique|it\b|tech|data|cloud)\b/i],
  ['conseil', /\b(conseil|consulting|cabinet|audit|expert.?comptable|avocat|juridique)\b/i],
];
// nature d'un PROJET
const PROJECT_KIND_RULES = [
  ['deploiement', /\b(d[ée]ploiement|installation|migration|mise en place|infrastructure|infra|roll.?out)\b/i],
  ['rnd', /\b(r&d|recherche|innovation|prototype|poc|exp[ée]riment)\b/i],
  ['maintenance', /\b(maintenance|support|infog[ée]rance|tma|exploitation|run\b)\b/i],
  ['marketing', /\b(marketing|communication|site internet|charte graphique|logo|campagne|seo|ads|branding)\b/i],
  ['formation', /\b(formation|accompagnement|onboarding|montée en comp[ée]tence)\b/i],
  ['developpement', /\b(d[ée]veloppement|application|logiciel|plateforme|connecteur|int[ée]gration)\b/i],
];
// catégorie d'une FACTURE/DEVIS (libellé + lignes)
const INVOICE_KIND_RULES = [
  ['materiel', /\b(serveur|nas|onduleur|switch|mat[ée]riel|licence|ordinateur|[ée]quipement|hardware|c[âa]ble)\b/i],
  ['formation', /\b(formation|session|stagiaire|p[ée]dagog)\b/i],
  ['abonnement', /\b(abonnement|forfait|mensuel|infog[ée]rance|saas|hosting|h[ée]bergement)\b/i],
  ['acompte', /\b(acompte|avance|down.?payment|arrhes)\b/i],
  ['prestation', /\b(prestation|conseil|d[ée]veloppement|audit|accompagnement|jour|r[ée]gie)\b/i],
];

function matchFirst(rules, text) {
  const t = String(text || '');
  for (const [val, re] of rules) if (re.test(t)) return val;
  return null;
}

/** Type déterministe d'une entité. Pure. @returns {segment?|kind?} ou {} */
function classifyEntity(entity, ctx = {}) {
  const label = entity.label || '';
  const lineText = (entity.attributes?.line_items || []).map(l => l.label || l.product || '').join(' ');
  if (entity.coreType === 'Party') {
    const hay = `${label} ${(ctx.relatedLabels || []).join(' ')}`;
    const seg = matchFirst(SECTOR_RULES, hay);
    return seg ? { segment: seg } : {};
  }
  if (entity.coreType === 'Project') {
    const k = matchFirst(PROJECT_KIND_RULES, label);
    return k ? { kind: k } : {};
  }
  if (entity.coreType === 'Transaction' && ['invoice', 'quote', 'order', 'supplier_invoice'].includes(entity.subtype)) {
    const k = matchFirst(INVOICE_KIND_RULES, `${label} ${lineText}`);
    return k ? { kind: k } : {};
  }
  return {};
}

/**
 * Classe toutes les entités d'un workspace (déterministe ; LLM optionnel sur le gris).
 * Pour les clients, on agrège les libellés de leurs projets/factures comme contexte.
 * @returns {Promise<{classified, byType}>}
 */
async function classifyWorkspace(workspaceId, { llm = null, log = () => {} } = {}) {
  const RadarEntity = require('../../db/models/radar-entity.model');
  const RadarRelation = require('../../db/models/radar-relation.model');

  // contexte client : libellés des entités qui pointent vers lui (projets, factures…)
  const parties = await RadarEntity.find({ workspaceId, coreType: 'Party' }).select('canonicalKey aliasKeys label attributes').lean();
  const others = await RadarEntity.find({ workspaceId, coreType: { $in: ['Project', 'Transaction'] } }).select('canonicalKey aliasKeys coreType subtype label attributes').lean();
  const keyToCanon = new Map();
  for (const p of parties) { keyToCanon.set(p.canonicalKey, p.canonicalKey); for (const a of p.aliasKeys || []) keyToCanon.set(a, p.canonicalKey); }
  const rels = await RadarRelation.find({ workspaceId, type: { $in: ['party_of', 'relates_to'] } }).select('fromKey toKey').lean();
  const relatedLabels = new Map();
  const labelByKey = new Map(others.map(o => [o.canonicalKey, o.label]));
  for (const o of others) { for (const a of o.aliasKeys || []) labelByKey.set(a, o.label); }
  for (const r of rels) {
    const client = keyToCanon.get(r.toKey);
    if (client && labelByKey.has(r.fromKey)) { const arr = relatedLabels.get(client) || []; arr.push(labelByKey.get(r.fromKey)); relatedLabels.set(client, arr); }
  }

  let classified = 0; const byType = {};
  const bump = (k, v) => { if (!v) return; byType[k] = byType[k] || {}; byType[k][v] = (byType[k][v] || 0) + 1; };
  const apply = async (e, ctx) => {
    const t = classifyEntity(e, ctx);
    const field = t.segment ? 'segment' : t.kind ? 'kind' : null;
    if (!field) return;
    await RadarEntity.updateOne({ workspaceId, canonicalKey: e.canonicalKey }, { $set: { [`attributes.${field}`]: t[field] } });
    classified++; bump(e.coreType, t[field]);
  };
  for (const p of parties) await apply(p, { relatedLabels: relatedLabels.get(p.canonicalKey) || [] });
  for (const o of others) await apply(o, {});

  log(`[classify] ${classified} entités typées`, byType);
  return { classified, byType };
}

module.exports = { classifyEntity, classifyWorkspace, SECTOR_RULES, PROJECT_KIND_RULES, INVOICE_KIND_RULES };
