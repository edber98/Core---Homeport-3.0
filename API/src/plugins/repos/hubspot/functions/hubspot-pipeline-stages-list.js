const { utils } = require("./utils");

module.exports = {
  async hubspot_pipeline_stages_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const objectType = (d.objectType || "").trim();
    const pipelineId = (d.pipelineId || "").toString().trim();
    if (!objectType) return { ok: false, error: "Missing objectType." };
    if (!pipelineId) return { ok: false, error: "Missing pipelineId." };

    log('Récupération de la liste...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/pipelines/${encodeURIComponent(objectType)}/${encodeURIComponent(pipelineId)}/stages`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const stages = results.map(s => ({
      id: s.id,
      label: s.label,
      displayOrder: s.displayOrder
    }));
    return { ok: true, stages , totalCount: stages.length };
  }
};
