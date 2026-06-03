const { utils } = require("./utils");

module.exports = {
  async apollo_contacts_search(node, msg, inputs, opts) {
    return utils.run("apollo_contacts_search", inputs || {}, opts || {});
  }
};
