// Radar — inférence d'un RadarMapping par LLM (adaptateur appris).
//
// Le LLM est PROFESSEUR une seule fois : il lit des échantillons réels d'un
// logiciel inconnu et produit un mapping déterministe vers l'ontologie. Ensuite,
// le mapping s'exécute sans LLM (linker). Re-inférence seulement sur dérive.

const { llmCompleteJSON } = require('../llm');
const { CORE_TYPES, isValidCoreType, isKnownSubtype, isValidRelation } = require('./ontology');
const { ensureSubtype } = require('./ontology-extend');
const { applyMapping, schemaChecksum } = require('./mapping');

/** Compacte un échantillon (limite la taille des valeurs) pour le prompt. */
function compactSample(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {}).slice(0, 60)) {
    if (v == null) { out[k] = v; continue; }
    if (typeof v === 'object') out[k] = Array.isArray(v) ? `[${v.length}]` : '{…}';
    else out[k] = typeof v === 'string' ? v.slice(0, 80) : v;
  }
  return out;
}

/** Type observé d'une valeur. */
function typeOf(v) {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  // heuristique date (timestamp unix ou ISO)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
  return 'string';
}

/**
 * APPREND le schéma à partir des données réelles : pour chaque champ, le(s) type(s)
 * observé(s), s'il est constant, et — crucial — détecte les TABLEAUX D'OBJETS
 * (lignes de facture, items…) avec leurs sous-champs. Sert au prompt ET à détecter
 * les structures douteuses (types incohérents → on demandera confirmation). Pure.
 */
function inferSchema(samples) {
  const fields = {};        // champ → { types:Set, present, total, arrayOfObjects?, subFields? }
  const total = samples.length;
  for (const s of samples) {
    if (!s || typeof s !== 'object') continue;
    for (const [k, v] of Object.entries(s)) {
      const f = fields[k] || (fields[k] = { types: new Set(), present: 0, subFields: new Set() });
      f.present++; f.types.add(typeOf(v));
      if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0]) {
        f.arrayOfObjects = true;
        for (const sk of Object.keys(v[0])) f.subFields.add(sk);
      }
    }
  }
  const out = {};
  const doubts = [];
  for (const [k, f] of Object.entries(fields)) {
    const types = [...f.types].filter(t => t !== 'null');
    out[k] = {
      type: f.arrayOfObjects ? 'array<object>' : (types[0] || 'null'),
      optional: f.present < total,
      ...(f.arrayOfObjects ? { lineFields: [...f.subFields].slice(0, 20) } : {}),
    };
    // doute : un même champ a plusieurs types non-null observés → structure instable
    if (types.length > 1) doubts.push(`champ "${k}" de types hétérogènes (${types.join('/')})`);
  }
  return { schema: out, doubts, arrayObjectFields: Object.keys(out).filter(k => out[k].type === 'array<object>') };
}

/** Compacte un schéma de sortie DÉCLARÉ (manifest) pour le prompt. Pure, tolérant aux formats. */
function compactSchema(schema, depth = 0) {
  if (!schema || depth > 3) return undefined;
  // format { fields: [{key,type,fields?}] } ou { properties } ou { key:type }
  const fields = schema.fields || schema.outputHandles?.[0]?.schema?.fields;
  if (Array.isArray(fields)) {
    const out = {};
    for (const f of fields.slice(0, 60)) {
      if (!f || !f.key) continue;
      out[f.key] = f.fields ? { type: f.type || 'object', of: compactSchema({ fields: f.fields }, depth + 1) } : (f.type || 'any');
    }
    return out;
  }
  if (schema.properties && typeof schema.properties === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(schema.properties).slice(0, 60)) out[k] = v?.type || 'any';
    return out;
  }
  return undefined;
}

/**
 * Infère un RadarMapping pour (providerKey, rawEntityType) à partir d'échantillons.
 * @param {object} opts
 * @param {string} opts.providerKey
 * @param {string} opts.rawEntityType - entityType du snapshot (ex: 'supplier_invoice')
 * @param {Array<object>} opts.samples - 3-10 enregistrements bruts réels
 * @param {function} [opts.complete] - injection LLM (tests) ; défaut llmCompleteJSON
 * @returns {Promise<{ mapping: object, valid: boolean, errors: string[] }|null>}
 */
async function inferMapping({ providerKey, rawEntityType, samples, outputSchema = null, complete = llmCompleteJSON }) {
  if (!samples || !samples.length) return null;
  const ontology = Object.fromEntries(Object.entries(CORE_TYPES).map(([k, v]) => [k, v.subtypes]));

  // Le schéma de sortie DÉCLARÉ du connecteur (types, libellés, sous-objets) est
  // un signal fort : il révèle des champs absents des échantillons (ex. tableaux
  // de lignes vides ce jour-là) et leur TYPE. On le fournit au LLM en plus des données.
  const schemaBlock = outputSchema
    ? `\n## Schéma de sortie DÉCLARÉ du connecteur (types fiables, à privilégier)\n${JSON.stringify(compactSchema(outputSchema), null, 1)}\n`
    : '';

  // Schéma APPRIS depuis les données réelles (types, optionnalité, tableaux d'objets).
  const learned = inferSchema(samples);
  const learnedBlock = `\n## Schéma APPRIS depuis les données (types observés)\n${JSON.stringify(learned.schema, null, 1)}\n${learned.arrayObjectFields.length ? `⚠️ Tableaux d'objets détectés (probables LIGNES à mapper en lineRules) : ${learned.arrayObjectFields.join(', ')}\n` : ''}`;

  const out = await complete(`Tu mappes les données d'un logiciel d'entreprise vers une ONTOLOGIE canonique.

## Ontologie cible (coreType → sous-types autorisés)
${JSON.stringify(ontology, null, 1)}

## Logiciel : "${providerKey}" — type d'enregistrement : "${rawEntityType}"
Échantillons réels (mêmes champs partout) :
${JSON.stringify(samples.slice(0, 6).map(compactSample), null, 1)}
${learnedBlock}${schemaBlock}
## Ta tâche
Produis un mapping DÉTERMINISTE de ces enregistrements vers l'ontologie :
- choisis le bon coreType + subtype ;
- keyField : le champ identifiant stable (souvent "id" ou "rowid") ;
- identityFields : champs d'identité FORTE pour dédupliquer cross-logiciels (email, siret, vat…) si présents, sinon [] ;
- labelField : le champ le plus lisible (nom, libellé, sujet, référence) ;
- fieldMap : { champCanonique: champBrut } pour les champs pertinents (amount_total, date, state, status, name, party…). IMPORTANT : s'il y a un champ d'ÉTAT/STATUT, mappe-le sur "state" (ou "status") ;
- valueMap : si un champ d'état contient des CODES (0, 1, 2, "A", "open"…), fournis leur traduction LISIBLE EN FRANÇAIS d'après ce que tu déduis des échantillons et du métier. Ex : { "state": { "0":"brouillon", "1":"émise", "2":"payée" } }. Ne laisse JAMAIS l'utilisateur voir des codes bruts. {} si l'état est déjà lisible ;
- relationRules : si un champ référence une autre entité (ex: socid → un client), crée { type:"party_of", role:"billed_to"|"client"|…, viaField:"socid", targetCoreType:"Party", targetSubtype:"organization" }. Relations autorisées : party_of, part_of, derived_from, references, assigned_to, scheduled_for ;
- lineRules : TRÈS IMPORTANT. Si l'enregistrement contient un TABLEAU de LIGNES (lignes de facture/devis/commande, items, détails…) où chaque ligne cite un PRODUIT/ARTICLE (fk_product, product_id, ref_article, sku…), crée une règle qui itère ce tableau pour relier la transaction à ses produits : { arrayField:"lines", viaField:"fk_product", qtyField:"qty", labelField:"product_label", type:"references", role:"line_item", targetCoreType:"Asset", targetSubtype:"product" }. Sans ça, on perd le lien facture↔articles et les goulots de stock. [] s'il n'y a aucune ligne d'article.

Réponds UNIQUEMENT en JSON :
{"target":{"coreType":"…","subtype":"…"},"roles":["…"],"keyField":"…","identityFields":["…"],"labelField":"…","fieldMap":{"…":"…"},"valueMap":{"state":{"code":"libellé"}},"relationRules":[{"type":"…","role":"…","viaField":"…","targetCoreType":"…","targetSubtype":"…"}],"lineRules":[{"arrayField":"lines","viaField":"fk_product","qtyField":"qty","labelField":"product_label","type":"references","role":"line_item","targetCoreType":"Asset","targetSubtype":"product"}]}`,
  { maxTokens: 1500 });

  if (!out || !out.target) return null;
  const errors = [];
  // Le coreType doit appartenir au squelette fermé (9). Le SOUS-TYPE est ouvert :
  // s'il est nouveau, on l'enregistre dans l'ontologie (adaptation au métier).
  let newSubtype = false;
  if (!isValidCoreType(out.target.coreType)) errors.push(`coreType invalide: ${out.target.coreType}`);
  else if (out.target.subtype && !isKnownSubtype(out.target.coreType, out.target.subtype)) newSubtype = true;
  if (!out.keyField) errors.push('keyField manquant');
  for (const r of out.relationRules || []) if (!isValidRelation(r.type)) errors.push(`relation invalide: ${r.type}`);
  // lineRules : on ne garde que celles bien formées (tableau + champ produit + relation valide)
  const lineRules = (out.lineRules || []).filter(lr =>
    lr && lr.arrayField && lr.viaField && isValidRelation(lr.type || 'references'))
    .map(lr => ({ ...lr, type: lr.type || 'references', role: lr.role || 'line_item',
      targetCoreType: lr.targetCoreType || 'Asset', targetSubtype: lr.targetSubtype || 'product' }));

  // ── PREDICT-OR-ASK : on détecte les structures DOUTEUSES → on n'auto-active pas,
  // on laisse en BROUILLON pour confirmation humaine (plutôt que deviner faux).
  const doubts = [...learned.doubts];
  // tableau d'objets détecté dans les données mais AUCUN lineRule produit → doute
  const lineFieldsMapped = new Set(lineRules.map(lr => lr.arrayField));
  for (const af of learned.arrayObjectFields) {
    if (!lineFieldsMapped.has(af)) doubts.push(`tableau d'objets "${af}" non mappé (lignes/sous-entités ?)`);
  }
  // champ d'état mappé mais sans valueMap (codes bruts probables) → doute léger
  const stateRaw = (out.fieldMap || {}).state || (out.fieldMap || {}).status;
  if (stateRaw && !(out.valueMap && (out.valueMap.state || out.valueMap.status))) {
    doubts.push(`champ d'état "${stateRaw}" sans traduction (valueMap) — risque de codes bruts`);
  }
  // nouveau sous-type inventé par le LLM = adaptation, mais à valider par un humain
  if (newSubtype) doubts.push(`sous-type nouveau "${out.target.subtype}" — à confirmer`);

  // Confiance : pénalisée par erreurs ET par doutes structurels.
  let confidence = errors.length ? 0.45 : 0.92;
  confidence -= Math.min(0.4, doubts.length * 0.12);
  const needsReview = errors.length > 0 || doubts.length > 0 || confidence < 0.7;

  const mapping = {
    providerKey, rawEntityType,
    target: out.target, roles: out.roles || [],
    keyField: out.keyField, identityFields: out.identityFields || [],
    labelField: out.labelField, fieldMap: out.fieldMap || {},
    valueMap: out.valueMap || {}, relationRules: (out.relationRules || []).filter(r => isValidRelation(r.type)),
    lineRules,
    learnedSchema: learned.schema,                 // schéma appris conservé (audit + dérive)
    checksum: schemaChecksum(samples[0]), learnedBy: 'llm',
    confidence: Math.round(confidence * 100) / 100,
    // On n'ACTIVE automatiquement que si confiant ET sans doute ; sinon BROUILLON à confirmer.
    status: needsReview ? 'draft' : 'active',
    reviewReasons: needsReview ? [...errors, ...doubts] : [],
  };

  // Test à blanc : le mapping s'applique-t-il aux échantillons sans planter ?
  let applied = 0;
  for (const s of samples) { if (applyMapping(s, mapping)) applied++; }
  if (applied === 0) { errors.push('mapping inapplicable aux échantillons'); mapping.status = 'draft'; }

  const valid = errors.length === 0 && applied > 0;
  // Adaptation au métier : on enregistre le nouveau sous-type dans l'ontologie
  // SEULEMENT s'il n'y a pas d'erreur (le doute « à confirmer » n'empêche pas l'enregistrement).
  if (valid && newSubtype) {
    await ensureSubtype({ coreType: out.target.coreType, subtype: out.target.subtype, source: 'llm', workspaceId: null }).catch(() => {});
  }
  return { mapping, valid, errors, doubts, needsReview, appliedToSamples: applied, newSubtype: newSubtype && valid };
}

module.exports = { inferMapping, compactSample, inferSchema, compactSchema };
