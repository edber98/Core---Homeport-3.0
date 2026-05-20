const { utils } = require("./utils");

module.exports = {
  async qonto_memberships_list(node, msg, inputs, opts) {
    return utils.run("qonto_memberships_list", inputs || {}, opts || {});
  }
};
