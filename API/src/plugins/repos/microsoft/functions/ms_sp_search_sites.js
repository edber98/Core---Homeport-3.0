const { utils } = require("./utils");

module.exports = {
  async ms_sp_search_sites(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.graphRequest(opts, `/sites?search=${encodeURIComponent(d.query)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const sites = (res.data.value || []).map(s => ({
      id: s.id,
      displayName: s.displayName || "",
      webUrl: s.webUrl || "",
      description: s.description || ""
    }));
    return { ok: true, sites };
  }
};
