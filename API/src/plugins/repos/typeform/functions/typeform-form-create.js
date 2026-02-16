const { utils } = require("./utils");

module.exports = {
  async typeform_form_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.title || "").trim()) return { ok: false, error: "Missing title." };

    const body = { title: d.title };
    if (d.type) body.type = d.type;
    if (d.workspaceHref) body.workspace = { href: d.workspaceHref };

    log('Création en cours...');
    const res = await utils.typeformRequest(opts, "/forms", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, title: r.title, type: r.type || "", status: r.settings?.is_public ? "public" : "private", language: r.settings?.language || "", createdAt: r.created_at || "", updatedAt: r.last_updated_at || "", link: r._links?.display || "" };
  }
};
