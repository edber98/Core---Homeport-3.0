const { utils } = require("./utils");

module.exports = {
  async ps_manufacturers_list(node, msg, inputs, opts) {
    const res = await utils.psRequest(opts, "/manufacturers");
    if (!res.ok) return res;
    const items = (res.data && res.data.manufacturers) || [];
    return { ok: true, status: "success", message: items.length + " fabricant(s) trouvé(s)." };
  }
};
