const { utils } = require('./utils');
module.exports = {
  async sharepoint_list_drives(node, msg, inputs, opts) {
    const d = inputs || {};
    const siteId = String(d.siteId || '').trim();
    if (!siteId) return { ok: false, error: 'siteId requis.' };
    const res = await utils.graphRequest(opts, `/sites/${encodeURIComponent(siteId)}/drives`, { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data?.value) ? res.data.value.map(s => ({ name: s.name || '', path: s.webUrl || '', contentType: 'drive', size: '', file: s.id || '' })) : [];
    return { ok: true, files: items, totalCount: items.length };
  }
};
