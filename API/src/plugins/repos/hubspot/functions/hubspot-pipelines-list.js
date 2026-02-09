const { utils } = require("./utils");

module.exports = {
  async hubspot_pipelines_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const objectType = (d.objectType || "").trim();
    if (!objectType) return { ok: false, error: "Missing objectType." };

    const res = await utils.hubspotRequest(opts, `/crm/v3/pipelines/${encodeURIComponent(objectType)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const pipelines = results.map(p => ({
      id: p.id,
      label: p.label,
      displayOrder: p.displayOrder,
      stages: (p.stages || []).map(s => s.label).join(", ")
    }));
    return { ok: true, pipelines };
  }
};
