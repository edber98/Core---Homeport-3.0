const { utils } = require("./utils");

function parseJson(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`Invalid JSON in ${label}.`); }
}

module.exports = {
  async airtable_webhook_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };

    const notificationUrl = String(d.notificationUrl || "").trim();
    let specification;
    try { specification = parseJson(d.specification, "specification"); } catch (e) { return { ok: false, error: e.message }; }
    if (!notificationUrl) return { ok: false, error: "notificationUrl is required." };
    if (!specification || typeof specification !== "object") return { ok: false, error: "specification is required." };

    const body = { notificationUrl, specification };
    const res = await utils.airtableRequest(opts, `/bases/${encodeURIComponent(baseId)}/webhooks`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: 200, message: "Webhook créé.", raw: res.data || null };
  }
};
