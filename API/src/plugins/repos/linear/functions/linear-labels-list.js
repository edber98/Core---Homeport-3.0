const { utils } = require("./utils");

module.exports = {
  async linear_labels_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const first = parseInt(d.first, 10) || 100;

    const query = `query Labels($first: Int!) {
      issueLabels(first: $first) {
        nodes { id name color }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { first });
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.issueLabels && res.data.issueLabels.nodes) || [];
    const labels = nodes.map(l => ({ id: l.id || "", name: l.name || "", color: l.color || "" }));
    return { ok: true, labels };
  }
};
