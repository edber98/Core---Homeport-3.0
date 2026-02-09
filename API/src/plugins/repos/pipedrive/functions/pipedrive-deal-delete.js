const { utils } = require("./utils");

module.exports = {
  async pipedrive_deal_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const dealId = (d.dealId || "").toString().trim();
    if (!dealId) return { ok: false, error: "Missing dealId." };

    const res = await utils.pdRequest(opts, `/deals/${encodeURIComponent(dealId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Deal ${dealId} deleted.` };
  }
};
