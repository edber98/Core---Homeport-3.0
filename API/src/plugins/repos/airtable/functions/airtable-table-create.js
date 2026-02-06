const { utils } = require("./utils");
module.exports = {
  async airtable_table_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const name = (d.name || "").trim();
    const fieldsStr = (d.fields || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!name) return { ok: false, error: "Missing name." };
    if (!fieldsStr) return { ok: false, error: "Missing fields." };
    let fields;
    try { fields = typeof fieldsStr === "object" ? fieldsStr : JSON.parse(fieldsStr); } catch { return { ok: false, error: "Invalid JSON in fields." }; }
    const body = { name, fields };
    if (d.description) body.description = d.description;
    const res = await utils.airtableRequest(opts, `/meta/bases/${encodeURIComponent(baseId)}/tables`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, description: r.description || "", primaryFieldId: r.primaryFieldId || "" };
  }
};
