const { utils } = require("./utils");
module.exports = {
  async airtable_table_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    log('Récupération des données...');
    const res = await utils.airtableRequest(opts, `/meta/bases/${encodeURIComponent(baseId)}/tables`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const tables = (res.data && res.data.tables) || [];
    const t = tables.find(t => t.id === tableIdOrName || t.name === tableIdOrName);
    if (!t) return { ok: false, error: "Table not found." };
    return { ok: true, id: t.id, name: t.name, description: t.description || "", primaryFieldId: t.primaryFieldId || "" };
  }
};
