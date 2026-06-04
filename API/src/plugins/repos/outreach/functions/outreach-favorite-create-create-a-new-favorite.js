const { utils } = require('./utils');

module.exports = {
  async outreach_favorite_create_create_a_new_favorite(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/favorites";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_targetid !== undefined && d.data_attributes_targetid !== null && d.data_attributes_targetid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["targetid"] = d.data_attributes_targetid;
    }
    if (d.data_attributes_targettype !== undefined && d.data_attributes_targettype !== null && d.data_attributes_targettype !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["targettype"] = d.data_attributes_targettype;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_relationships_creator_data_id !== undefined && d.data_relationships_creator_data_id !== null && d.data_relationships_creator_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["data"] || typeof body["data"]["relationships"]["creator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["data"])) body["data"]["relationships"]["creator"]["data"] = {};
      body["data"]["relationships"]["creator"]["data"]["id"] = d.data_relationships_creator_data_id;
    }
    if (d.data_relationships_creator_data_type !== undefined && d.data_relationships_creator_data_type !== null && d.data_relationships_creator_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["data"] || typeof body["data"]["relationships"]["creator"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["data"])) body["data"]["relationships"]["creator"]["data"] = {};
      body["data"]["relationships"]["creator"]["data"]["type"] = d.data_relationships_creator_data_type;
    }
    if (d.data_relationships_creator_links_related !== undefined && d.data_relationships_creator_links_related !== null && d.data_relationships_creator_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["creator"] || typeof body["data"]["relationships"]["creator"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"])) body["data"]["relationships"]["creator"] = {};
      if (!body["data"]["relationships"]["creator"]["links"] || typeof body["data"]["relationships"]["creator"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["creator"]["links"])) body["data"]["relationships"]["creator"]["links"] = {};
      body["data"]["relationships"]["creator"]["links"]["related"] = d.data_relationships_creator_links_related;
    }
    if (d.data_relationships_target_data_id !== undefined && d.data_relationships_target_data_id !== null && d.data_relationships_target_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["target"] || typeof body["data"]["relationships"]["target"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"])) body["data"]["relationships"]["target"] = {};
      if (!body["data"]["relationships"]["target"]["data"] || typeof body["data"]["relationships"]["target"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"]["data"])) body["data"]["relationships"]["target"]["data"] = {};
      body["data"]["relationships"]["target"]["data"]["id"] = d.data_relationships_target_data_id;
    }
    if (d.data_relationships_target_data_type !== undefined && d.data_relationships_target_data_type !== null && d.data_relationships_target_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["target"] || typeof body["data"]["relationships"]["target"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"])) body["data"]["relationships"]["target"] = {};
      if (!body["data"]["relationships"]["target"]["data"] || typeof body["data"]["relationships"]["target"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"]["data"])) body["data"]["relationships"]["target"]["data"] = {};
      body["data"]["relationships"]["target"]["data"]["type"] = d.data_relationships_target_data_type;
    }
    if (d.data_relationships_target_links_related !== undefined && d.data_relationships_target_links_related !== null && d.data_relationships_target_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["target"] || typeof body["data"]["relationships"]["target"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"])) body["data"]["relationships"]["target"] = {};
      if (!body["data"]["relationships"]["target"]["links"] || typeof body["data"]["relationships"]["target"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["target"]["links"])) body["data"]["relationships"]["target"]["links"] = {};
      body["data"]["relationships"]["target"]["links"]["related"] = d.data_relationships_target_links_related;
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

