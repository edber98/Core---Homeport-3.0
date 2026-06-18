// Radar — application d'un RadarMapping à un enregistrement brut (pur, sans DB).
//
// raw record (snapshot.data) + mapping → { entity canonique, relations[] }.
// Déterministe : c'est ce qui s'exécute des millions de fois sans LLM.

const { checksumJSON } = require('../../utils/checksum');

function _get(obj, field) {
  if (!field) return undefined;
  // support du chemin pointé (ex: "thirdparty.email")
  return String(field).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Construit la clé canonique d'identité (forte si possible, sinon provider:type:id). Pure. */
function buildCanonicalKey(raw, mapping) {
  for (const f of mapping.identityFields || []) {
    const v = _get(raw, f);
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return `${f}:${String(v).trim().toLowerCase()}`;
    }
  }
  const ext = _get(raw, mapping.keyField);
  return `${mapping.providerKey}:${mapping.rawEntityType}:${ext}`;
}

/** Applique le mapping → entité canonique + specs de relations. Pure. */
function applyMapping(raw, mapping) {
  if (!raw || typeof raw !== 'object') return null;
  const ext = _get(raw, mapping.keyField);
  if (ext === undefined || ext === null || String(ext) === '') return null;

  // Champs canoniques
  const attributes = {};
  for (const [canon, rawField] of Object.entries(mapping.fieldMap || {})) {
    let val = _get(raw, rawField);
    const vm = mapping.valueMap && mapping.valueMap[canon];
    if (vm && val != null && Object.prototype.hasOwnProperty.call(vm, String(val))) {
      val = vm[String(val)];
    }
    if (val !== undefined) attributes[canon] = val;
  }

  const label = (_get(raw, mapping.labelField) || attributes.name || attributes.title
    || attributes.number || attributes.subject || String(ext));

  // Rôles : statiques (mapping.roles) + conditionnels (roleRules selon un champ)
  const roles = new Set(mapping.roles || []);
  for (const rr of mapping.roleRules || []) {
    const v = _get(raw, rr.field);
    if (rr.equals !== undefined ? String(v) === String(rr.equals) : (v != null && v !== '' && v !== 0 && v !== '0')) {
      roles.add(rr.role);
    }
  }

  const canonicalKey = buildCanonicalKey(raw, mapping);

  // Relations : chaque règle qui a une valeur source crée une relation vers une
  // entité (référencée par sa clé canonique cible).
  const relations = [];
  for (const r of mapping.relationRules || []) {
    const v = _get(raw, r.viaField);
    if (v === undefined || v === null || String(v) === '') continue;
    // clé canonique de la cible : par défaut provider:targetType:value
    const targetKey = r.targetKey
      ? r.targetKey.replace('{value}', String(v))
      : `${mapping.providerKey}:${r.targetRawType || r.targetSubtype}:${v}`;
    relations.push({
      type: r.type,
      role: r.role,
      toKey: targetKey,
      target: { coreType: r.targetCoreType, subtype: r.targetSubtype },
      evidence: { viaField: r.viaField, value: v },
    });
  }

  // lineRules : transactions à LIGNES d'articles (facture/devis/commande). On
  // itère le tableau de lignes → une relation `references` par produit cité.
  // C'est ce qui relie une facture aux ARTICLES/PRODUITS et révèle les goulots
  // de stock (produit très demandé vs stock faible).
  for (const lr of mapping.lineRules || []) {
    const arr = _get(raw, lr.arrayField);
    if (!Array.isArray(arr)) continue;
    const summary = [];
    for (const line of arr) {
      if (!line || typeof line !== 'object') continue;
      const pid = _get(line, lr.viaField);
      if (pid === undefined || pid === null || String(pid) === '') continue;
      const targetKey = lr.targetKey
        ? lr.targetKey.replace('{value}', String(pid))
        : `${mapping.providerKey}:${lr.targetRawType || lr.targetSubtype || 'product'}:${pid}`;
      const qty = lr.qtyField ? _get(line, lr.qtyField) : undefined;
      relations.push({
        type: lr.type || 'references',
        role: lr.role || 'line_item',
        toKey: targetKey,
        target: { coreType: lr.targetCoreType || 'Asset', subtype: lr.targetSubtype || 'product' },
        evidence: { line: true, product: pid, qty },
      });
      summary.push({ product: String(pid), label: lr.labelField ? _get(line, lr.labelField) : undefined, qty });
    }
    if (summary.length) attributes[lr.summaryAttr || 'line_items'] = summary;
  }

  return {
    coreType: mapping.target.coreType,
    subtype: mapping.target.subtype,
    roles: [...roles],
    canonicalKey,
    label: String(label).slice(0, 300),
    attributes,
    externalId: String(ext),
    rawHash: checksumJSON(raw).slice(0, 16),
    relations,
  };
}

/** Checksum des CHAMPS d'un enregistrement (pour la détection de dérive de schéma). Pure. */
function schemaChecksum(raw) {
  if (!raw || typeof raw !== 'object') return '';
  return checksumJSON(Object.keys(raw).sort()).slice(0, 16);
}

module.exports = { applyMapping, buildCanonicalKey, schemaChecksum, _get };
