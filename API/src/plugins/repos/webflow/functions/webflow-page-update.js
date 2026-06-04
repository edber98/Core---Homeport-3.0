const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "title",
    "type": "text",
    "bodyPath": [
      "title"
    ]
  },
  {
    "key": "slug",
    "type": "text",
    "bodyPath": [
      "slug"
    ]
  },
  {
    "key": "seo_title",
    "type": "text",
    "bodyPath": [
      "seo",
      "title"
    ]
  },
  {
    "key": "seo_description",
    "type": "text",
    "bodyPath": [
      "seo",
      "description"
    ]
  },
  {
    "key": "open_graph_title",
    "type": "text",
    "bodyPath": [
      "openGraph",
      "title"
    ]
  },
  {
    "key": "open_graph_title_copied",
    "type": "checkbox",
    "bodyPath": [
      "openGraph",
      "titleCopied"
    ]
  },
  {
    "key": "open_graph_description",
    "type": "text",
    "bodyPath": [
      "openGraph",
      "description"
    ]
  },
  {
    "key": "open_graph_description_copied",
    "type": "checkbox",
    "bodyPath": [
      "openGraph",
      "descriptionCopied"
    ]
  }
];


module.exports = {
  async webflow_page_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/pages/{page_id}";
    const page_id = String(d.page_id || '').trim();
    if (!page_id) return { ok: false, error: 'page_id requis.' };
    reqPath = reqPath.replace('{page_id}', encodeURIComponent(page_id));

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
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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
