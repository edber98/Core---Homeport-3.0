const { utils } = require('./utils');

module.exports = {
  async outreach_persona_create_create_a_new_persona(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/personas";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_description !== undefined && d.data_attributes_description !== null && d.data_attributes_description !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["description"] = d.data_attributes_description;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_relationships_prospects_links_related !== undefined && d.data_relationships_prospects_links_related !== null && d.data_relationships_prospects_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospects"] || typeof body["data"]["relationships"]["prospects"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospects"])) body["data"]["relationships"]["prospects"] = {};
      if (!body["data"]["relationships"]["prospects"]["links"] || typeof body["data"]["relationships"]["prospects"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospects"]["links"])) body["data"]["relationships"]["prospects"]["links"] = {};
      body["data"]["relationships"]["prospects"]["links"]["related"] = d.data_relationships_prospects_links_related;
    }
    if (d.data_type !== undefined && d.data_type !== null && d.data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["type"] = d.data_type;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
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

