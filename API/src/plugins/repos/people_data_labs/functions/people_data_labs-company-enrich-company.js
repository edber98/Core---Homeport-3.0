const { utils } = require('./utils');

module.exports = {
  async people_data_labs_company_enrich_company(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v5/company/enrich";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.job_title !== undefined && d.job_title !== null && d.job_title !== '') {
      body["job_title"] = d.job_title;
    }
    if (d.titlecase !== undefined && d.titlecase !== null && d.titlecase !== '') {
      body["titlecase"] = d.titlecase;
    }
    if (d.pretty !== undefined && d.pretty !== null && d.pretty !== '') {
      body["pretty"] = d.pretty;
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

