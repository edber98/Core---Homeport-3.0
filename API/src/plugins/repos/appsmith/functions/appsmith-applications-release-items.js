const { utils } = require("./utils");

module.exports = {
  async appsmith_applications_release_items(node, msg, inputs, opts) {
    const res = await utils.appsmithRequest(opts, "/api/v1/applications/releaseItems");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = utils.toArray(res.data).map((item) => utils.normalizeReleaseItem(item));
    return {
      ok: true,
      items,
      totalCount: items.length,
      raw: res.data
    };
  }
};
