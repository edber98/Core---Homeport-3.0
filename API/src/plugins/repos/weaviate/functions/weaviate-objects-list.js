const { utils } = require("./utils");
module.exports = { async weaviate_objects_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const query = { class: d.className, limit: d.limit, offset: d.offset };
  const res = await utils.weaviateRequest(opts, `/v1/objects`, { method: "GET", query });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = utils.asArray(res.data?.objects || res.data);
  const items = rawItems.map(utils.itemFromUnknown);
  return { ok: true, items, totalCount: Number(res.data?.totalResults || items.length), nextCursor: "" };
}};
