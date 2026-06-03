const { utils } = require('./utils');

module.exports = {
  async revolut_business_foreign_exchange_get_rate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/rate";
    

    const query = {};
    if (d.from !== undefined && d.from !== null && d.from !== '') query["from"] = d.from;
    if (d.to !== undefined && d.to !== null && d.to !== '') query["to"] = d.to;
    if (d.amount !== undefined && d.amount !== null && d.amount !== '') query["amount"] = d.amount;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
