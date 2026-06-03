const { utils } = require("./utils");

module.exports = {
  async apollo_contact_update(node, msg, inputs, opts) {
    return utils.run("apollo_contact_update", inputs || {}, opts || {});
  }
};
