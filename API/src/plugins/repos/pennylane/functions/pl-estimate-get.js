const { utils } = require("./utils");

module.exports = {
  async pl_estimate_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const estimateId = (d.estimateId || "").toString().trim();
    if (!estimateId) return { ok: false, error: "Missing estimateId." };

    log('Récupération des données...');
    const res = await utils.plRequest(opts, `/estimates/${encodeURIComponent(estimateId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.estimate) || res.data || {};
    return { ok: true, id: String(r.id || ""), estimate_number: r.estimate_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), currency: r.currency || "", status: r.status || "", date: r.date || "", customer_id: String(r.customer_id || "") };
  }
};
