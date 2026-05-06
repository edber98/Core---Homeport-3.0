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

async function importManifest(manifest, { dryRun = false, repo = null, manifestPath = null } = {}){
  const m = manifest || {};
  const summary = { providers: { created: 0, updated: 0, skipped: 0 }, nodeTemplates: { created: 0, updated: 0, skipped: 0 }, history: [], providerKeys: [], templateKeys: [] };
  const record = (kind, key, action, before, after) => {
    summary.history.push({ kind, key, action, beforeChecksum: before || null, afterChecksum: after || null, repoId: repo && repo.id || null, repoName: repo && repo.name || null, manifestPath: manifestPath || null, at: new Date() });
  };
  const isLocalRepo = !!(m && m.repo && String(m.repo.type || '').toLowerCase() === 'local');

  for (const p of (m.providers || [])){
    const key = p.key; if (!key) continue;
    summary.providerKeys.push(key);
    const credForm = p.credentialsForm || p.credentials || null;
    // Only local repos may define display order; use value from manifest when present, otherwise ignore
    const effOrder = isLocalRepo && (typeof p.order === 'number') ? p.order : undefined;
    const checksum = checksumJSON({ key: p.key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags, categories: p.categories, order: effOrder, enabled: p.enabled, hasCredentials: p.hasCredentials, allowWithoutCredentials: p.allowWithoutCredentials, credentialsForm: credForm });
    const existing = await Provider.findOne({ key });
    if (!existing){
      if (!dryRun){
        const doc = { key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], order: effOrder, enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum };
        if (repo && repo.id){ doc.repoId = repo.id; doc.repoName = repo.name; doc.repos = [repo.id]; doc.repoNames = [repo.name]; }
        await Provider.create(doc);
      }
      summary.providers.created++;
      record('provider', key, 'created', null, checksum);
    } else if (existing.checksum !== checksum){
      // If provider already belongs to another repo, keep association and skip conflicting updates
      const belongsElsewhere = existing.repoId && repo && repo.id && String(existing.repoId) !== String(repo.id);
      if (belongsElsewhere){
        summary.providers.skipped++;
        record('provider', key, 'skipped', existing.checksum, checksum);
      } else {
        if (!dryRun){
          const before = existing.checksum;
          Object.assign(existing, { name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], order: effOrder, enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum });
          existing.markModified('credentialsForm');
          if (!existing.repoId && repo && repo.id) { existing.repoId = repo.id; existing.repoName = repo.name; }
          if (repo && repo.id){
            const rid = String(repo.id);
            const names = new Set([...(existing.repoNames || [])]); names.add(repo.name || '');
            const ids = new Set((existing.repos || []).map(x => String(x)));
            if (!ids.has(rid)) existing.repos = [...ids, rid];
            existing.repoNames = [...names].filter(Boolean);
          }
          await existing.save();
          record('provider', key, 'updated', before, checksum);
        }
        summary.providers.updated++;
      }
    } else {
      // Even when skipped (no content change), ensure repo linkage exists
      if (!dryRun && repo && repo.id){
        const rid = String(repo.id);
        const ids = new Set((existing.repos || []).map(x => String(x)));
        if (!ids.has(rid)){
          existing.repos = [...ids, rid];
          const names = new Set([...(existing.repoNames || [])]); names.add(repo.name || ''); existing.repoNames = [...names].filter(Boolean);
          if (!existing.repoId) { existing.repoId = repo.id; existing.repoName = repo.name; }
          // Ensure order is set only when provided in manifest for local repos
          if (typeof effOrder === 'number') existing.order = effOrder;
          await existing.save();
        }
      }
      summary.providers.skipped++;
    }
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
            const mode = (t === 'schema_builder' || t === 'tags') ? 'val' : 'expr';
            f.expression = { allow: true, defaultMode: mode, autoHeight: true, ...cur };
          }
        }
      };
      if (Array.isArray(schema.fields)) visitFields(schema.fields);
      if (Array.isArray(schema.steps)) (schema.steps || []).forEach(st => visitFields((st && st.fields) || []));
      return schema;
    } catch { return schema; }
  };

  // Ensure all input fields have a default itemStyle (padding 4px, margin 0px)
  const ensureDefaultItemStyle = (schema) => {
    try {
      if (!schema || typeof schema !== 'object') return schema;
      const defaultStyle = { marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px', paddingTop: '4px', paddingRight: '4px', paddingBottom: '4px', paddingLeft: '4px' };
      const visitFields = (fields) => {
        for (const f of (fields || [])) {
          if (!f || typeof f !== 'object') continue;
          const t = String(f.type || '').toLowerCase();
          if (t === 'section' || t === 'section_array') {
            visitFields(f.fields || []);
          } else if (t && t !== 'textblock') {
            if (!f.itemStyle) f.itemStyle = { ...defaultStyle };
          }
        }
      };
      if (Array.isArray(schema.fields)) visitFields(schema.fields);
      if (Array.isArray(schema.steps)) (schema.steps || []).forEach(st => visitFields((st && st.fields) || []));
      return schema;
    } catch { return schema; }
  };

  // (Descriptions are now expected to be present in manifests directly; importer no longer injects them.)

  // Prepare manifest-level variables to reuse schemas across templates
  const manifestVars = (() => {
    const v = (m.variables && typeof m.variables === 'object') ? m.variables : (m.vars && typeof m.vars === 'object') ? m.vars : null;
    return v || {};
  })();

  for (const t of (m.nodeTemplates || [])){
    const key = t.key; if (!key) continue;
    summary.templateKeys.push(key);
    // Ensure provider exists if providerKey declared
    if (t.providerKey){
      const provExisting = await Provider.findOne({ key: t.providerKey });
      if (!provExisting && !dryRun){
        const title = humanizeTitle(t.providerKey);
        const checksum = checksumJSON({ key: t.providerKey, name: t.providerKey, title, iconClass: null, iconUrl: null, color: null, tags: [], categories: [], enabled: true, hasCredentials: false, allowWithoutCredentials: true, credentialsForm: null });
        await Provider.create({ key: t.providerKey, name: t.providerKey, title, enabled: true, hasCredentials: false, allowWithoutCredentials: true, checksum, repoId: repo && repo.id || undefined, repoName: repo && repo.name || undefined });
        summary.providers.created++;
        record('provider', t.providerKey, 'created', null, checksum);
      }
    }
    const argsWithExpr = ensureDefaultItemStyle(enableExpressionsOnSchema(t.args || {}));
    // Normalize output schemas (per handle)
    // output schemas now live inside each output handle (h.schema). Also support mapping via variables below.
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
      const varsLocal = (t && t.variables && typeof t.variables === 'object') ? t.variables : {};
      const allVars = { ...manifestVars, ...varsLocal };
      const resolveSchema = (sch) => {
        try {
          if (!sch) return undefined;
          if (typeof sch === 'string') { const k = sch.replace(/^\$var:/,'').replace(/^\$/,''); return allVars[k] || undefined; }
          if (typeof sch === 'object' && sch.$var) { const k = String(sch.$var); return allVars[k] || undefined; }
          return sch;
        } catch { return sch; }
      };
      const outHs = rawOut.filter((h) => !(Array.isArray(h?.accepts) || h?.arrayField));
      // attach schema per output if provided, resolve via variables and enable expressions
      const outWithSchema = outHs.map(h => {
        const base = { ...h };
        let schema = resolveSchema((h && (h.schema)) || (t.outputSchemas && t.outputSchemas[h.id]));
        if (schema) schema = enableExpressionsOnSchema(schema);
        if (schema) base.schema = schema;
        return base;
      });
      const linkHs = (t.linkedHandles && Array.isArray(t.linkedHandles)) ? t.linkedHandles : rawOut.filter((h) => (Array.isArray(h?.accepts) || h?.arrayField)).map((h) => ({ id: h.id, name: h.name, type: h.type, multiple: h.multiple, accepts: h.accepts }));
      // Drop inputs for triggers even if present
      const tt = String(t.nodeKind || t.type || '').toLowerCase();
      const isTrigger = (tt === 'start' || tt === 'start_form' || tt === 'event' || tt === 'endpoint');
      v2 = { inputHandles: isTrigger ? undefined : (inHs || undefined), outputHandles: outWithSchema.length ? outWithSchema : undefined, linkedHandles: linkHs.length ? linkHs : undefined, nodeKind: t.nodeKind || t.type, schemaVersion: 2 };
    } else {
      v2 = { ...toV2Handles(t), linkedHandles: undefined, schemaVersion: 2 };
    }
    // Risk classification (safe | write | destructive | elevated). Defaults to 'write'
    // when a function is not tagged in its manifest — writes are the safest
    // default assumption when an operation has side effects.
    const normRisk = (() => {
      const r = String(t.risk || '').toLowerCase();
      return ['safe', 'write', 'destructive', 'elevated'].includes(r) ? r : 'write';
    })();
    const normRiskReason = typeof t.riskReason === 'string' && t.riskReason.trim() ? t.riskReason.trim() : undefined;
    const checksumArgs = checksumJSON(argsWithExpr || {});
    const checksumFeature = checksumJSON({ authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, nodeKind: v2.nodeKind, inputHandles: v2.inputHandles, outputHandles: v2.outputHandles, linkedHandles: v2.linkedHandles, output_array_field: t.output_array_field, output_schema_field: t.output_schema_field, outputSchema: t.outputSchema, risk: normRisk });
    const existing = await NodeTemplate.findOne({ key });
    // Normalize name/title/description
    const normName = toCamelCase(t.name || key);
    const normTitle = t.title || humanizeTitle(normName);
    const normDesc = t.description || `${normTitle} node`;
    // Merge risk info into metadata (preserves any other metadata set by manifest)
    const manifestMeta = (t.metadata && typeof t.metadata === 'object') ? t.metadata : {};
    const normMetadata = { ...manifestMeta, risk: normRisk, ...(normRiskReason ? { riskReason: normRiskReason } : {}) };
    const base = { key, schemaVersion: 2, name: normName, title: normTitle, subtitle: t.subtitle, icon: t.icon, description: normDesc, tags: t.tags || [], group: t.group, type: v2.nodeKind || t.type, nodeKind: v2.nodeKind || t.type, category: t.category || '', providerKey: t.providerKey || t.provider || null, appName: t.appName || t.app || null, args: argsWithExpr || null, inputHandles: v2.inputHandles, outputHandles: v2.outputHandles, linkedHandles: v2.linkedHandles, authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, output_array_field: t.output_array_field || undefined, output_schema_field: t.output_schema_field || undefined, outputSchema: t.outputSchema || undefined, risk: normRisk, riskReason: normRiskReason, metadata: normMetadata, checksumArgs, checksumFeature };
    if (!existing){
      if (!dryRun){ const doc = { ...base }; if (repo && repo.id) { doc.repoId = repo.id; doc.repoName = repo.name; doc.repos = [repo.id]; doc.repoNames = [repo.name]; } await NodeTemplate.create(doc); record('template', key, 'created', null, checksumFeature + '|' + checksumArgs); }
      summary.nodeTemplates.created++;
    } else {
      const eq = existing.checksumArgs === checksumArgs && existing.checksumFeature === checksumFeature && existing.providerKey === base.providerKey && existing.appName === base.appName && existing.title === base.title && existing.subtitle === base.subtitle && existing.icon === base.icon && existing.description === base.description && (existing.tags || []).join(',') === (base.tags || []).join(',') && existing.group === base.group && JSON.stringify(existing.args || {}) === JSON.stringify(base.args || {}) && JSON.stringify(existing.inputHandles || []) === JSON.stringify(base.inputHandles || []) && JSON.stringify(existing.outputHandles || []) === JSON.stringify(base.outputHandles || []) && JSON.stringify(existing.linkedHandles || []) === JSON.stringify(base.linkedHandles || []) && existing.risk === base.risk && (existing.riskReason || undefined) === base.riskReason;
      if (!eq){ if (!dryRun){ const before = (existing.checksumFeature || '') + '|' + (existing.checksumArgs || ''); Object.assign(existing, base); existing.markModified('args'); existing.markModified('inputHandles'); existing.markModified('outputHandles'); existing.markModified('linkedHandles'); existing.markModified('outputSchema'); existing.markModified('metadata'); if (!existing.repoId && repo && repo.id) { existing.repoId = repo.id; existing.repoName = repo.name; } if (repo && repo.id){ const rid = String(repo.id); const ids = new Set((existing.repos || []).map(x => String(x))); if (!ids.has(rid)) existing.repos = [...ids, rid]; const names = new Set([...(existing.repoNames || [])]); names.add(repo.name || ''); existing.repoNames = [...names].filter(Boolean); } await existing.save(); record('template', key, 'updated', before, checksumFeature + '|' + checksumArgs); } summary.nodeTemplates.updated++; } else {
        // Keep repo linkage in sync even if skipped
        if (!dryRun && repo && repo.id){ const rid = String(repo.id); const ids = new Set((existing.repos || []).map(x => String(x))); if (!ids.has(rid)) { existing.repos = [...ids, rid]; const names = new Set([...(existing.repoNames || [])]); names.add(repo.name || ''); existing.repoNames = [...names].filter(Boolean); if (!existing.repoId) { existing.repoId = repo.id; existing.repoName = repo.name; } await existing.save(); } }
        summary.nodeTemplates.skipped++;
      }
    }
  }

  return summary;
}

/**
 * Remove providers and templates from DB that no longer exist in any manifest for a given repo.
 * @param {string} repoId - The repo ObjectId
 * @param {Set<string>} manifestProviderKeys - All provider keys found in this repo's manifest
 * @param {Set<string>} manifestTemplateKeys - All template keys found in this repo's manifest
 * @returns {Promise<{providersRemoved: number, templatesRemoved: number}>}
 */
async function cleanupStale(repoId, manifestProviderKeys, manifestTemplateKeys){
  const result = { providersRemoved: 0, templatesRemoved: 0 };
  if (!repoId) return result;

  // Cleanup stale templates: belong to this repo but not in manifest anymore
  const dbTemplates = await NodeTemplate.find({ repoId }, { key: 1, repos: 1 });
  const staleTemplates = dbTemplates.filter(t => !manifestTemplateKeys.has(t.key));
  if (staleTemplates.length > 0){
    const ids = staleTemplates.map(t => t._id);
    await NodeTemplate.deleteMany({ _id: { $in: ids } });
    result.templatesRemoved = staleTemplates.length;
    console.log(`[plugins] cleanup: removed ${staleTemplates.length} stale template(s) for repo ${repoId}:`, staleTemplates.map(t => t.key).join(', '));
  }

  // Cleanup stale providers: belong to this repo, not in manifest, and not shared with other repos
  const dbProviders = await Provider.find({ repoId }, { key: 1, repos: 1 });
  const staleProviders = dbProviders.filter(p => !manifestProviderKeys.has(p.key) && (!p.repos || p.repos.length <= 1));
  if (staleProviders.length > 0){
    const ids = staleProviders.map(p => p._id);
    await Provider.deleteMany({ _id: { $in: ids } });
    result.providersRemoved = staleProviders.length;
    console.log(`[plugins] cleanup: removed ${staleProviders.length} stale provider(s) for repo ${repoId}:`, staleProviders.map(p => p.key).join(', '));
  }

  return result;
}

module.exports = { importManifest, cleanupStale };
