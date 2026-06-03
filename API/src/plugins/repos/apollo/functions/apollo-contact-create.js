const { utils } = require("./utils");

module.exports = {
  async apollo_contact_create(node, msg, inputs, opts) {
    return utils.run("apollo_contact_create", inputs || {}, opts || {});
  }
};
