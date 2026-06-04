const { utils } = require('./utils');

module.exports = {
  async outreach_team_update_update_a_team(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teams/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_color !== undefined && d.data_attributes_color !== null && d.data_attributes_color !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["color"] = d.data_attributes_color;
    }
    if (d.data_attributes_createdat !== undefined && d.data_attributes_createdat !== null && d.data_attributes_createdat !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["createdat"] = d.data_attributes_createdat;
    }
    if (d.data_attributes_name !== undefined && d.data_attributes_name !== null && d.data_attributes_name !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["name"] = d.data_attributes_name;
    }
    if (d.data_attributes_scimexternalid !== undefined && d.data_attributes_scimexternalid !== null && d.data_attributes_scimexternalid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scimexternalid"] = d.data_attributes_scimexternalid;
    }
    if (d.data_attributes_scimsource !== undefined && d.data_attributes_scimsource !== null && d.data_attributes_scimsource !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["scimsource"] = d.data_attributes_scimsource;
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
    if (d.data_relationships_batches_links_related !== undefined && d.data_relationships_batches_links_related !== null && d.data_relationships_batches_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["batches"] || typeof body["data"]["relationships"]["batches"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"])) body["data"]["relationships"]["batches"] = {};
      if (!body["data"]["relationships"]["batches"]["links"] || typeof body["data"]["relationships"]["batches"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["batches"]["links"])) body["data"]["relationships"]["batches"]["links"] = {};
      body["data"]["relationships"]["batches"]["links"]["related"] = d.data_relationships_batches_links_related;
    }
    if (d.data_relationships_contentcategories_data !== undefined && d.data_relationships_contentcategories_data !== null && d.data_relationships_contentcategories_data !== '') {
      body["data_relationships_contentcategories_data"] = d.data_relationships_contentcategories_data;
    }
    if (d.data_relationships_contentcategories_links_related !== undefined && d.data_relationships_contentcategories_links_related !== null && d.data_relationships_contentcategories_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["contentcategories"] || typeof body["data"]["relationships"]["contentcategories"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategories"])) body["data"]["relationships"]["contentcategories"] = {};
      if (!body["data"]["relationships"]["contentcategories"]["links"] || typeof body["data"]["relationships"]["contentcategories"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["contentcategories"]["links"])) body["data"]["relationships"]["contentcategories"]["links"] = {};
      body["data"]["relationships"]["contentcategories"]["links"]["related"] = d.data_relationships_contentcategories_links_related;
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
    if (d.data_relationships_favorites_data !== undefined && d.data_relationships_favorites_data !== null && d.data_relationships_favorites_data !== '') {
      body["data_relationships_favorites_data"] = d.data_relationships_favorites_data;
    }
    if (d.data_relationships_favorites_links_related !== undefined && d.data_relationships_favorites_links_related !== null && d.data_relationships_favorites_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["favorites"] || typeof body["data"]["relationships"]["favorites"] !== 'object' || Array.isArray(body["data"]["relationships"]["favorites"])) body["data"]["relationships"]["favorites"] = {};
      if (!body["data"]["relationships"]["favorites"]["links"] || typeof body["data"]["relationships"]["favorites"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["favorites"]["links"])) body["data"]["relationships"]["favorites"]["links"] = {};
      body["data"]["relationships"]["favorites"]["links"]["related"] = d.data_relationships_favorites_links_related;
    }
    if (d.data_relationships_roleassignedusers_data !== undefined && d.data_relationships_roleassignedusers_data !== null && d.data_relationships_roleassignedusers_data !== '') {
      body["data_relationships_roleassignedusers_data"] = d.data_relationships_roleassignedusers_data;
    }
    if (d.data_relationships_roleassignedusers_links_related !== undefined && d.data_relationships_roleassignedusers_links_related !== null && d.data_relationships_roleassignedusers_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["roleassignedusers"] || typeof body["data"]["relationships"]["roleassignedusers"] !== 'object' || Array.isArray(body["data"]["relationships"]["roleassignedusers"])) body["data"]["relationships"]["roleassignedusers"] = {};
      if (!body["data"]["relationships"]["roleassignedusers"]["links"] || typeof body["data"]["relationships"]["roleassignedusers"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["roleassignedusers"]["links"])) body["data"]["relationships"]["roleassignedusers"]["links"] = {};
      body["data"]["relationships"]["roleassignedusers"]["links"]["related"] = d.data_relationships_roleassignedusers_links_related;
    }
    if (d.data_relationships_teammemberships_data !== undefined && d.data_relationships_teammemberships_data !== null && d.data_relationships_teammemberships_data !== '') {
      body["data_relationships_teammemberships_data"] = d.data_relationships_teammemberships_data;
    }
    if (d.data_relationships_teammemberships_links_related !== undefined && d.data_relationships_teammemberships_links_related !== null && d.data_relationships_teammemberships_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teammemberships"] || typeof body["data"]["relationships"]["teammemberships"] !== 'object' || Array.isArray(body["data"]["relationships"]["teammemberships"])) body["data"]["relationships"]["teammemberships"] = {};
      if (!body["data"]["relationships"]["teammemberships"]["links"] || typeof body["data"]["relationships"]["teammemberships"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["teammemberships"]["links"])) body["data"]["relationships"]["teammemberships"]["links"] = {};
      body["data"]["relationships"]["teammemberships"]["links"]["related"] = d.data_relationships_teammemberships_links_related;
    }
    if (d.data_relationships_teamrecords_data !== undefined && d.data_relationships_teamrecords_data !== null && d.data_relationships_teamrecords_data !== '') {
      body["data_relationships_teamrecords_data"] = d.data_relationships_teamrecords_data;
    }
    if (d.data_relationships_teamrecords_links_related !== undefined && d.data_relationships_teamrecords_links_related !== null && d.data_relationships_teamrecords_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teamrecords"] || typeof body["data"]["relationships"]["teamrecords"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamrecords"])) body["data"]["relationships"]["teamrecords"] = {};
      if (!body["data"]["relationships"]["teamrecords"]["links"] || typeof body["data"]["relationships"]["teamrecords"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamrecords"]["links"])) body["data"]["relationships"]["teamrecords"]["links"] = {};
      body["data"]["relationships"]["teamrecords"]["links"]["related"] = d.data_relationships_teamrecords_links_related;
    }
    if (d.data_relationships_teamsettings_data_id !== undefined && d.data_relationships_teamsettings_data_id !== null && d.data_relationships_teamsettings_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teamsettings"] || typeof body["data"]["relationships"]["teamsettings"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"])) body["data"]["relationships"]["teamsettings"] = {};
      if (!body["data"]["relationships"]["teamsettings"]["data"] || typeof body["data"]["relationships"]["teamsettings"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"]["data"])) body["data"]["relationships"]["teamsettings"]["data"] = {};
      body["data"]["relationships"]["teamsettings"]["data"]["id"] = d.data_relationships_teamsettings_data_id;
    }
    if (d.data_relationships_teamsettings_data_type !== undefined && d.data_relationships_teamsettings_data_type !== null && d.data_relationships_teamsettings_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teamsettings"] || typeof body["data"]["relationships"]["teamsettings"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"])) body["data"]["relationships"]["teamsettings"] = {};
      if (!body["data"]["relationships"]["teamsettings"]["data"] || typeof body["data"]["relationships"]["teamsettings"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"]["data"])) body["data"]["relationships"]["teamsettings"]["data"] = {};
      body["data"]["relationships"]["teamsettings"]["data"]["type"] = d.data_relationships_teamsettings_data_type;
    }
    if (d.data_relationships_teamsettings_links_related !== undefined && d.data_relationships_teamsettings_links_related !== null && d.data_relationships_teamsettings_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["teamsettings"] || typeof body["data"]["relationships"]["teamsettings"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"])) body["data"]["relationships"]["teamsettings"] = {};
      if (!body["data"]["relationships"]["teamsettings"]["links"] || typeof body["data"]["relationships"]["teamsettings"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["teamsettings"]["links"])) body["data"]["relationships"]["teamsettings"]["links"] = {};
      body["data"]["relationships"]["teamsettings"]["links"]["related"] = d.data_relationships_teamsettings_links_related;
    }
    if (d.data_relationships_updater_data_id !== undefined && d.data_relationships_updater_data_id !== null && d.data_relationships_updater_data_id !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["data"] || typeof body["data"]["relationships"]["updater"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["data"])) body["data"]["relationships"]["updater"]["data"] = {};
      body["data"]["relationships"]["updater"]["data"]["id"] = d.data_relationships_updater_data_id;
    }
    if (d.data_relationships_updater_data_type !== undefined && d.data_relationships_updater_data_type !== null && d.data_relationships_updater_data_type !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["data"] || typeof body["data"]["relationships"]["updater"]["data"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["data"])) body["data"]["relationships"]["updater"]["data"] = {};
      body["data"]["relationships"]["updater"]["data"]["type"] = d.data_relationships_updater_data_type;
    }
    if (d.data_relationships_updater_links_related !== undefined && d.data_relationships_updater_links_related !== null && d.data_relationships_updater_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["updater"] || typeof body["data"]["relationships"]["updater"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"])) body["data"]["relationships"]["updater"] = {};
      if (!body["data"]["relationships"]["updater"]["links"] || typeof body["data"]["relationships"]["updater"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["updater"]["links"])) body["data"]["relationships"]["updater"]["links"] = {};
      body["data"]["relationships"]["updater"]["links"]["related"] = d.data_relationships_updater_links_related;
    }
    if (d.data_relationships_users_data !== undefined && d.data_relationships_users_data !== null && d.data_relationships_users_data !== '') {
      body["data_relationships_users_data"] = d.data_relationships_users_data;
    }
    if (d.data_relationships_users_links_related !== undefined && d.data_relationships_users_links_related !== null && d.data_relationships_users_links_related !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["relationships"] || typeof body["data"]["relationships"] !== 'object' || Array.isArray(body["data"]["relationships"])) body["data"]["relationships"] = {};
      if (!body["data"]["relationships"]["users"] || typeof body["data"]["relationships"]["users"] !== 'object' || Array.isArray(body["data"]["relationships"]["users"])) body["data"]["relationships"]["users"] = {};
      if (!body["data"]["relationships"]["users"]["links"] || typeof body["data"]["relationships"]["users"]["links"] !== 'object' || Array.isArray(body["data"]["relationships"]["users"]["links"])) body["data"]["relationships"]["users"]["links"] = {};
      body["data"]["relationships"]["users"]["links"]["related"] = d.data_relationships_users_links_related;
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

