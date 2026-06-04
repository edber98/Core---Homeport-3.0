const { utils } = require('./utils');

module.exports = {
  async fal_ai_queue_submit_request(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://queue.fal.run/{model_id}";
    const model_id = String(d.model_id || '').trim();
    if (!model_id) return { ok: false, error: 'model_id requis.' };
    reqPath = reqPath.replace('{model_id}', encodeURIComponent(model_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    if (d.falWebhook !== undefined && d.falWebhook !== null && d.falWebhook !== '') query.fal_webhook = d.falWebhook;

    let body = undefined;
    if (d.modelInput !== undefined && d.modelInput !== null && d.modelInput !== '') {
      if (typeof d.modelInput === 'object') body = d.modelInput;
      else {
        try { body = JSON.parse(String(d.modelInput)); } catch { return { ok: false, error: 'JSON invalide dans modelInput.' }; }
      }
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
