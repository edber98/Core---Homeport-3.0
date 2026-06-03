const { utils } = require("./utils");

module.exports = {
  async resend_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const email = String(d.email || "").trim();
    if (!email) return { ok: false, error: "Email requis." };

    const body = { email };
    if (d.firstName) body.firstName = String(d.firstName);
    if (d.lastName) body.lastName = String(d.lastName);
    body.unsubscribed = utils.parseBoolean(d.unsubscribed, false);
    if (d.properties) {
      try { body.properties = utils.parseJsonInput(d.properties, "Propriétés"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.segments) {
      try { body.segments = utils.parseJsonInput(d.segments, "Segments"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.topics) {
      try { body.topics = utils.parseJsonInput(d.topics, "Topics"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Création du contact Resend...");
    const res = await utils.resendRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id, email, success: true };
  }
};
