const { utils } = require("./utils");
module.exports = { async wise_quote_requirements_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.source || !d.target || !d.sourceAmount || !d.profileId) return { ok: false, error: "source, target, sourceAmount, profileId requis." };
  const query = { source: d.source, target: d.target, sourceAmount: d.sourceAmount, profile: d.profileId };
  const res = await utils.wiseRequest(opts, `/v1/quotes`, { method: "GET", query });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const items = utils.asArray(res.data).map(utils.itemFromUnknown);
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
}};
