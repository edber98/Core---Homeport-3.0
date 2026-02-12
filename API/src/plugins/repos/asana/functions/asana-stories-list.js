const { utils } = require("./utils");

module.exports = {
  async asana_stories_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/stories`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.data) || [];
    const stories = results.map(r => ({
      gid: r.gid || "", text: r.text || "", type: r.type || "",
      created_at: r.created_at || ""
    }));
    return { ok: true, stories, totalCount: String(stories.length) };
  }
};
