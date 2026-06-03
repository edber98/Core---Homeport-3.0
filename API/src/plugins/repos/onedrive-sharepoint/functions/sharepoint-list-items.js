const { utils } = require('./utils');
module.exports = {
  async sharepoint_list_items(node, msg, inputs, opts) {
    const d = inputs || {};
    const siteId = String(d.siteId || '').trim();
    const driveId = String(d.driveId || '').trim();
    const folderPath = String(d.folderPath || '').trim();
    if (!siteId || !driveId) return { ok: false, error: 'siteId et driveId requis.' };
    const endpoint = folderPath
      ? `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(folderPath)}:/children`
      : `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root/children`;
    const res = await utils.graphRequest(opts, endpoint, { method: 'GET' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data?.value) ? res.data.value.map(i => ({ name: i.name || '', path: i.parentReference?.path || '', contentType: i.file?.mimeType || (i.folder ? 'folder' : ''), size: String(i.size || 0), file: i.id || '' })) : [];
    return { ok: true, files: items, totalCount: items.length };
  }
};
