const { utils } = require('./utils');

module.exports = {
  async outreach_customobjectbulkmodify_search_custom_object_bulk_modify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/batches/actions/customObjectBulkModify";
    

    const query = {};
    if (d.actionparams !== undefined && d.actionparams !== null && d.actionparams !== '') query["actionParams"] = d.actionparams;

    const headers = {};

    const body = {};
    if (d.data_attributes_attribute1 !== undefined && d.data_attributes_attribute1 !== null && d.data_attributes_attribute1 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["attribute1"] = d.data_attributes_attribute1;
    }
    if (d.data_attributes_attribute2 !== undefined && d.data_attributes_attribute2 !== null && d.data_attributes_attribute2 !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["attribute2"] = d.data_attributes_attribute2;
    }
    if (d.data_attributes_attributen !== undefined && d.data_attributes_attributen !== null && d.data_attributes_attributen !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["attributen"] = d.data_attributes_attributen;
    }
    if (d.data_attributes_ids !== undefined && d.data_attributes_ids !== null && d.data_attributes_ids !== '') {
      body["data_attributes_ids"] = d.data_attributes_ids;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};

