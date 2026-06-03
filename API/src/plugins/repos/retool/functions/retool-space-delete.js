const { utils } = require('./utils');

module.exports = {
  async retool_space_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/spaces/{space_id}";
    const space_id = String(d.space_id || '').trim();
    if (!space_id) return { ok: false, error: 'space_id requis.' };
    reqPath = reqPath.replace('{space_id}', encodeURIComponent(space_id));

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
