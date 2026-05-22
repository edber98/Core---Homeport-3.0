const { utils } = require("./utils");
module.exports = { async figma_style_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.key) return { ok: false, error: "key requis." };
  const res = await utils.figmaRequest(opts, `/styles/${encodeURIComponent(String(d.key))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data?.meta || res.data || {};
  return { ok: true, id: r.key || d.key, name: r.name || "", status: r.style_type || "", url: r.thumbnail_url || "", text: r.description || "", result_json: utils.compactJson(res.data) };
} };
