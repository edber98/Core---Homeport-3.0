const { utils } = require("./utils");

module.exports = {
  async pipedrive_activities_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    log('Récupération de la liste...');
    const res = await utils.pdRequest(opts, "/activities", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const activities = results.map(r => ({ id: r.id, subject: r.subject, type: r.type, due_date: r.due_date, done: r.done, deal_id: r.deal_id, person_id: r.person_id, add_time: r.add_time }));
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, activities };
  }
};
