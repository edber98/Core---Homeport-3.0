const { utils } = require("./utils");

module.exports = {
  async apollo_sequence_contact_status_update(node, msg, inputs, opts) {
    const d = inputs || {};
    let emailer_campaign_ids;
    let contact_ids;
    try { emailer_campaign_ids = utils.parseJsonInput(d.emailer_campaign_ids, "emailer_campaign_ids", []); } catch (e) { return { ok: false, error: e.message }; }
    try { contact_ids = utils.parseJsonInput(d.contact_ids, "contact_ids", []); } catch (e) { return { ok: false, error: e.message }; }
    const mode = String(d.mode || "").trim();
    if (!Array.isArray(emailer_campaign_ids) || !emailer_campaign_ids.length) return { ok: false, error: "emailer_campaign_ids requis (JSON array)." };
    if (!Array.isArray(contact_ids) || !contact_ids.length) return { ok: false, error: "contact_ids requis (JSON array)." };
    if (!["mark_as_finished", "remove", "stop"].includes(mode)) return { ok: false, error: "mode doit être mark_as_finished, remove ou stop." };

    const query = {};
    emailer_campaign_ids.forEach((v, i) => { query[`emailer_campaign_ids[${i}]`] = v; });
    contact_ids.forEach((v, i) => { query[`contact_ids[${i}]`] = v; });
    query.mode = mode;

    const res = await utils.apiRequest(opts, "/emailer_campaigns/remove_or_stop_contact_ids", { method: "POST", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.responseResult(res.data);
  }
};
