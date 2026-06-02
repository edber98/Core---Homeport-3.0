const { utils } = require('./utils');

module.exports = {
  async revolut_business_label_delete(node, msg, inputs, opts) {
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
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
