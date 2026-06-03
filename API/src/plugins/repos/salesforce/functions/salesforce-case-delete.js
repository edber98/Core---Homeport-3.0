const { utils } = require("./utils");

module.exports = {
  async salesforce_case_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const caseId = (d.caseId || "").toString().trim();
    if (!caseId) return { ok: false, error: "Missing caseId." };

    const res = await utils.sfRequest(opts, `/sobjects/Case/${encodeURIComponent(caseId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: caseId, deleted: true };
  }
};
