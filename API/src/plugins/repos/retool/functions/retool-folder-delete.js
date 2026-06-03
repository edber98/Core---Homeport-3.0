const { utils } = require('./utils');

module.exports = {
  async retool_folder_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/folders/{folder_id}";
    const folder_id = String(d.folder_id || '').trim();
    if (!folder_id) return { ok: false, error: 'folder_id requis.' };
    reqPath = reqPath.replace('{folder_id}', encodeURIComponent(folder_id));

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
