const { utils } = require('./utils');

module.exports = {
  async activecampaign_note_update_note_updatenotebyid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/notes/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.note_note !== undefined && d.note_note !== null && d.note_note !== "") {
          if (!body["note"] || typeof body["note"] !== 'object' || Array.isArray(body["note"])) body["note"] = {};
          body["note"]["note"] = d.note_note;
        }
    if (d.note_reltype !== undefined && d.note_reltype !== null && d.note_reltype !== "") {
          if (!body["note"] || typeof body["note"] !== 'object' || Array.isArray(body["note"])) body["note"] = {};
          body["note"]["reltype"] = d.note_reltype;
        }
    if (d.note_relid !== undefined && d.note_relid !== null && d.note_relid !== "") {
          if (!body["note"] || typeof body["note"] !== 'object' || Array.isArray(body["note"])) body["note"] = {};
          body["note"]["relid"] = d.note_relid;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
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
