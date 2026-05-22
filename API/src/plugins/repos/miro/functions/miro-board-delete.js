const { utils } = require("./utils");
module.exports = { async miro_board_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.boardId) return { ok: false, error: "boardId requis." };
  const res = await utils.miroRequest(opts, `/boards/${encodeURIComponent(String(d.boardId))}`, { method: "DELETE", body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.boardId, status: "deleted", result_json: utils.compactJson(res.data) };
} };
