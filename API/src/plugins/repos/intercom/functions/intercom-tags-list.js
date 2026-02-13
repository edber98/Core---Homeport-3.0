const { utils } = require("./utils");

module.exports = {
  async intercom_tags_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.intercomRequest(opts, "/tags");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const tags = items.map(r => ({ id: r.id, name: r.name }));
    return { ok: true, tags, totalCount: res.data?.total_count || tags.length, hasMore: !!res.data?.pages?.next };
  }
};
