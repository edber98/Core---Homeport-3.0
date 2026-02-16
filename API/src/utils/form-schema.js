function isSchemaLike(obj){
  return !!obj && typeof obj === 'object' && (Array.isArray(obj.fields) || Array.isArray(obj.steps));
}

function normalizeSchemaKeys(schema){
  if (!isSchemaLike(schema)) return schema;
  const used = new Set();
  const uniq = (obj, baseKey) => {
    if (!baseKey) return null;
    if (!used.has(baseKey)) { used.add(baseKey); return baseKey; }
    let i = 1;
    let next = `${baseKey}${i}`;
    while (used.has(next)) { i += 1; next = `${baseKey}${i}`; }
    used.add(next);
    return next;
  };
  const walk = (arr) => {
    for (const f of (arr || [])) {
      if (!f || typeof f !== 'object') continue;
      const isSection = (f.type === 'section' || f.type === 'section_array');
      if (isSection) {
        if (f.key && ((f.mode === 'array') || f.type === 'section_array')) {
          const nk = uniq(f, String(f.key));
          if (nk && nk !== f.key) f.key = nk;
        }
        walk(f.fields || []);
      } else if (f.type !== 'textblock' && f.key) {
        const nk = uniq(f, String(f.key));
        if (nk && nk !== f.key) f.key = nk;
      }
    }
  };
  if (Array.isArray(schema.steps)) schema.steps.forEach(st => walk(st.fields || []));
  else walk(schema.fields || []);
  return schema;
}

function normalizeGraphFormSchemas(graph){
  if (!graph || typeof graph !== 'object') return graph;
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  for (const n of nodes) {
    const model = n?.data?.model || n?.model || n?.data || null;
    if (!model || typeof model !== 'object') continue;
    if (isSchemaLike(model.context)) normalizeSchemaKeys(model.context);
    if (isSchemaLike(model.startFormSchema)) normalizeSchemaKeys(model.startFormSchema);
  }
  return graph;
}

module.exports = { normalizeSchemaKeys, normalizeGraphFormSchemas, isSchemaLike };
