const { utils } = require('./utils');

module.exports = {
  async retool_workflow_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/workflows/{workflow_id}";
    const workflow_id = String(d.workflow_id || '').trim();
    if (!workflow_id) return { ok: false, error: 'workflow_id requis.' };
    reqPath = reqPath.replace('{workflow_id}', encodeURIComponent(workflow_id));

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
