const { utils } = require("./utils");

module.exports = {
  async mixpanel_alias_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const alias = String(d.alias || "").trim();
    const distinctId = String(d.distinctId || "").trim();
    if (!alias || !distinctId) return { ok: false, error: "alias et distinctId sont requis." };

    let token;
    try { token = utils.ensureProjectToken(opts); } catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      event: "$create_alias",
      properties: { alias, distinct_id: distinctId, token }
    };

    const res = await utils.mixpanelIngestRequest(opts, "/track#identity-create-alias", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: payload
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Alias créé.", distinct_id: distinctId, raw: res.data };
  }
};
