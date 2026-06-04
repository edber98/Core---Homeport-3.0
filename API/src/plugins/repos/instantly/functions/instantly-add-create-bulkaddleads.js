const { utils } = require('./utils');

module.exports = {
  async instantly_add_create_bulkaddleads(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/add";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.campaign_id !== undefined && d.campaign_id !== null && d.campaign_id !== '') {
      body["campaign_id"] = d.campaign_id;
    }
    if (d.list_id !== undefined && d.list_id !== null && d.list_id !== '') {
      body["list_id"] = d.list_id;
    }
    if (d.leads !== undefined && d.leads !== null && d.leads !== '') {
      body["leads"] = d.leads;
    }
    if (d.blocklist_id !== undefined && d.blocklist_id !== null && d.blocklist_id !== '') {
      body["blocklist_id"] = d.blocklist_id;
    }
    if (d.assigned_to !== undefined && d.assigned_to !== null && d.assigned_to !== '') {
      body["assigned_to"] = d.assigned_to;
    }
    if (d.verify_leads_on_import !== undefined && d.verify_leads_on_import !== null && d.verify_leads_on_import !== '') {
      body["verify_leads_on_import"] = d.verify_leads_on_import;
    }
    if (d.skip_if_in_workspace !== undefined && d.skip_if_in_workspace !== null && d.skip_if_in_workspace !== '') {
      body["skip_if_in_workspace"] = d.skip_if_in_workspace;
    }
    if (d.skip_if_in_campaign !== undefined && d.skip_if_in_campaign !== null && d.skip_if_in_campaign !== '') {
      body["skip_if_in_campaign"] = d.skip_if_in_campaign;
    }
    if (d.skip_if_in_list !== undefined && d.skip_if_in_list !== null && d.skip_if_in_list !== '') {
      body["skip_if_in_list"] = d.skip_if_in_list;
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

