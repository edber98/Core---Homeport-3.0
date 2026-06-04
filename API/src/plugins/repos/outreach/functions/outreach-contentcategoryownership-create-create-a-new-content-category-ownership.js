const { utils } = require('./utils');

module.exports = {
  async outreach_contentcategoryownership_create_create_a_new_content_category_ownership(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contentCategoryOwnerships";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_updatedat !== undefined && d.data_attributes_updatedat !== null && d.data_attributes_updatedat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["updatedat"] = d.data_attributes_updatedat;
    }
    if (d.data_relationships_contentcategory_data_id !== undefined && d.data_relationships_contentcategory_data_id !== null && d.data_relationships_contentcategory_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategory"] || typeof body["data"]["relationships"]["contentcategory"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"])) body["data"]["relationships"]["contentcategory"] = {};
      if (!body["data"]["relationships"]["contentcategory"]["data"] || typeof body["data"]["relationships"]["contentcategory"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"]["data"])) body["data"]["relationships"]["contentcategory"]["data"] = {};
      body["data"]["relationships"]["contentcategory"]["data"]["id"] = d.data_relationships_contentcategory_data_id;
    }
    if (d.data_relationships_contentcategory_data_type !== undefined && d.data_relationships_contentcategory_data_type !== null && d.data_relationships_contentcategory_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategory"] || typeof body["data"]["relationships"]["contentcategory"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"])) body["data"]["relationships"]["contentcategory"] = {};
      if (!body["data"]["relationships"]["contentcategory"]["data"] || typeof body["data"]["relationships"]["contentcategory"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"]["data"])) body["data"]["relationships"]["contentcategory"]["data"] = {};
      body["data"]["relationships"]["contentcategory"]["data"]["type"] = d.data_relationships_contentcategory_data_type;
    }
    if (d.data_relationships_contentcategory_links_related !== undefined && d.data_relationships_contentcategory_links_related !== null && d.data_relationships_contentcategory_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategory"] || typeof body["data"]["relationships"]["contentcategory"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"])) body["data"]["relationships"]["contentcategory"] = {};
      if (!body["data"]["relationships"]["contentcategory"]["links"] || typeof body["data"]["relationships"]["contentcategory"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategory"]["links"])) body["data"]["relationships"]["contentcategory"]["links"] = {};
      body["data"]["relationships"]["contentcategory"]["links"]["related"] = d.data_relationships_contentcategory_links_related;
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
    if (d.data_relationships_owner_data_id !== undefined && d.data_relationships_owner_data_id !== null && d.data_relationships_owner_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["data"] || typeof body["data"]["relationships"]["owner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["data"])) body["data"]["relationships"]["owner"]["data"] = {};
      body["data"]["relationships"]["owner"]["data"]["id"] = d.data_relationships_owner_data_id;
    }
    if (d.data_relationships_owner_data_type !== undefined && d.data_relationships_owner_data_type !== null && d.data_relationships_owner_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["data"] || typeof body["data"]["relationships"]["owner"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["data"])) body["data"]["relationships"]["owner"]["data"] = {};
      body["data"]["relationships"]["owner"]["data"]["type"] = d.data_relationships_owner_data_type;
    }
    if (d.data_relationships_owner_links_related !== undefined && d.data_relationships_owner_links_related !== null && d.data_relationships_owner_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["owner"] || typeof body["data"]["relationships"]["owner"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"])) body["data"]["relationships"]["owner"] = {};
      if (!body["data"]["relationships"]["owner"]["links"] || typeof body["data"]["relationships"]["owner"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["owner"]["links"])) body["data"]["relationships"]["owner"]["links"] = {};
      body["data"]["relationships"]["owner"]["links"]["related"] = d.data_relationships_owner_links_related;
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

