const { utils } = require("./utils");

module.exports = {
  async qonto_sepa_transfers_list(node, msg, inputs, opts) {
    return utils.run("qonto_sepa_transfers_list", inputs || {}, opts || {});
  }
};
