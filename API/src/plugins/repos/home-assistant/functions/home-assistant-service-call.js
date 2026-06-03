const { utils } = require("./utils");

module.exports = {
  async home_assistant_service_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const domain = String(d.domain || "").trim();
    const service = String(d.service || "").trim();
    if (!domain) return { ok: false, error: "Domaine requis." };
    if (!service) return { ok: false, error: "Service requis." };

    let serviceData;
    try {
      serviceData = utils.parseJsonInput(d.serviceData, "données du service");
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const query = d.returnResponse ? { return_response: true } : undefined;
    log("Appel du service...");
    const res = await utils.homeAssistantRequest(opts, `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, {
      method: "POST",
      query,
      body: serviceData || {}
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data;
    const rawStates = Array.isArray(data) ? data : (Array.isArray(data?.changed_states) ? data.changed_states : []);
    const states = rawStates.map(utils.mapState);
    return {
      ok: true,
      domain,
      service,
      states,
      totalCount: states.length,
      response: data && !Array.isArray(data) ? (data.service_response || data.response || data) : null
    };
  }
};
