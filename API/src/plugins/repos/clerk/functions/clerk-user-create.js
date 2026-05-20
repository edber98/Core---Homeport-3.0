const { utils } = require("./utils");

module.exports = {
  async clerk_user_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
    const emails = utils.parseList(d.emailAddresses);
    if (!emails.length) return { ok: false, error: "Au moins un email est requis." };
    body.email_address = emails;
    if (d.firstName) body.first_name = String(d.firstName);
    if (d.lastName) body.last_name = String(d.lastName);
    if (d.username) body.username = String(d.username);
    if (d.password) body.password = String(d.password);
    if (d.skipPasswordChecks !== undefined && d.skipPasswordChecks !== "") body.skip_password_checks = utils.parseBoolean(d.skipPasswordChecks, false);
    if (d.skipPasswordRequirement !== undefined && d.skipPasswordRequirement !== "") body.skip_password_requirement = utils.parseBoolean(d.skipPasswordRequirement, false);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.privateMetadata) {
      try { body.private_metadata = utils.parseJsonInput(d.privateMetadata, "Métadonnées privées"); } catch (e) { return { ok: false, error: e.message }; }
    }
    log("Création de l'utilisateur Clerk...");
    const res = await utils.clerkRequest(opts, "/users", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactUser(res.data || {}) };
  }
};
