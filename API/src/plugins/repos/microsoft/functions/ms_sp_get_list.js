const { utils } = require("./utils");

module.exports = {
  async ms_sp_get_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.listId) return { ok: false, error: "Missing listId." };

    log('Récupération de la liste...');
    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/lists/${d.listId}`);
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
