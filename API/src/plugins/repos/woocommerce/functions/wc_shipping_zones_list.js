const { utils } = require("./utils");

module.exports = {
  async wc_shipping_zones_list(node, msg, inputs, opts) {
    const res = await utils.wcRequest(opts, "/shipping/zones");
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    return { ok: true, status: "success", message: items.length + " zone(s) trouvée(s)." };
  }
};
