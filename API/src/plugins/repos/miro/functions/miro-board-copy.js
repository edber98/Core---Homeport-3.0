const { utils } = require("./utils");

module.exports = {
  async miro_board_copy(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = String(d.boardId || "").trim();
    if (!boardId) return { ok: false, error: "boardId requis." };

    const body = {};
    if (d.name) body.name = String(d.name);
    if (d.description) body.description = String(d.description);
    if (d.teamId) body.teamId = String(d.teamId);
    if (d.projectId) body.projectId = String(d.projectId);

    const path = `/boards/${encodeURIComponent(boardId)}/copy`;
    const res = await utils.miroRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data?.data || res.data || {};
    return {
      ok: true,
      id: String(r.id || ""),
      name: r.name || r.title || "",
      status: r.type || "board",
      url: r.viewLink || r.links?.self || "",
      text: "Board copie.",
      result_json: utils.compactJson(res.data)
    };
  }
};
