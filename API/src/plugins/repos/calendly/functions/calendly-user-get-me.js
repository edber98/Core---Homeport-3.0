const { utils } = require("./utils");

module.exports = {
  async calendly_user_get_me(node, msg, inputs, opts) {
    const res = await utils.calendlyRequest(opts, "/users/me");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.resource) || {};
    return { ok: true, uri: r.uri, name: r.name, email: r.email, slug: r.slug, timezone: r.timezone, schedulingUrl: r.scheduling_url };
  }
};
