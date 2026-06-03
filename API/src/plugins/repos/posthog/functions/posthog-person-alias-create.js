const { utils } = require("./utils");

module.exports = {
  async posthog_person_alias_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const distinctId = String(d.distinctId || "").trim();
    const alias = String(d.alias || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };
    if (!alias) return { ok: false, error: "alias requis." };

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event: "$create_alias",
      distinct_id: distinctId,
      properties: { alias }
    };

    log("Creation de l'alias...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event: "$create_alias", distinct_id: distinctId, alias, response: res.data };
  }
};
