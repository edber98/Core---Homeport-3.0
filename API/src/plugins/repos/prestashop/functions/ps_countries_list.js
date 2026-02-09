const { utils } = require("./utils");

module.exports = {
  async ps_countries_list(node, msg, inputs, opts) {
    const res = await utils.psRequest(opts, "/countries");
    if (!res.ok) return res;
    const items = (res.data && res.data.countries) || [];
    return { ok: true, status: "success", message: items.length + " pays trouvé(s)." };
  }
};
