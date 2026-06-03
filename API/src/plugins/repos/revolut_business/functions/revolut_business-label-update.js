const { utils } = require('./utils');

module.exports = {
  async revolut_business_label_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/label-groups/{groupId}/labels/{labelId}";
    const groupid = String(d.groupid || '').trim();
    if (!groupid) return { ok: false, error: 'groupid requis.' };
    reqPath = reqPath.replace('{groupid}', encodeURIComponent(groupid));
    const labelid = String(d.labelid || '').trim();
    if (!labelid) return { ok: false, error: 'labelid requis.' };
    reqPath = reqPath.replace('{labelid}', encodeURIComponent(labelid));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
