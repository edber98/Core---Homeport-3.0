const { utils } = require("./utils");

module.exports = {
  async runway_organization_get(node, msg, inputs, opts) {
    return utils.run("runway_organization_get", inputs || {}, opts || {});
  }
};
