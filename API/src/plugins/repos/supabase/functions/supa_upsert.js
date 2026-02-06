const { utils } = require("./utils");

module.exports = {
  async supa_upsert(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table) return { ok: false, error: "Table requise." };
    if (!d.data) return { ok: false, error: "Données requises." };

    let body;
    try { body = typeof d.data === "string" ? JSON.parse(d.data) : d.data; } catch { return { ok: false, error: "JSON invalide." }; }

    const headers = {};
    if (d.onConflict) headers["Prefer"] = `resolution=merge-duplicates`;

    let path = `/rest/v1/${encodeURIComponent(d.table)}`;
    if (d.onConflict) path += `?on_conflict=${d.onConflict}`;

    const res = await utils.supaRequest(opts, path, {
      method: "POST", body, headers, prefer: "return=representation,resolution=merge-duplicates"
    });
    if (!res.ok) return res;
    const records = (Array.isArray(res.data) ? res.data : [res.data]).map(r => ({ data: JSON.stringify(r) }));
    return { ok: true, records };
  }
};
