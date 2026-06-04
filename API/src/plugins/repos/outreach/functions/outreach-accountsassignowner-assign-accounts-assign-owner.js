const { utils } = require('./utils');

module.exports = {
  async outreach_accountsassignowner_assign_accounts_assign_owner(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/batches/actions/accountsAssignOwner";
    

    const query = {};
    if (d.actionparams !== undefined && d.actionparams !== null && d.actionparams !== '') query["actionParams"] = d.actionparams;

    const headers = {};

    const body = {};
    if (d.data_attributes_ids !== undefined && d.data_attributes_ids !== null && d.data_attributes_ids !== '') {
      body["data_attributes_ids"] = d.data_attributes_ids;
    }
    if (d.data_attributes_ownerid !== undefined && d.data_attributes_ownerid !== null && d.data_attributes_ownerid !== '') {
      if (!body["data"] || typeof body["data"] !== 'object' || Array.isArray(body["data"])) body["data"] = {};
      if (!body["data"]["attributes"] || typeof body["data"]["attributes"] !== 'object' || Array.isArray(body["data"]["attributes"])) body["data"]["attributes"] = {};
      body["data"]["attributes"]["ownerid"] = d.data_attributes_ownerid;
    }
    if (d.type !== undefined && d.type !== null && d.type !== '') {
      body["type"] = d.type;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

