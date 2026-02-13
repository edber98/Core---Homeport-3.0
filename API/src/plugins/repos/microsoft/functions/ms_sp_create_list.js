const { utils } = require("./utils");

module.exports = {
  async ms_sp_create_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.displayName) return { ok: false, error: "Missing displayName." };

    const body = {
      displayName: d.displayName,
      list: { template: d.template || "genericList" }
    };

    log('Création en cours...');
    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/lists`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const l = res.data;
    return {
      ok: true,
      id: l.id,
      displayName: l.displayName || "",
      webUrl: l.webUrl || "",
      template: l.list?.template || ""
    };
  }
};
