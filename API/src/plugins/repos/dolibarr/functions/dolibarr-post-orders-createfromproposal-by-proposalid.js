const { utils } = require("./utils");

module.exports = {
  async dolibarr_post_orders_createfromproposal_by_proposalid(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.proposalid && d.proposalid !== 0) return { ok: false, error: "Champ proposalid requis." };
    const query = d.query || "";
    let body = undefined;
    if (d.body_json) {
      try { body = JSON.parse(d.body_json); } catch (e) { return { ok: false, error: "body_json invalide (JSON attendu)." }; }
    }
    const path = `/orders/createfromproposal/${encodeURIComponent(d.proposalid)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
