const { utils } = require("./utils");

module.exports = {
  async home_assistant_services_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    log("Récupération des services...");
    const res = await utils.homeAssistantRequest(opts, "/api/services");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const services = utils.flattenServices(res.data, d.domain);
    return { ok: true, services, totalCount: services.length };
  }
};
