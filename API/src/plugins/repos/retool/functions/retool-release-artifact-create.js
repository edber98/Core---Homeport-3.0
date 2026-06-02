const { utils } = require('./utils');

module.exports = {
  async retool_release_artifact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/source_control/releases/{element_uuid}";
    const element_uuid = String(d.element_uuid || '').trim();
    if (!element_uuid) return { ok: false, error: 'element_uuid requis.' };
    reqPath = reqPath.replace('{element_uuid}', encodeURIComponent(element_uuid));

    const query = {};
    if (d.element_type !== undefined && d.element_type !== null && d.element_type !== '') query["element_type"] = d.element_type;

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
