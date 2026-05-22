const { utils } = require("./utils");

module.exports = {
  async apollo_sequences_list(node, msg, inputs, opts) {
    return utils.run("apollo_sequences_list", inputs || {}, opts || {});
  }
};
