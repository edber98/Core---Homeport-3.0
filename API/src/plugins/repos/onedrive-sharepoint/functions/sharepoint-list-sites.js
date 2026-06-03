const { utils } = require('./utils');
module.exports = {
  async sharepoint_list_sites(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.search ? { search: d.search } : {};
    const qs = Object.keys(query).length ? `?search=${encodeURIComponent(query.search)}` : '';
    const res = await utils.graphRequest(opts, `/sites${qs}`, { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data?.value) ? res.data.value.map(s => ({ name: s.displayName || '', path: s.webUrl || '', contentType: 'site', size: '', file: s.id || '' })) : [];
    return { ok: true, files: items, totalCount: items.length };
  }
};
