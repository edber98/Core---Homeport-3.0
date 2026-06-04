const { utils } = require('./utils');

module.exports = {
  async amplitude_api_ingestion_events_ingest(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/2/httpapi";
    

    let query = {};
    try { query = utils.parseJsonInput(d.query, 'query', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let headers = {};
    try { headers = utils.parseJsonInput(d.headers, 'headers', { defaultValue: {}, allowArray: false }) || {}; }
    catch (e) { return { ok: false, error: e.message }; }

    let events = [];
    try { events = utils.parseJsonInput(d.events, 'events', { defaultValue: [], allowArray: true, allowObject: false }) || []; }
    catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(events) || !events.length) return { ok: false, error: 'events requis et doit être un tableau JSON non vide.' };
    const body = { events };
    if (d.min_id_length !== undefined && d.min_id_length !== null && d.min_id_length !== '') {
      body.options = { min_id_length: Number(d.min_id_length) };
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
