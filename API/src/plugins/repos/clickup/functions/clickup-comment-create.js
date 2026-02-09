const { utils } = require("./utils");

module.exports = {
  async clickup_comment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskId = (d.taskId || "").trim();
    const comment_text = (d.comment_text || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };
    if (!comment_text) return { ok: false, error: "Missing comment_text." };

    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}/comment`, {
      method: "POST", body: { comment_text }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true, id: String(r.id || ""), comment_text: comment_text,
      user: r.user ? r.user.username || "" : "", date: r.date || ""
    };
  }
};
