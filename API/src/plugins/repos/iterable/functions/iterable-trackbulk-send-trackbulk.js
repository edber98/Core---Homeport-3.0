const { utils } = require('./utils');

module.exports = {
  async iterable_trackbulk_send_trackbulk(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/events/trackBulk";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.events !== undefined && d.events !== null && d.events !== '') {
      body["events"] = d.events;
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

