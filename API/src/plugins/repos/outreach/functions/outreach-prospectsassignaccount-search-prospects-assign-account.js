const { utils } = require('./utils');

module.exports = {
  async outreach_prospectsassignaccount_search_prospects_assign_account(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/batches/actions/prospectsAssignAccount";
    

    const query = {};
    if (d.actionparams !== undefined && d.actionparams !== null && d.actionparams !== '') query["actionParams"] = d.actionparams;

    const headers = {};

    const body = {};
    if (d.data_attributes_accountid !== undefined && d.data_attributes_accountid !== null && d.data_attributes_accountid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["accountid"] = d.data_attributes_accountid;
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

