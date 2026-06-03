const { utils } = require("./utils");

module.exports = {
  async qonto_sepa_transfer_get(node, msg, inputs, opts) {
    return utils.run("qonto_sepa_transfer_get", inputs || {}, opts || {});
  }
};
