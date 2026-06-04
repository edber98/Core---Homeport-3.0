const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "display_name",
    "type": "text",
    "bodyPath": [
      "displayName"
    ]
  },
  {
    "key": "alt_text",
    "type": "text",
    "bodyPath": [
      "altText"
    ]
  }
];


module.exports = {
  async webflow_asset_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/assets/{asset_id}";
    const asset_id = String(d.asset_id || '').trim();
    if (!asset_id) return { ok: false, error: 'asset_id requis.' };
    reqPath = reqPath.replace('{asset_id}', encodeURIComponent(asset_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.limit = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.offset = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.createdOn || r.created_at || r.createdAt || '',
      updated_at: r.lastUpdated || r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
