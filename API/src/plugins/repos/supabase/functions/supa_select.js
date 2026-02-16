const { utils } = require("./utils");

module.exports = {
  async supa_select(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };

    const params = new URLSearchParams();
    params.set("select", d.select || "*");
    if (d.order) params.set("order", d.order);
    if (d.limit) params.set("limit", String(d.limit));
    if (d.offset) params.set("offset", String(d.offset));

    let path = `/rest/v1/${encodeURIComponent(d.table)}?${params}`;
    if (d.filter) path += `&${d.filter}`;

    log('Appel API en cours...');
    const res = await utils.supaRequest(opts, path);
    if (!res.ok) return res;
    const records = (Array.isArray(res.data) ? res.data : [res.data]).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, records };
  }
};
