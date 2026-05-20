const { utils } = require("./utils");
module.exports = { async firecrawl_extract_run(node, msg, inputs, opts) {
  const d = inputs || {};
  let urls, schema, options;
  try {
    urls = utils.parseJsonInput(d.urls, "URLs", null);
    schema = utils.parseJsonInput(d.schema, "schéma", undefined);
    options = utils.parseJsonInput(d.options, "options", {});
  } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(urls) || !urls.length) return { ok: false, error: "URLs JSON requises." };
  if (!d.prompt) return { ok: false, error: "Prompt requis." };
  const body = { ...options, urls, prompt: String(d.prompt) };
  if (schema) body.schema = schema;
  const res = await utils.firecrawlRequest(opts, "/v2/extract", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.success === false ? "failed" : "completed", text: utils.compactJson(res.data?.data || res.data), result_json: utils.compactJson(res.data) };
} };
