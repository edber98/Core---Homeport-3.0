const { utils } = require('./utils');

module.exports = {
  async instantly_subsequence_move_moveleadtosubsequence(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/subsequence/move";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.subsequence_id !== undefined && d.subsequence_id !== null && d.subsequence_id !== '') {
      body["subsequence_id"] = d.subsequence_id;
    }
    if (d.id !== undefined && d.id !== null && d.id !== '') {
      body["id"] = d.id;
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

