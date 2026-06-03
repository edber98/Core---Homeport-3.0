const { utils } = require("./utils");

function parseJson(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`Invalid JSON in ${label}.`); }
}

module.exports = {
  async airtable_records_update_batch(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };

    let records;
    try { records = parseJson(d.records, "records"); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(records) || !records.length) return { ok: false, error: "records must be a non-empty JSON array." };

    const res = await utils.airtableRequest(opts, `/${encodeURIComponent(baseId)}/${encodeURIComponent(tableIdOrName)}`, {
      method: "PATCH",
      body: { records }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const raw = (res.data && res.data.records) || [];
    const output = raw.map((r) => ({ id: r.id, fields: JSON.stringify(r.fields || {}), createdTime: r.createdTime }));
    return { ok: true, records: output, totalCount: output.length };
  }
};
