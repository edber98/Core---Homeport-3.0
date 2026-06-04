const { utils } = require('./utils');

module.exports = {
  async instantly_account_move_moveaccounts(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/accounts/move";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.emails !== undefined && d.emails !== null && d.emails !== '') {
      body["emails"] = d.emails;
    }
    if (d.source_workspace_id !== undefined && d.source_workspace_id !== null && d.source_workspace_id !== '') {
      body["source_workspace_id"] = d.source_workspace_id;
    }
    if (d.destination_workspace_id !== undefined && d.destination_workspace_id !== null && d.destination_workspace_id !== '') {
      body["destination_workspace_id"] = d.destination_workspace_id;
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

