const { utils } = require("./utils");
module.exports = {
  async airtable_fields_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    log('Récupération de la liste...');
    const res = await utils.airtableRequest(opts, `/meta/bases/${encodeURIComponent(baseId)}/tables`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const tables = (res.data && res.data.tables) || [];
    const t = tables.find(t => t.id === tableIdOrName || t.name === tableIdOrName);
    if (!t) return { ok: false, error: "Table not found." };
    const fields = (t.fields || []).map(f => ({ id: f.id, name: f.name, type: f.type, description: f.description || "" }));
    return { ok: true, fields , totalCount: fields.length };
  }
};
