const { utils } = require("./utils");

module.exports = {
  async posthog_flags_evaluate(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    let groups = {};
    let personProperties = {};
    let groupProperties = {};
    try {
      groups = utils.parseJsonInput(d.groups, "groups", { defaultValue: {}, allowArray: false });
      personProperties = utils.parseJsonInput(d.personProperties, "personProperties", { defaultValue: {}, allowArray: false });
      groupProperties = utils.parseJsonInput(d.groupProperties, "groupProperties", { defaultValue: {}, allowArray: false });
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const payload = {
      api_key: token,
      distinct_id: distinctId
    };
    if (Object.keys(groups).length) payload.groups = groups;
    if (Object.keys(personProperties).length) payload.person_properties = personProperties;
    if (Object.keys(groupProperties).length) payload.group_properties = groupProperties;

    const query = { v: 2 };
    if (utils.parseBoolean(d.includeConfig, false)) query.config = true;

    log("Evaluation des feature flags...");
    const res = await utils.posthogPublicRequest(opts, "/flags", { method: "POST", query, body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return {
      ok: true,
      status: res.status,
      distinct_id: distinctId,
      flags: data.featureFlags || data.flags || data,
      payloads: data.featureFlagPayloads || data.payloads || {},
      errors: data.errorsWhileComputingFlags || [],
      raw: data
    };
  }
};
