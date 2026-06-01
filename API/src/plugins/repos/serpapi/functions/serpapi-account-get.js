const { utils } = require("./utils");
module.exports = { async serpapi_account_get(node, msg, inputs, opts) {
  const res = await utils.serpapiRequest(opts, "/account.json");
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const d = res.data || {};
  return {
    ok: true,
    id: d.account_id || "",
    status: "ok",
    name: d.plan_name || d.plan_id || "",
    url: "",
    text: `searches_left=${d.plan_searches_left ?? ""}, total_left=${d.total_searches_left ?? ""}, credits=${d.extra_credits ?? ""}`,
    result_json: utils.compactJson(d)
  };
} };
