const { utils } = require("./utils");

module.exports = {
  async qonto_beneficiaries_list(node, msg, inputs, opts) {
    return utils.run("qonto_beneficiaries_list", inputs || {}, opts || {});
  }
};
