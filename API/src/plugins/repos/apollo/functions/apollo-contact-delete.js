const { utils } = require("./utils");

module.exports = {
  async apollo_contact_delete(node, msg, inputs, opts) {
    return utils.run("apollo_contact_delete", inputs || {}, opts || {});
  }
};
