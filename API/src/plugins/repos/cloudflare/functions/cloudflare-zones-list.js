const { utils } = require("./utils");

module.exports = {
  async cloudflare_zones_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {
      name: d.name,
      status: d.status,
      page: utils.toInt(d.page, 1),
      per_page: utils.toInt(d.pageSize, 50)
    };

    log("Recherche des zones Cloudflare...");
    const res = await utils.cloudflareRequest(opts, "/zones", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const zones = (Array.isArray(res.data) ? res.data : []).map(utils.compactZone);
    return { ok: true, zones, totalCount: res.resultInfo?.total_count || zones.length, page: res.resultInfo?.page || query.page };
  }
};
