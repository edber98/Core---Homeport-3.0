const { utils } = require("./utils");

module.exports = {
  async brevo_campaigns_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;
    const query = { limit, offset, type: "classic" };
    if (d.status) query.status = d.status;

    const res = await utils.brevoRequest(opts, "/emailCampaigns", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.campaigns) || [];
    const campaigns = results.map(r => ({ id: String(r.id || ""), name: r.name || "", subject: r.subject || "", status: r.status || "", type: r.type || "", createdAt: r.createdAt || "" }));
    return { ok: true, campaigns, totalCount: res.data?.count || 0 };
  }
};
