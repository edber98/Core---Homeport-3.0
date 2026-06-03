const { utils } = require("./utils");
module.exports = { async figma_team_styles_list(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.teamId) return { ok: false, error: "teamId requis." };
  const res = await utils.figmaRequest(opts, `/teams/${encodeURIComponent(String(d.teamId))}/styles`, { query: { page_size: d.pageSize, after: d.cursor } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = utils.asArray(res.data?.meta?.styles);
  const items = rawItems.map(utils.itemFromUnknown);
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.meta?.cursor?.after || "" };
} };
