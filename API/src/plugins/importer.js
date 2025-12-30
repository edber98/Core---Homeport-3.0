const Provider = require('../db/models/provider.model');
const NodeTemplate = require('../db/models/node-template.model');
const { checksumJSON } = require('../utils/checksum');

function toCamelCase(s){
  try {
    if (!s) return '';
    const parts = String(s).replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/);
    if (!parts.length) return '';
    const [first, ...rest] = parts;
    return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  } catch { return String(s || '').trim(); }
}
function humanizeTitle(s){
  try {
    if (!s) return '';
    // split camelCase into words, then capitalize
    const spaced = String(s).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
    return spaced.replace(/\b\w/g, c => c.toUpperCase());
  } catch { return String(s || 'Node'); }
}

async function importManifest(manifest, { dryRun = false, repo = null } = {}){
  const m = manifest || {};
  const summary = { providers: { created: 0, updated: 0, skipped: 0 }, nodeTemplates: { created: 0, updated: 0, skipped: 0 } };

  for (const p of (m.providers || [])){
    const key = p.key; if (!key) continue;
    const credForm = p.credentialsForm || p.credentials || null;
    const checksum = checksumJSON({ key: p.key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags, categories: p.categories, enabled: p.enabled, hasCredentials: p.hasCredentials, allowWithoutCredentials: p.allowWithoutCredentials, credentialsForm: credForm });
    const existing = await Provider.findOne({ key });
    if (!existing){
      if (!dryRun){ await Provider.create({ key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum, repoId: repo && repo.id || undefined, repoName: repo && repo.name || undefined }); }
      summary.providers.created++;
    } else if (existing.checksum !== checksum){
      if (!dryRun){ Object.assign(existing, { name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum }); if (!existing.repoId && repo && repo.id) { existing.repoId = repo.id; existing.repoName = repo.name; } await existing.save(); }
      summary.providers.updated++;
    } else { summary.providers.skipped++; }
  }

  // Ensure expression editor is enabled by default for all node template args (form-builder schemas)
  const enableExpressionsOnSchema = (schema) => {
    try {
      if (!schema || typeof schema !== 'object') return schema;
      const visitFields = (fields) => {
        for (const f of (fields || [])) {
          if (!f || typeof f !== 'object') continue;
          const t = String(f.type || '').toLowerCase();
          if (t === 'section' || t === 'section_array') {
            // recurse into section contents
            visitFields(f.fields || []);
          } else if (t && t !== 'textblock') {
            const cur = f.expression && typeof f.expression === 'object' ? f.expression : {};
            f.expression = { ...cur, allow: true, defaultMode: 'expr' };
          }
        }
      };
      if (Array.isArray(schema.fields)) visitFields(schema.fields);
      if (Array.isArray(schema.steps)) (schema.steps || []).forEach(st => visitFields((st && st.fields) || []));
      return schema;
    } catch { return schema; }
  };

  for (const t of (m.nodeTemplates || [])){
    const key = t.key; if (!key) continue;
    const argsWithExpr = enableExpressionsOnSchema(t.args || {});
    // v2 detection: presence of handles or nodeKind
    const isV2 = Array.isArray(t.inputHandles) || Array.isArray(t.outputHandles) || Array.isArray(t.linkedHandles) || !!t.nodeKind || t.schemaVersion === 2;
    // Convert v1 outputs to v2 handles if needed
    const toV2Handles = (tpl) => {
      const t = String(tpl.type || '').toLowerCase();
      const isTrigger = (t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint');
      const outs = Array.isArray(tpl.output) ? tpl.output : [];
      const mkId = (s) => String((s || '').toString().trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_') || 'ok');
      let oHandles = outs.length ? outs.map(n => ({ id: mkId(n), name: n, type: isTrigger ? 'payload' : 'any' })) : [{ id: 'ok', name: 'Success', type: isTrigger ? 'payload' : 'any' }];
      // Carry over array_field if present (legacy conditions)
      if (tpl.output_array_field && oHandles[0]) oHandles[0].arrayField = tpl.output_array_field;
      const inHs = isTrigger ? undefined : [{ id: 'in', name: 'In', type: 'any' }];
      return { inputHandles: inHs, outputHandles: oHandles, nodeKind: tpl.type };
    };
    // Normalize v2 fields and split any legacy link-like entries from outputHandles into linkedHandles
    let v2;
    if (isV2) {
      const inHs = Array.isArray(t.inputHandles) ? t.inputHandles : undefined;
      const rawOut = Array.isArray(t.outputHandles) ? t.outputHandles : [];
      const outHs = rawOut.filter((h) => !(Array.isArray(h?.accepts) || h?.arrayField));
      const linkHs = (t.linkedHandles && Array.isArray(t.linkedHandles)) ? t.linkedHandles : rawOut.filter((h) => (Array.isArray(h?.accepts) || h?.arrayField)).map((h) => ({ id: h.id, name: h.name, type: h.type, multiple: h.multiple, accepts: h.accepts }));
      // Drop inputs for triggers even if present
      const tt = String(t.nodeKind || t.type || '').toLowerCase();
      const isTrigger = (tt === 'start' || tt === 'start_form' || tt === 'event' || tt === 'endpoint');
      v2 = { inputHandles: isTrigger ? undefined : (inHs || undefined), outputHandles: outHs.length ? outHs : undefined, linkedHandles: linkHs.length ? linkHs : undefined, nodeKind: t.nodeKind || t.type, schemaVersion: 2 };
    } else {
      v2 = { ...toV2Handles(t), linkedHandles: undefined, schemaVersion: 2 };
    }
    const checksumArgs = checksumJSON(argsWithExpr || {});
    const checksumFeature = checksumJSON({ authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, nodeKind: v2.nodeKind, inputHandles: v2.inputHandles, outputHandles: v2.outputHandles, linkedHandles: v2.linkedHandles });
    const existing = await NodeTemplate.findOne({ key });
    // Normalize name/title/description
    const normName = toCamelCase(t.name || key);
    const normTitle = t.title || humanizeTitle(normName);
    const normDesc = t.description || `${normTitle} node`;
    const base = { key, schemaVersion: 2, name: normName, title: normTitle, subtitle: t.subtitle, icon: t.icon, description: normDesc, tags: t.tags || [], group: t.group, type: v2.nodeKind || t.type, nodeKind: v2.nodeKind || t.type, category: t.category || '', providerKey: t.providerKey || t.provider || null, appName: t.appName || t.app || null, args: argsWithExpr || null, inputHandles: v2.inputHandles, outputHandles: v2.outputHandles, linkedHandles: v2.linkedHandles, authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, checksumArgs, checksumFeature };
    if (!existing){
      if (!dryRun){ await NodeTemplate.create({ ...base, repoId: repo && repo.id || undefined, repoName: repo && repo.name || undefined }); }
      summary.nodeTemplates.created++;
    } else {
      const eq = existing.checksumArgs === checksumArgs && existing.checksumFeature === checksumFeature && existing.providerKey === base.providerKey && existing.appName === base.appName && existing.title === base.title && existing.subtitle === base.subtitle && existing.icon === base.icon && existing.description === base.description && (existing.tags || []).join(',') === (base.tags || []).join(',') && existing.group === base.group && JSON.stringify(existing.args || {}) === JSON.stringify(base.args || {}) && JSON.stringify(existing.inputHandles || []) === JSON.stringify(base.inputHandles || []) && JSON.stringify(existing.outputHandles || []) === JSON.stringify(base.outputHandles || []) && JSON.stringify(existing.linkedHandles || []) === JSON.stringify(base.linkedHandles || []);
      if (!eq){ if (!dryRun){ Object.assign(existing, base); if (!existing.repoId && repo && repo.id) { existing.repoId = repo.id; existing.repoName = repo.name; } await existing.save(); } summary.nodeTemplates.updated++; } else { summary.nodeTemplates.skipped++; }
    }
  }

  return summary;
}

module.exports = { importManifest };
