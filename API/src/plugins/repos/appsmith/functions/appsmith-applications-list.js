const { utils } = require("./utils");

module.exports = {
  async appsmith_applications_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.search !== undefined && d.search !== null && String(d.search).trim() !== "") query.search = String(d.search).trim();
    if (d.workspaceId !== undefined && d.workspaceId !== null && String(d.workspaceId).trim() !== "") query.workspaceId = String(d.workspaceId).trim();
    if (d.page !== undefined && d.page !== null && String(d.page).trim() !== "") query.page = String(d.page).trim();
    if (d.limit !== undefined && d.limit !== null && String(d.limit).trim() !== "") query.limit = String(d.limit).trim();

    const res = await utils.appsmithRequest(opts, "/api/v1/applications", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const apps = utils.toArray(res.data).map((item) => utils.normalizeApp(item));
    return {
      ok: true,
      apps,
      totalCount: apps.length,
      raw: res.data
    };
  }
};
