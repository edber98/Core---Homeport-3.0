const { utils } = require("./utils");

module.exports = {
  async calendly_invitee_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.inviteeUuid || "").trim()) return { ok: false, error: "Missing inviteeUuid." };

    const res = await utils.calendlyRequest(opts, `/invitees/${d.inviteeUuid}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.resource) || {};
    return { ok: true, uri: r.uri, name: r.name, email: r.email, status: r.status, createdAt: r.created_at };
  }
};
