const { utils } = require("./utils");
module.exports = {
  async airtable_tables_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    log('Récupération de la liste...');
    const res = await utils.airtableRequest(opts, `/meta/bases/${encodeURIComponent(baseId)}/tables`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawTables = (res.data && res.data.tables) || [];
    const tables = rawTables.map(t => ({ id: t.id, name: t.name, description: t.description || "", primaryFieldId: t.primaryFieldId || "" }));
    return { ok: true, tables , totalCount: tables.length };
  }
};
