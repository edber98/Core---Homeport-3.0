const { utils } = require("./utils");

module.exports = {
  async airtable_webhooks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };

    const res = await utils.airtableRequest(opts, `/bases/${encodeURIComponent(baseId)}/webhooks`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const raw = (res.data && res.data.webhooks) || [];
    const records = raw.map((w) => ({
      id: w.id,
      fields: JSON.stringify(w || {}),
      createdTime: w.createdTime || w.expirationTime || ""
    }));
    return { ok: true, records, totalCount: records.length };
  }
};
