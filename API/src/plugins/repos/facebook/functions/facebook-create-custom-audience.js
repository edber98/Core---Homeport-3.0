const { utils } = require("./utils");

module.exports = {
  async facebook_create_custom_audience(node, msg, inputs, opts) {
    const d = inputs || {};
    const adAccountId = (d.adAccountId || "").trim();
    if (!adAccountId) return { ok: false, error: "Missing adAccountId." };
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing audience name." };
    const subtype = d.subtype || "CUSTOM";
    const description = (d.description || "").trim();

    const body = { name, subtype };
    if (description) body.description = description;
    if (d.customerFileSource) body.customer_file_source = d.customerFileSource;

    const res = await utils.facebookRequest(opts, `/act_${encodeURIComponent(adAccountId)}/customaudiences`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, name };
  }
};
