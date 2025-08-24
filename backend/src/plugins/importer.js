const Provider = require('../db/models/provider.model');
const NodeTemplate = require('../db/models/node-template.model');
const { checksumJSON } = require('../utils/checksum');

async function importManifest(manifest, { dryRun = false } = {}){
  const m = manifest || {};
  const summary = { providers: { created: 0, updated: 0, skipped: 0 }, nodeTemplates: { created: 0, updated: 0, skipped: 0 } };

  for (const p of (m.providers || [])){
    const key = p.key; if (!key) continue;
    const credForm = p.credentialsForm || p.credentials || null;
    const checksum = checksumJSON({ key: p.key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags, categories: p.categories, enabled: p.enabled, hasCredentials: p.hasCredentials, allowWithoutCredentials: p.allowWithoutCredentials, credentialsForm: credForm });
    const existing = await Provider.findOne({ key });
    if (!existing){
      if (!dryRun){ await Provider.create({ key, name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum }); }
      summary.providers.created++;
    } else if (existing.checksum !== checksum){
      if (!dryRun){ Object.assign(existing, { name: p.name, title: p.title, iconClass: p.iconClass, iconUrl: p.iconUrl, color: p.color, tags: p.tags || [], categories: p.categories || [], enabled: p.enabled !== false, hasCredentials: !!p.hasCredentials, allowWithoutCredentials: !!p.allowWithoutCredentials, credentialsForm: credForm, checksum }); await existing.save(); }
      summary.providers.updated++;
    } else { summary.providers.skipped++; }
  }

  for (const t of (m.nodeTemplates || [])){
    const key = t.key; if (!key) continue;
    const checksumArgs = checksumJSON(t.args || {});
    const checksumFeature = checksumJSON({ authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, output: t.output || [], allowWithoutCredentials: !!t.allowWithoutCredentials, output_array_field: t.output_array_field || null });
    const existing = await NodeTemplate.findOne({ key });
    const base = { key, name: t.name || key, title: t.title, subtitle: t.subtitle, icon: t.icon, description: t.description, tags: t.tags || [], group: t.group, type: t.type, category: t.category || '', providerKey: t.providerKey || t.provider || null, appName: t.appName || t.app || null, args: t.args || null, output: t.output || [], authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, allowWithoutCredentials: !!t.allowWithoutCredentials, output_array_field: t.output_array_field || null, checksumArgs, checksumFeature };
    if (!existing){
      if (!dryRun){ await NodeTemplate.create(base); }
      summary.nodeTemplates.created++;
    } else {
      const eq = existing.checksumArgs === checksumArgs && existing.checksumFeature === checksumFeature && existing.providerKey === base.providerKey && existing.appName === base.appName && existing.title === base.title && existing.subtitle === base.subtitle && existing.icon === base.icon && existing.description === base.description && (existing.tags || []).join(',') === (base.tags || []).join(',') && existing.group === base.group && JSON.stringify(existing.args || {}) === JSON.stringify(base.args || {});
      if (!eq){ if (!dryRun){ Object.assign(existing, base); await existing.save(); } summary.nodeTemplates.updated++; } else { summary.nodeTemplates.skipped++; }
    }
  }

  return summary;
}

module.exports = { importManifest };
