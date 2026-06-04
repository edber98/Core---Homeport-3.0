const { utils } = require('./utils');

module.exports = {
  async attio_comment_comment_create_a_comment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/comments";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    let hasPayload = false;
    if (d.format !== undefined && d.format !== null && d.format !== '') payload.format = d.format;
    if (d.content !== undefined && d.content !== null && d.content !== '') payload.content = d.content;
    if (d.author !== undefined && d.author !== null && d.author !== '') {
      try { payload.author = utils.parseJsonInput(d.author, 'author', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.created_at !== undefined && d.created_at !== null && d.created_at !== '') payload.created_at = d.created_at;
    if (d.thread_id !== undefined && d.thread_id !== null && d.thread_id !== '') payload.thread_id = d.thread_id;
    if (d.record !== undefined && d.record !== null && d.record !== '') {
      try { payload.record = utils.parseJsonInput(d.record, 'record', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.entry !== undefined && d.entry !== null && d.entry !== '') {
      try { payload.entry = utils.parseJsonInput(d.entry, 'entry', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.format === undefined) return { ok: false, error: 'format requis.' };
    if (payload.content === undefined) return { ok: false, error: 'content requis.' };
    if (payload.author === undefined) return { ok: false, error: 'author requis.' };
    if (!payload.thread_id && payload.record === undefined && payload.entry === undefined) return { ok: false, error: 'thread_id, record ou entry requis.' };
    const body = { data: payload };

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
