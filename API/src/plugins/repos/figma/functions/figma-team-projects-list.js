const { utils } = require("./utils");

module.exports = {
  async figma_team_projects_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = String(d.teamId || "").trim();
    if (!teamId) return { ok: false, error: "teamId requis." };
    const path = `/teams/${encodeURIComponent(teamId)}/projects`;
    const res = await utils.figmaRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = Array.isArray(res.data?.projects) ? res.data.projects : [];
    const items = rawItems.map((r) => ({ id: String(r.id || ""), name: r.name || "", status: "project", url: r.url || "", result_json: utils.compactJson(r) }));
    return { ok: true, items, totalCount: items.length, nextCursor: "" };
  }
};
