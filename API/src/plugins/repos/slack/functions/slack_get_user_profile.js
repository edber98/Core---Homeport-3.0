const { utils } = require("./utils");

module.exports = {
  async slack_get_user_profile(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {};
  if (d.user !== undefined && d.user !== "" && d.user !== null) body.user = d.user;

    const res = await utils.slackRequest(opts, "users.profile.get", body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };

    const p = res.data.profile || res.data;
    return {
      ok: true,
      real_name: p.real_name || "",
      display_name: p.display_name || "",
      email: p.email || "",
      phone: p.phone || "",
      title: p.title || "",
      status_text: p.status_text || "",
      status_emoji: p.status_emoji || ""
    };
  }
};
