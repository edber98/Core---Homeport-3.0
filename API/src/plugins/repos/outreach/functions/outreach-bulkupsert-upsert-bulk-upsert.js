const { utils } = require('./utils');

module.exports = {
  async outreach_bulkupsert_upsert_bulk_upsert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/imports/actions/bulkUpsert";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.data_attributes_dupemethod !== undefined && d.data_attributes_dupemethod !== null && d.data_attributes_dupemethod !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["dupemethod"] = d.data_attributes_dupemethod;
    }
    if (d.data_attributes_filename !== undefined && d.data_attributes_filename !== null && d.data_attributes_filename !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["filename"] = d.data_attributes_filename;
    }
    if (d.data_attributes_records !== undefined && d.data_attributes_records !== null && d.data_attributes_records !== '') {
      body["data_attributes_records"] = d.data_attributes_records;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
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

