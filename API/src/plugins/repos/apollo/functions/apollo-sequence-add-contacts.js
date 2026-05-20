const { utils } = require("./utils");

module.exports = {
  async apollo_sequence_add_contacts(node, msg, inputs, opts) {
    return utils.run("apollo_sequence_add_contacts", inputs || {}, opts || {});
  }
};
