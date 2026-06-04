const { utils } = require('./utils');

module.exports = {
  async outreach_phonenumber_update_update_a_phone_number(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/phoneNumbers/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_countrycode !== undefined && d.data_attributes_countrycode !== null && d.data_attributes_countrycode !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["countrycode"] = d.data_attributes_countrycode;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_extension !== undefined && d.data_attributes_extension !== null && d.data_attributes_extension !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["extension"] = d.data_attributes_extension;
    }
    if (d.data_attributes_number !== undefined && d.data_attributes_number !== null && d.data_attributes_number !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["number"] = d.data_attributes_number;
    }
    if (d.data_attributes_order !== undefined && d.data_attributes_order !== null && d.data_attributes_order !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["order"] = d.data_attributes_order;
    }
    if (d.data_attributes_phonetype !== undefined && d.data_attributes_phonetype !== null && d.data_attributes_phonetype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["phonetype"] = d.data_attributes_phonetype;
    }
    if (d.data_attributes_rawnumber !== undefined && d.data_attributes_rawnumber !== null && d.data_attributes_rawnumber !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["rawnumber"] = d.data_attributes_rawnumber;
    }
    if (d.data_attributes_status !== undefined && d.data_attributes_status !== null && d.data_attributes_status !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["status"] = d.data_attributes_status;
    }
    if (d.data_attributes_statuschangedat !== undefined && d.data_attributes_statuschangedat !== null && d.data_attributes_statuschangedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["statuschangedat"] = d.data_attributes_statuschangedat;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
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

