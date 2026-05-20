const { utils } = require("./utils");
module.exports = { async miro_board_item_update(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.boardId) return { ok: false, error: "boardId requis." };
  if (!d.itemId) return { ok: false, error: "itemId requis." };
  let data, position;
  try { data = utils.parseJsonInput(d.data, "data", undefined); position = utils.parseJsonInput(d.position, "position", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const res = await utils.miroRequest(opts, `/boards/${encodeURIComponent(String(d.boardId))}/items/${encodeURIComponent(String(d.itemId))}`, { method: "PATCH", body: { data, position } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data || {};
  return { ok: true, id: r.id || d.itemId, name: r.data?.title || "", status: r.type || "", result_json: utils.compactJson(res.data) };
} };
