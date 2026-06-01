const { utils } = require("./utils");

module.exports = {
  async asana_task_add_followers(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    let followers = d.followers;
    if (typeof followers === "string") {
      try { followers = JSON.parse(followers); } catch { followers = followers.split(",").map(s => s.trim()).filter(Boolean); }
    }
    if (!Array.isArray(followers) || !followers.length) return { ok: false, error: "followers requis (JSON array ou CSV)." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/addFollowers`, {
      method: "POST",
      body: { data: { followers } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapTask((res.data && res.data.data) || {});
  }
};
