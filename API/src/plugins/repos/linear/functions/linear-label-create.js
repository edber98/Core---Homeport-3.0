const { utils } = require("./utils");

module.exports = {
  async linear_label_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    const name = (d.name || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };
    if (!name) return { ok: false, error: "Missing name." };

    const input = { teamId, name };
    if (d.color) input.color = d.color;

    const query = `mutation LabelCreate($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel { id name color }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { input });
    if (!res.ok) return { ok: false, error: res.error };

    const lc = (res.data && res.data.issueLabelCreate) || {};
    if (!lc.success) return { ok: false, error: "Label creation failed." };
    const l = lc.issueLabel || {};
    return { ok: true, id: l.id || "", name: l.name || "", color: l.color || "" };
  }
};
