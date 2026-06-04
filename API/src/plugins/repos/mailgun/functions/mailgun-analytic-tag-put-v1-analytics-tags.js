const { utils } = require('./utils');

module.exports = {
  async mailgun_analytic_tag_put_v1_analytics_tags(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/analytics/tags";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.tag !== undefined && d.tag !== null && d.tag !== '') {
      body["tag"] = d.tag;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

