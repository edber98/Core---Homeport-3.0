const { utils } = require("./utils");

module.exports = {
  async mc_campaigns_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const count = parseInt(d.count, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;
    const query = { count, offset };
    if (d.status) query.status = d.status;

    log('Récupération de la liste...');
    const res = await utils.mailchimpRequest(opts, "/campaigns", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.campaigns) || [];
    const campaigns = results.map(r => ({ id: r.id || "", type: r.type || "", status: r.status || "", title: r.settings?.title || "", subject: r.settings?.subject_line || "", createTime: r.create_time || "" }));
    return { ok: true, campaigns, totalCount: res.data?.total_items || 0 };
  }
};
