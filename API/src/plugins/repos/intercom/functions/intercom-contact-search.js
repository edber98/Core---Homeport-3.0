const { utils } = require("./utils");

module.exports = {
  async intercom_contact_search(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.field || "").trim()) return { ok: false, error: "Missing field." };
    if (!(d.value || "").trim()) return { ok: false, error: "Missing value." };

    const body = { query: { field: d.field, operator: d.operator || "=", value: d.value } };
    const res = await utils.intercomRequest(opts, "/contacts/search", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const contacts = items.map(r => ({ id: r.id, type: r.type || r.role, name: r.name || "", email: r.email || "", phone: r.phone || "", role: r.role || "", createdAt: String(r.created_at || "") }));
    return { ok: true, contacts };
  }
};
