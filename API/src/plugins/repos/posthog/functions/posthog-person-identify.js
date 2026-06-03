const { utils } = require("./utils");

module.exports = {
  async posthog_person_identify(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let setProperties = {};
    let unsetProperties = [];
    try {
      setProperties = utils.parseJsonInput(d.setProperties, "setProperties", { defaultValue: {}, allowArray: false });
      unsetProperties = utils.parseJsonInput(d.unsetProperties, "unsetProperties", { defaultValue: [], allowArray: true, allowObject: false });
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const props = {};
    if (setProperties && Object.keys(setProperties).length) props.$set = setProperties;
    if (Array.isArray(unsetProperties) && unsetProperties.length) props.$unset = unsetProperties;
    if (!Object.keys(props).length) return { ok: false, error: "setProperties ou unsetProperties requis." };

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event: "$identify",
      distinct_id: distinctId,
      properties: props
    };

    log("Identification de la personne...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event: "$identify", distinct_id: distinctId, response: res.data };
  }
};
