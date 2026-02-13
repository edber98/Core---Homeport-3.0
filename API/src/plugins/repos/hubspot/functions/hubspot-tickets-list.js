const { utils } = require("./utils");

module.exports = {
  async hubspot_tickets_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const query = { limit, properties: "subject,content,hs_pipeline,hs_pipeline_stage,hs_ticket_priority" };
    if (d.after) query.after = d.after;

    log('Récupération de la liste...');
    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/tickets", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const paging = res.data && res.data.paging;
    const hasMore = !!(paging && paging.next);
    const nextAfter = (paging && paging.next && paging.next.after) || null;
    const tickets = results.map(r => ({ id: r.id, ...r.properties, createdate: r.createdAt }));
    return { ok: true, tickets, hasMore, nextAfter };
  }
};
