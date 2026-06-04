const { utils } = require('./utils');

module.exports = {
  async outreach_recipient_update_update_a_recipient(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/recipients/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_emailhash !== undefined && d.data_attributes_emailhash !== null && d.data_attributes_emailhash !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["emailhash"] = d.data_attributes_emailhash;
    }
    if (d.data_attributes_primary !== undefined && d.data_attributes_primary !== null && d.data_attributes_primary !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["primary"] = d.data_attributes_primary;
    }
    if (d.data_attributes_recipienttype !== undefined && d.data_attributes_recipienttype !== null && d.data_attributes_recipienttype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["recipienttype"] = d.data_attributes_recipienttype;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_attributes_value !== undefined && d.data_attributes_value !== null && d.data_attributes_value !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["value"] = d.data_attributes_value;
    }
    if (d.data_id !== undefined && d.data_id !== null && d.data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["id"] = d.data_id;
    }
    if (d.data_relationships_prospect_data_id !== undefined && d.data_relationships_prospect_data_id !== null && d.data_relationships_prospect_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["data"] || typeof body["data"]["relationships"]["prospect"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["data"])) body["data"]["relationships"]["prospect"]["data"] = {};
      body["data"]["relationships"]["prospect"]["data"]["id"] = d.data_relationships_prospect_data_id;
    }
    if (d.data_relationships_prospect_data_type !== undefined && d.data_relationships_prospect_data_type !== null && d.data_relationships_prospect_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["data"] || typeof body["data"]["relationships"]["prospect"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["data"])) body["data"]["relationships"]["prospect"]["data"] = {};
      body["data"]["relationships"]["prospect"]["data"]["type"] = d.data_relationships_prospect_data_type;
    }
    if (d.data_relationships_prospect_links_related !== undefined && d.data_relationships_prospect_links_related !== null && d.data_relationships_prospect_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["prospect"] || typeof body["data"]["relationships"]["prospect"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"])) body["data"]["relationships"]["prospect"] = {};
      if (!body["data"]["relationships"]["prospect"]["links"] || typeof body["data"]["relationships"]["prospect"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["prospect"]["links"])) body["data"]["relationships"]["prospect"]["links"] = {};
      body["data"]["relationships"]["prospect"]["links"]["related"] = d.data_relationships_prospect_links_related;
    }
    if (d.data_relationships_user_data_id !== undefined && d.data_relationships_user_data_id !== null && d.data_relationships_user_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["data"] || typeof body["data"]["relationships"]["user"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["data"])) body["data"]["relationships"]["user"]["data"] = {};
      body["data"]["relationships"]["user"]["data"]["id"] = d.data_relationships_user_data_id;
    }
    if (d.data_relationships_user_data_type !== undefined && d.data_relationships_user_data_type !== null && d.data_relationships_user_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["data"] || typeof body["data"]["relationships"]["user"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["data"])) body["data"]["relationships"]["user"]["data"] = {};
      body["data"]["relationships"]["user"]["data"]["type"] = d.data_relationships_user_data_type;
    }
    if (d.data_relationships_user_links_related !== undefined && d.data_relationships_user_links_related !== null && d.data_relationships_user_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["user"] || typeof body["data"]["relationships"]["user"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"])) body["data"]["relationships"]["user"] = {};
      if (!body["data"]["relationships"]["user"]["links"] || typeof body["data"]["relationships"]["user"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["user"]["links"])) body["data"]["relationships"]["user"]["links"] = {};
      body["data"]["relationships"]["user"]["links"]["related"] = d.data_relationships_user_links_related;
    }
    if (d.data_type !== undefined && d.data_type !== null && d.data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      body["data"]["type"] = d.data_type;
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
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

