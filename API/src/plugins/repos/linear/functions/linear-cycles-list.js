const { utils } = require("./utils");

module.exports = {
  async linear_cycles_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const first = parseInt(d.first, 10) || 50;

    let filter = "";
    const variables = { first };
    if (d.teamId && d.teamId.trim()) {
      filter = ', filter: { team: { id: { eq: $teamId } } }';
      variables.teamId = d.teamId.trim();
    }

    const teamParam = variables.teamId ? "$teamId: String, " : "";
    const query = `query Cycles(${teamParam}$first: Int!) {
      cycles(first: $first${filter}) {
        nodes { id number name startsAt endsAt }
      }
    }`;

    const res = await utils.linearQuery(opts, query, variables);
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.cycles && res.data.cycles.nodes) || [];
    const cycles = nodes.map(c => ({
      id: c.id || "", number: String(c.number || ""), name: c.name || "",
      startsAt: c.startsAt || "", endsAt: c.endsAt || ""
    }));
    return { ok: true, cycles, totalCount: String(cycles.length) };
  }
};
