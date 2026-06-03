const { utils } = require("./utils");

module.exports = {
  async apollo_contact_get(node, msg, inputs, opts) {
    return utils.run("apollo_contact_get", inputs || {}, opts || {});
  }
};
