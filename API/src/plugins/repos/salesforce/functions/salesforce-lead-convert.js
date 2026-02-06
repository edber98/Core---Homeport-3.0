const { utils } = require("./utils");

module.exports = {
  async salesforce_lead_convert(node, msg, inputs, opts) {
    const d = inputs || {};
    const leadId = (d.leadId || "").toString().trim();
    if (!leadId) return { ok: false, error: "Missing leadId." };

    const convertedStatus = (d.convertedStatus || "Qualified").trim();

    const body = {
      leadId,
      convertedStatus,
      sendNotificationEmail: false
    };
    if (d.accountId) body.accountId = d.accountId;
    if (d.createOpportunity === false || d.createOpportunity === "false") body.doNotCreateOpportunity = true;

    const res = await utils.sfRequest(opts, "/sobjects/Lead/" + encodeURIComponent(leadId) + "?_HttpMethod=PATCH", {
      method: "POST",
      body: { Status: convertedStatus }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "converted", message: `Lead ${leadId} converted.` };
  }
};
