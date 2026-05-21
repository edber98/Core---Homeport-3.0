const { utils } = require("./utils");

module.exports = {
  async heap_user_add_properties(node, msg, inputs, opts) {
    return utils.run("heap_user_add_properties", inputs || {}, opts || {});
  }
};
