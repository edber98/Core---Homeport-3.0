const { utils } = require("./utils");

module.exports = {
  async facebook_create_post(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const message = (d.message || "").trim();
    if (!message) return { ok: false, error: "Missing message." };

    const body = { message };
    if (d.link) body.link = d.link.trim();

    log('Création en cours...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/feed`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, message, pageId };
  }
};
