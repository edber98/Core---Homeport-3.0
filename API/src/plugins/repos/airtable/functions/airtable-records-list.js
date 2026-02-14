const { utils } = require("./utils");
module.exports = {
  async airtable_records_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const baseId = (d.baseId || "").trim();
    const tableIdOrName = (d.tableIdOrName || "").trim();
    if (!baseId) return { ok: false, error: "Missing baseId." };
    if (!tableIdOrName) return { ok: false, error: "Missing tableIdOrName." };
    const query = {};
    if (d.view) query.view = d.view;
    if (d.maxRecords) query.maxRecords = String(d.maxRecords);
    if (d.filterByFormula) query.filterByFormula = d.filterByFormula;
    log('Récupération de la liste...');
    const res = await utils.airtableRequest(opts, `/${encodeURIComponent(baseId)}/${encodeURIComponent(tableIdOrName)}`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawRecords = (res.data && res.data.records) || [];
    const records = rawRecords.map(r => ({ id: r.id, fields: JSON.stringify(r.fields || {}), createdTime: r.createdTime }));
    return { ok: true, records , totalCount: records.length };
  }
};
