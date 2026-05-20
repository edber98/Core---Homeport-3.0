const { utils } = require("./utils");

module.exports = {
  async qonto_beneficiary_create(node, msg, inputs, opts) {
    return utils.run("qonto_beneficiary_create", inputs || {}, opts || {});
  }
};
