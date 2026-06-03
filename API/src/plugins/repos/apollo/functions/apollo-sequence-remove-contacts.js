const { utils } = require("./utils");

module.exports = {
  async apollo_sequence_remove_contacts(node, msg, inputs, opts) {
    const d = inputs || {};
    const sequenceId = String(d.sequenceId || "").trim();
    if (!sequenceId) return { ok: false, error: "sequenceId requis." };
    let contactIds;
    try { contactIds = utils.parseJsonInput(d.contact_ids, "contact_ids", []); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(contactIds) || !contactIds.length) return { ok: false, error: "contact_ids doit être un tableau JSON non vide." };
    const res = await utils.apiRequest(opts, `/emailer_campaigns/${encodeURIComponent(sequenceId)}/remove_contact_ids`, {
      method: "POST",
      body: { contact_ids: contactIds }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.responseResult(res.data);
  }
};
