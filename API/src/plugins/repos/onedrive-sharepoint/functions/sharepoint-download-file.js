const { utils } = require('./utils');
module.exports = {
  async sharepoint_download_file(node, msg, inputs, opts) {
    const d = inputs || {};
    const siteId = String(d.siteId || '').trim();
    const driveId = String(d.driveId || '').trim();
    const itemId = String(d.itemId || '').trim();
    if (!siteId || !driveId || !itemId) return { ok: false, error: 'siteId, driveId et itemId requis.' };
    const meta = await utils.graphRequest(opts, `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`, { method: 'GET' });
    if (!meta.ok) return { ok: false, error: meta.error, status: meta.status, details: meta.details };
    const dlUrl = meta.data?.['@microsoft.graph.downloadUrl'];
    if (!dlUrl) return { ok: false, error: 'URL de téléchargement introuvable.' };
    let res;
    try { res = await fetch(dlUrl); } catch (e) { return { ok: false, error: e.message }; }
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, name: meta.data?.name || '', path: meta.data?.parentReference?.path || '', contentType: res.headers.get('content-type') || '', size: String(buf.length), file: buf.toString('base64') };
  }
};
