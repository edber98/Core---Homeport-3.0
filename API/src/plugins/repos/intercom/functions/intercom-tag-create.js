const { utils } = require("./utils");

module.exports = {
  async intercom_tag_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.name || "").trim()) return { ok: false, error: "Missing name." };

    const res = await utils.intercomRequest(opts, "/tags", { method: "POST", body: { name: d.name } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name || d.name };
  }
};
