const { utils } = require("./utils");

module.exports = {
  async stripe_customer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.email) return { ok: false, error: "Missing email." };
    const body = { email: d.email };
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.phone) body.phone = d.phone;
    if (d.metadata) {
      try {
        const meta = typeof d.metadata === "string" ? JSON.parse(d.metadata) : d.metadata;
        if (typeof meta === "object") body.metadata = meta;
      } catch {}
    }
    log('Création en cours...');
    const res = await utils.stripeRequest(opts, "/customers", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
