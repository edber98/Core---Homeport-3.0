const { utils } = require("./utils");
module.exports = {
  async airtable_record_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    const recordId = (d.recordId || "").trim();
    const fieldsStr = (d.fields || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    if (!recordId) return { ok: false, error: "Missing recordId." };
    if (!fieldsStr) return { ok: false, error: "Missing fields." };
    let fields;
    try { fields = typeof fieldsStr === "object" ? fieldsStr : JSON.parse(fieldsStr); } catch { return { ok: false, error: "Invalid JSON in fields." }; }
    log('Mise à jour en cours...');
    const res = await utils.airtableRequest(opts, `/${encodeURIComponent(baseId)}/${encodeURIComponent(tableIdOrName)}/${encodeURIComponent(recordId)}`, { method: "PATCH", body: { fields } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, fields: JSON.stringify(r.fields || {}), createdTime: r.createdTime };
  }
};
