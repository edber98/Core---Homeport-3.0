const { utils } = require("./utils");
module.exports = { async firecrawl_extract_run(node, msg, inputs, opts) {
  const d = inputs || {};
  let urls, schema;
  try {
    urls = utils.parseJsonInput(d.urls, "URLs", null);
    schema = utils.parseJsonInput(d.schema, "schéma", undefined);
  } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(urls) || !urls.length) return { ok: false, error: "URLs JSON requises." };
  if (!d.prompt) return { ok: false, error: "Prompt requis." };
  const body = { urls, prompt: String(d.prompt) };
  if (schema) body.schema = schema;
  utils.addBoolean(body, "enableWebSearch", d.enableWebSearch);
  utils.addBoolean(body, "ignoreSitemap", d.ignoreSitemap);
  utils.addBoolean(body, "allowExternalLinks", d.allowExternalLinks);
  const res = await utils.firecrawlRequest(opts, "/v2/extract", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.success === false ? "failed" : "completed", text: utils.compactJson(res.data?.data || res.data), result_json: utils.compactJson(res.data) };
} };
