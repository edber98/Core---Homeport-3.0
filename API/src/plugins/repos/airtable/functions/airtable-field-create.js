const { utils } = require("./utils");
module.exports = {
  async airtable_field_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    const name = (d.name || "").trim();
    const type = (d.type || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    if (!name) return { ok: false, error: "Missing name." };
    if (!type) return { ok: false, error: "Missing type." };
    const body = { name, type };
    if (d.description) body.description = d.description;
    log('Création en cours...');
    const res = await utils.airtableRequest(opts, `/meta/bases/${encodeURIComponent(baseId)}/tables/${encodeURIComponent(tableIdOrName)}/fields`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, type: r.type, description: r.description || "" };
  }
};
