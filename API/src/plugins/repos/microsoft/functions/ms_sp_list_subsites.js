const { utils } = require("./utils");

module.exports = {
  async ms_sp_list_subsites(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };

    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/sites`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const sites = (res.data.value || []).map(s => ({
      id: s.id,
      displayName: s.displayName || "",
      webUrl: s.webUrl || "",
      description: s.description || ""
    }));
    const totalCount = res.data?.["@odata.count"] || sites.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, sites, totalCount, hasMore };
  }
};
