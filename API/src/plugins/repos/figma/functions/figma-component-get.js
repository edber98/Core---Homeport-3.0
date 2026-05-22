const { utils } = require("./utils");
module.exports = { async figma_component_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.key) return { ok: false, error: "key requis." };
  const res = await utils.figmaRequest(opts, `/components/${encodeURIComponent(String(d.key))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data?.meta || res.data || {};
  return { ok: true, id: r.key || d.key, name: r.name || "", url: r.thumbnail_url || "", text: r.description || "", result_json: utils.compactJson(res.data) };
} };
