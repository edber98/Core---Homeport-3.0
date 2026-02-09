const { utils } = require("./utils");

module.exports = {
  async calendly_event_type_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.eventTypeUuid || "").trim()) return { ok: false, error: "Missing eventTypeUuid." };

    const res = await utils.calendlyRequest(opts, `/event_types/${d.eventTypeUuid}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.resource) || {};
    return { ok: true, uri: r.uri, name: r.name, slug: r.slug, duration: String(r.duration || ""), active: String(r.active), description: r.description_plain || r.description_html || "" };
  }
};
