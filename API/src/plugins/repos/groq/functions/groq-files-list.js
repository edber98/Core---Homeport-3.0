const { utils } = require("./utils");

function itemFromUnknown(value, index = 0) {
  const r = value || {};
  return {
    id: String(r.id || r.key || r.url || index),
    name: r.name || r.title || r.model || r.url || "",
    status: r.status || r.state || "",
    url: r.url || r.link || "",
    result_json: utils.compactJson(r)
  };
}

module.exports = { async groq_files_list(node, msg, inputs, opts) {
  const res = await utils.groqRequest(opts, "/files");
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.data) ? res.data.data : [];
  const items = rawItems.map(itemFromUnknown);
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
