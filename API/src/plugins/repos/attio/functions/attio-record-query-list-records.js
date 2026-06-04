const { utils } = require('./utils');

module.exports = {
  async attio_record_query_list_records(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/objects/{object}/records/query";
    const object = String(d.object || '').trim();
    if (!object) return { ok: false, error: 'object requis.' };
    reqPath = reqPath.replace('{object}', encodeURIComponent(object));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.filter !== undefined && d.filter !== null && d.filter !== '') {
      try { payload.filter = utils.parseJsonInput(d.filter, 'filter', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.filter_view_id !== undefined && d.filter_view_id !== null && d.filter_view_id !== '') payload.filter_view_id = d.filter_view_id;
    if (d.sorts !== undefined && d.sorts !== null && d.sorts !== '') {
      try { payload.sorts = utils.parseJsonInput(d.sorts, 'sorts', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.limit !== undefined && d.limit !== null && d.limit !== '') {
      const parsed = Number(d.limit);
      if (Number.isNaN(parsed)) return { ok: false, error: 'limit invalide.' };
      payload.limit = parsed;
    }
    if (d.offset !== undefined && d.offset !== null && d.offset !== '') {
      const parsed = Number(d.offset);
      if (Number.isNaN(parsed)) return { ok: false, error: 'offset invalide.' };
      payload.offset = parsed;
    }
    if (!Object.keys(payload).length) return { ok: false, error: 'Aucun champ à envoyer.' };
    const body = payload;

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
