const { utils } = require("./utils");

module.exports = {
  async huggingface_spaces_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.search) query.search = String(d.search);
    if (d.limit !== undefined && d.limit !== null && d.limit !== "") query.limit = parseInt(d.limit, 10);
    const res = await utils.huggingfaceRequest(opts, "/api/spaces", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.asArray(res.data).map((r, i) => utils.itemFromUnknown(r, i));
    return { ok: true, items, totalCount: items.length, nextCursor: "" };
  }
};
