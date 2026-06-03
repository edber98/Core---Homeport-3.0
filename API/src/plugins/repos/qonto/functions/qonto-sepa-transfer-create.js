const { utils } = require("./utils");

module.exports = {
  async qonto_sepa_transfer_create(node, msg, inputs, opts) {
    return utils.run("qonto_sepa_transfer_create", inputs || {}, opts || {});
  }
};
