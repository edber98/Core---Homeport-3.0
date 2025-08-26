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

  for (const t of (m.nodeTemplates || [])){
    const key = t.key; if (!key) continue;
    const checksumArgs = checksumJSON(t.args || {});
    const checksumFeature = checksumJSON({ authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, output: t.output || [], allowWithoutCredentials: !!t.allowWithoutCredentials, output_array_field: t.output_array_field || null });
    const existing = await NodeTemplate.findOne({ key });
    // Normalize name/title/description
    const normName = toCamelCase(t.name || key);
    const normTitle = t.title || humanizeTitle(normName);
    const normDesc = t.description || `${normTitle} node`;
    const base = { key, name: normName, title: normTitle, subtitle: t.subtitle, icon: t.icon, description: normDesc, tags: t.tags || [], group: t.group, type: t.type, category: t.category || '', providerKey: t.providerKey || t.provider || null, appName: t.appName || t.app || null, args: t.args || null, output: t.output || [], authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, output_array_field: t.output_array_field || null, checksumArgs, checksumFeature };
    if (!existing){
      if (!dryRun){ await NodeTemplate.create({ ...base, repoId: repo && repo.id || undefined, repoName: repo && repo.name || undefined }); }
      summary.nodeTemplates.created++;
    } else {
      const eq = existing.checksumArgs === checksumArgs && existing.checksumFeature === checksumFeature && existing.providerKey === base.providerKey && existing.appName === base.appName && existing.title === base.title && existing.subtitle === base.subtitle && existing.icon === base.icon && existing.description === base.description && (existing.tags || []).join(',') === (base.tags || []).join(',') && existing.group === base.group && JSON.stringify(existing.args || {}) === JSON.stringify(base.args || {});
      if (!eq){ if (!dryRun){ Object.assign(existing, base); if (!existing.repoId && repo && repo.id) { existing.repoId = repo.id; existing.repoName = repo.name; } await existing.save(); } summary.nodeTemplates.updated++; } else { summary.nodeTemplates.skipped++; }
    }
  }

  return summary;
}

module.exports = { importManifest };
