const { utils } = require("./utils");

module.exports = {
  async clickup_comments_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskId = (d.taskId || "").trim();
    if (!taskId) return { ok: false, error: "Missing taskId." };

    log('Récupération de la liste...');
    const res = await utils.clickupRequest(opts, `/task/${encodeURIComponent(taskId)}/comment`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.comments) || [];
    const comments = results.map(r => ({
      id: String(r.id || ""), comment_text: r.comment_text || "",
      user: r.user ? r.user.username || "" : "", date: r.date || ""
    }));
    return { ok: true, comments, totalCount: comments.length };
  }
};
