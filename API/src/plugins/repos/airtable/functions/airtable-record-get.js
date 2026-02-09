const { utils } = require("./utils");
module.exports = {
  async airtable_record_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    const recordId = (d.recordId || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    if (!recordId) return { ok: false, error: "Missing recordId." };
    const res = await utils.airtableRequest(opts, `/${encodeURIComponent(baseId)}/${encodeURIComponent(tableIdOrName)}/${encodeURIComponent(recordId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, fields: JSON.stringify(r.fields || {}), createdTime: r.createdTime };
  }
};
