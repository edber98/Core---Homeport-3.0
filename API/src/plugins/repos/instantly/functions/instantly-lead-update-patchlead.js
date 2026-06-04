const { utils } = require('./utils');

module.exports = {
  async instantly_lead_update_patchlead(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/leads/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.personalization !== undefined && d.personalization !== null && d.personalization !== '') {
      body["personalization"] = d.personalization;
    }
    if (d.website !== undefined && d.website !== null && d.website !== '') {
      body["website"] = d.website;
    }
    if (d.last_name !== undefined && d.last_name !== null && d.last_name !== '') {
      body["last_name"] = d.last_name;
    }
    if (d.first_name !== undefined && d.first_name !== null && d.first_name !== '') {
      body["first_name"] = d.first_name;
    }
    if (d.company_name !== undefined && d.company_name !== null && d.company_name !== '') {
      body["company_name"] = d.company_name;
    }
    if (d.job_title !== undefined && d.job_title !== null && d.job_title !== '') {
      body["job_title"] = d.job_title;
    }
    if (d.phone !== undefined && d.phone !== null && d.phone !== '') {
      body["phone"] = d.phone;
    }
    if (d.lt_interest_status !== undefined && d.lt_interest_status !== null && d.lt_interest_status !== '') {
      body["lt_interest_status"] = d.lt_interest_status;
    }
    if (d.pl_value_lead !== undefined && d.pl_value_lead !== null && d.pl_value_lead !== '') {
      body["pl_value_lead"] = d.pl_value_lead;
    }
    if (d.assigned_to !== undefined && d.assigned_to !== null && d.assigned_to !== '') {
      body["assigned_to"] = d.assigned_to;
    }
    if (d.custom_variables !== undefined && d.custom_variables !== null && d.custom_variables !== '') {
      body["custom_variables"] = d.custom_variables;
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

