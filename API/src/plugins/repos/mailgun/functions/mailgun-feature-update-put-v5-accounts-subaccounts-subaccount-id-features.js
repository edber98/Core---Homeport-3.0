const { utils } = require('./utils');

module.exports = {
  async mailgun_feature_update_put_v5_accounts_subaccounts_subaccount_id_features(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v5/accounts/subaccounts/{subaccount_id}/features";
    const subaccount_id = String(d.subaccount_id || '').trim();
    if (!subaccount_id) return { ok: false, error: 'subaccount_id requis.' };
    reqPath = reqPath.replace('{subaccount_id}', encodeURIComponent(subaccount_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.email_preview !== undefined && d.email_preview !== null && d.email_preview !== '') {
      body["email_preview"] = d.email_preview;
    }
    if (d.inbox_placement !== undefined && d.inbox_placement !== null && d.inbox_placement !== '') {
      body["inbox_placement"] = d.inbox_placement;
    }
    if (d.sending !== undefined && d.sending !== null && d.sending !== '') {
      body["sending"] = d.sending;
    }
    if (d.validations !== undefined && d.validations !== null && d.validations !== '') {
      body["validations"] = d.validations;
    }
    if (d.validations_bulk !== undefined && d.validations_bulk !== null && d.validations_bulk !== '') {
      body["validations_bulk"] = d.validations_bulk;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
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

