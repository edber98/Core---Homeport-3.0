const { utils } = require("./utils");

module.exports = {
  async wp_tag_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.description) body.description = d.description;

    log('Création en cours...');
    const res = await utils.wpRequest(opts, "/tags", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id), name: r.name || "", slug: r.slug || "", count: String(r.count || 0) };
  }
};
