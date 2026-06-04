const { utils } = require("./utils");

module.exports = {
  async supa_insert(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    if (!d.recordData) return { ok: false, error: "Données requises." };

    let body;
    try { body = typeof d.recordData === "string" ? JSON.parse(d.recordData) : d.recordData; } catch { return { ok: false, error: "JSON invalide." }; }

    log('Création en cours...');
    const res = await utils.supaRequest(opts, `/rest/v1/${encodeURIComponent(d.table)}`, {
      method: "POST", body
    });
    if (!res.ok) return res;
    const records = (Array.isArray(res.data) ? res.data : [res.data]).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, records };
  }
};
