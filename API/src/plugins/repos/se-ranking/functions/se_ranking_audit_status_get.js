const { utils } = require("./utils");

module.exports = {
  async se_ranking_audit_status_get(node, msg, inputs, opts) {
    const auditId = String((inputs && inputs.auditId) || "").trim();
    if (!auditId) return { ok: false, error: "ID audit requis." };
    const res = await utils.seRankingRequest(opts, "GET", `/v1/audit/${encodeURIComponent(auditId)}/status`);
    if (!res.ok) return res;
    return { ok: true, totalCount: "1", rows: [{ json: JSON.stringify(res.data || {}) }], raw: JSON.stringify(res.data || {}) };
  }
};
