const { utils } = require('./utils');

module.exports = {
  async retool_usage_report_user_details(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/usage/user_details";
    

    const query = {};
    if (d.start_date !== undefined && d.start_date !== null && d.start_date !== '') query["start_date"] = d.start_date;
    if (d.email !== undefined && d.email !== null && d.email !== '') query["email"] = d.email;
    if (d.end_date !== undefined && d.end_date !== null && d.end_date !== '') query["end_date"] = d.end_date;
    if (d.org_ids !== undefined && d.org_ids !== null && d.org_ids !== '') query["org_ids"] = d.org_ids;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.results) ? payload.results : Array.isArray(payload) ? payload : [];
    const items = rawItems.map((r) => ({
      ...(r && typeof r === 'object' ? r : { value: r }),
      id: r && (r.id || r.uuid || r.key || ''),
      name: r && (r.name || r.title || ''),
      url: r && (r.url || r.html_url || ''),
      status: r && (r.status || r.state || ''),
      created_at: r && (r.created_at || r.createdAt || ''),
      updated_at: r && (r.updated_at || r.updatedAt || ''),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
