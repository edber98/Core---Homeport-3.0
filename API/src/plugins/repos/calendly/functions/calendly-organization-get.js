const { utils } = require("./utils");

module.exports = {
  async calendly_organization_get(node, msg, inputs, opts) {
    const me = await utils.calendlyRequest(opts, "/users/me");
    if (!me.ok) return { ok: false, error: me.error, status: me.status, details: me.details };
    const orgUri = me.data?.resource?.current_organization;
    return { ok: true, status: "success", message: orgUri || "Organisation non trouvée." };
  }
};
