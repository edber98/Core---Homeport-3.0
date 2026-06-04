const { utils } = require('./utils');

module.exports = {
  async instantly_update_interest_statu_create_updateleadintereststatus(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/update-interest-status";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.lead_email !== undefined && d.lead_email !== null && d.lead_email !== '') {
      body["lead_email"] = d.lead_email;
    }
    if (d.interest_value !== undefined && d.interest_value !== null && d.interest_value !== '') {
      body["interest_value"] = d.interest_value;
    }
    if (d.campaign_id !== undefined && d.campaign_id !== null && d.campaign_id !== '') {
      body["campaign_id"] = d.campaign_id;
    }
    if (d.ai_interest_value !== undefined && d.ai_interest_value !== null && d.ai_interest_value !== '') {
      body["ai_interest_value"] = d.ai_interest_value;
    }
    if (d.disable_auto_interest !== undefined && d.disable_auto_interest !== null && d.disable_auto_interest !== '') {
      body["disable_auto_interest"] = d.disable_auto_interest;
    }
    if (d.list_id !== undefined && d.list_id !== null && d.list_id !== '') {
      body["list_id"] = d.list_id;
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

