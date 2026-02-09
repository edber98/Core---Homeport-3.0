const { utils } = require("./utils");

module.exports = {
  async ms_sp_get_site(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };

    const res = await utils.graphRequest(opts, `/sites/${d.siteId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const s = res.data;
    return {
      ok: true,
      id: s.id,
      displayName: s.displayName || "",
      webUrl: s.webUrl || "",
      description: s.description || ""
    };
  }
};
