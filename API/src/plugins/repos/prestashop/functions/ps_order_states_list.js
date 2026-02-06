const { utils } = require("./utils");

module.exports = {
  async ps_order_states_list(node, msg, inputs, opts) {
    const res = await utils.psRequest(opts, "/order_states");
    if (!res.ok) return res;
    const items = (res.data && res.data.order_states) || [];
    return { ok: true, status: "success", message: items.length + " état(s) de commande trouvé(s)." };
  }
};
