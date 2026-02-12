const { utils } = require("./utils");

module.exports = {
  async linear_projects_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const first = parseInt(d.first, 10) || 50;

    const query = `query Projects($first: Int!) {
      projects(first: $first) {
        nodes { id name state progress }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { first });
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.projects && res.data.projects.nodes) || [];
    const projects = nodes.map(p => ({
      id: p.id || "", name: p.name || "", state: p.state || "",
      progress: String(p.progress || 0)
    }));
    return { ok: true, projects, totalCount: String(projects.length) };
  }
};
