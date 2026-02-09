const { utils } = require("./utils");

module.exports = {
  async linear_cycle_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const cycleId = (d.cycleId || "").trim();
    if (!cycleId) return { ok: false, error: "Missing cycleId." };

    const query = `query Cycle($id: String!) {
      cycle(id: $id) { id number name startsAt endsAt progress }
    }`;

    const res = await utils.linearQuery(opts, query, { id: cycleId });
    if (!res.ok) return { ok: false, error: res.error };

    const c = (res.data && res.data.cycle) || {};
    return {
      ok: true, id: c.id || "", number: String(c.number || ""), name: c.name || "",
      startsAt: c.startsAt || "", endsAt: c.endsAt || "", progress: String(c.progress || 0)
    };
  }
};
