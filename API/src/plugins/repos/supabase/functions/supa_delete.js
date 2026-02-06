const { utils } = require("./utils");

module.exports = {
  async supa_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.table || !d.filter) return { ok: false, error: "Table et filtre requis." };

    const res = await utils.supaRequest(opts, `/rest/v1/${encodeURIComponent(d.table)}?${d.filter}`, {
      method: "DELETE"
    });
    if (!res.ok) return res;
    const count = Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0);
    return { ok: true, status: "success", message: `${count} enregistrement(s) supprimé(s).`, count };
  }
};
