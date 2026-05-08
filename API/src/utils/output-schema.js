// Helper centralisé pour la résolution dynamique des output schemas.
//
// Trois patterns supportés sur un nodeTemplate :
//
// 1. Schema statique uniquement
//    → outputHandles[0].schema = { fields: [...] }
//
// 2. Schema dynamique (l'utilisateur le définit via un schema_builder dans args)
//    → output_schema_field: "extraction_schema"   (pointe sur node.context[<field>])
//    → quand l'utilisateur a défini son schema, REMPLACE le schema statique
//
// 3. Schema dynamique fusionné dans un sous-field du schema statique
//    → output_schema_field: "payload_schema"
//    → output_schema_merge_at: "body"
//    → on garde le schema statique mais on remplace les sub-fields du field
//      ciblé par les fields du schema dynamique. Permet d'avoir method/headers/
//      query au top-level + body typé par l'utilisateur.

/**
 * Résout le schema effectif pour un node donné.
 * @param {object} tpl - le templateObj (avec output_schema_field, output_schema_merge_at)
 * @param {object} context - node.context (où vit la valeur du schema_builder)
 * @param {object} staticSchema - le schema statique (outputHandles[0].schema résolu)
 * @returns {object|null} le schema final à utiliser, ou staticSchema/dynamic selon config
 */
function resolveOutputSchema(tpl, context, staticSchema) {
  const field = tpl?.output_schema_field;
  if (!field) return staticSchema || null;

  const dynamic = context?.[field];
  // Si la valeur est absente ou pas un schema valide, fallback sur le statique
  if (!dynamic || typeof dynamic !== 'object' || !Array.isArray(dynamic.fields)) {
    return staticSchema || null;
  }

  const mergeAt = tpl?.output_schema_merge_at;
  if (!mergeAt) {
    // Mode replace : le schema dynamique remplace le statique
    return dynamic;
  }

  // Mode merge : on insère les fields du dynamique dans le sous-field du statique
  if (!staticSchema || !Array.isArray(staticSchema.fields)) return dynamic;

  // Deep clone pour ne pas muter le statique
  const merged = JSON.parse(JSON.stringify(staticSchema));
  const target = (merged.fields || []).find(f => f && f.key === mergeAt);
  if (!target) {
    // Path introuvable → fallback dynamique seul (au lieu d'un merge incohérent)
    return dynamic;
  }
  target.fields = (dynamic.fields || []).map(f => ({ ...f }));
  // Si le target n'était pas une section (souvent type: json), on le convertit
  if (target.type !== 'section' && target.type !== 'section_array') {
    target.type = 'section';
  }
  return merged;
}

module.exports = { resolveOutputSchema };
