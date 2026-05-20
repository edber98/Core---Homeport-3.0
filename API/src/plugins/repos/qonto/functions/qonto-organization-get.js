const { utils } = require("./utils");

module.exports = {
  async qonto_organization_get(node, msg, inputs, opts) {
    return utils.run("qonto_organization_get", inputs || {}, opts || {});
  }
};
