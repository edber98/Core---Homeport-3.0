const { utils } = require('./utils');

module.exports = {
  async instantly_subsequence_update_patchcampaignsubsequence(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/v2/subsequences/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.daily_limit_mode !== undefined && d.daily_limit_mode !== null && d.daily_limit_mode !== '') {
      body["daily_limit_mode"] = d.daily_limit_mode;
    }
    if (d.daily_limit !== undefined && d.daily_limit !== null && d.daily_limit !== '') {
      body["daily_limit"] = d.daily_limit;
    }
    if (d.ignore_account_daily_limit !== undefined && d.ignore_account_daily_limit !== null && d.ignore_account_daily_limit !== '') {
      body["ignore_account_daily_limit"] = d.ignore_account_daily_limit;
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

