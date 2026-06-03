const { utils } = require("./utils");

function parseJson(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`Invalid JSON in ${label}.`); }
}

module.exports = {
  async airtable_records_delete_batch(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };

    let recordIds;
    try { recordIds = parseJson(d.recordIds, "recordIds"); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(recordIds) || !recordIds.length) return { ok: false, error: "recordIds must be a non-empty JSON array." };

    const query = {};
    recordIds.forEach((id, i) => { query[`records[${i}]`] = String(id || "").trim(); });
    const res = await utils.airtableRequest(opts, `/${encodeURIComponent(baseId)}/${encodeURIComponent(tableIdOrName)}`, {
      method: "DELETE",
      query
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, deletedCount: recordIds.length, message: "Batch delete terminé." };
  }
};
