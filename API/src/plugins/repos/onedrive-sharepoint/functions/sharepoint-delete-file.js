const { utils } = require('./utils');
module.exports = {
  async sharepoint_delete_file(node, msg, inputs, opts) {
    const d = inputs || {};
    const siteId = String(d.siteId || '').trim();
    const driveId = String(d.driveId || '').trim();
    const itemId = String(d.itemId || '').trim();
    if (!siteId || !driveId || !itemId) return { ok: false, error: 'siteId, driveId et itemId requis.' };
    const res = await utils.graphRequest(opts, `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, name: '', path: '', contentType: '', size: '0', file: itemId };
  }
};
