const { utils } = require('./utils');

module.exports = {
  async outreach_prospectsaddtosequence_create_prospects_add_to_sequence(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/batches/actions/prospectsAddToSequence";
    

    const query = {};
    if (d.actionparams !== undefined && d.actionparams !== null && d.actionparams !== '') query["actionParams"] = d.actionparams;

    const headers = {};

    const body = {};
    if (d.data_attributes_ids !== undefined && d.data_attributes_ids !== null && d.data_attributes_ids !== '') {
      body["data_attributes_ids"] = d.data_attributes_ids;
    }
    if (d.data_attributes_mailboxid !== undefined && d.data_attributes_mailboxid !== null && d.data_attributes_mailboxid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["mailboxid"] = d.data_attributes_mailboxid;
    }
    if (d.data_attributes_sequenceid !== undefined && d.data_attributes_sequenceid !== null && d.data_attributes_sequenceid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["sequenceid"] = d.data_attributes_sequenceid;
    }
    if (d.data_attributes_stepoverrides !== undefined && d.data_attributes_stepoverrides !== null && d.data_attributes_stepoverrides !== '') {
      body["data_attributes_stepoverrides"] = d.data_attributes_stepoverrides;
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

