const { utils } = require("./utils");

module.exports = {
  async supa_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.table || !d.filter) return { ok: false, error: "Table et filtre requis." };
    if (!d.recordData) return { ok: false, error: "Données requises." };

    let body;
    try { body = typeof d.recordData === "string" ? JSON.parse(d.recordData) : d.recordData; } catch { return { ok: false, error: "JSON invalide." }; }

    log('Mise à jour en cours...');
    const res = await utils.supaRequest(opts, `/rest/v1/${encodeURIComponent(d.table)}?${d.filter}`, {
      method: "PATCH", body
    });
    if (!res.ok) return res;
    const records = (Array.isArray(res.data) ? res.data : [res.data]).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, records };
  }
};
