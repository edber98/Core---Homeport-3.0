const { utils } = require("./utils");

module.exports = {
  async cloudflare_dns_records_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };

    const query = {
      name: d.name,
      type: d.type,
      content: d.content,
      page: utils.toInt(d.page, 1),
      per_page: utils.toInt(d.pageSize, 50)
    };

    log("Lecture des enregistrements DNS...");
    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/dns_records`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const records = (Array.isArray(res.data) ? res.data : []).map(utils.compactDnsRecord);
    return { ok: true, records, totalCount: res.resultInfo?.total_count || records.length, page: res.resultInfo?.page || query.page };
  }
};
