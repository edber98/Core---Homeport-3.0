const { utils } = require('./utils');

module.exports = {
  async hunter_lead_update_lead(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/leads/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    // Propager automatiquement les autres entrées en query params.
    const reserved = new Set(["pageSize","page","search","email","firstName","lastName","position","company","companyIndustry","companySize","confidenceScore","website","countryCode","linkedinUrl","phoneNumber","twitter","notes","source","leadsListId","customAttributes"]);
    for (const [k, v] of Object.entries(d)) {
      if (reserved.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      query[k] = v;
    }

    const body = utils.buildBodyFromInputs(d, [{"source":"email","target":"email","type":"text"},{"source":"firstName","target":"first_name","type":"text"},{"source":"lastName","target":"last_name","type":"text"},{"source":"position","target":"position","type":"text"},{"source":"company","target":"company","type":"text"},{"source":"companyIndustry","target":"company_industry","type":"text"},{"source":"companySize","target":"company_size","type":"text"},{"source":"confidenceScore","target":"confidence_score","type":"number"},{"source":"website","target":"website","type":"url"},{"source":"countryCode","target":"country_code","type":"text"},{"source":"linkedinUrl","target":"linkedin_url","type":"url"},{"source":"phoneNumber","target":"phone_number","type":"text"},{"source":"twitter","target":"twitter","type":"text"},{"source":"notes","target":"notes","type":"textarea"},{"source":"source","target":"source","type":"text"},{"source":"leadsListId","target":"leads_list_id","type":"number"},{"source":"customAttributes","target":"custom_attributes","type":"json"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
