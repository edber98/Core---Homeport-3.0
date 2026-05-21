const { utils } = require("./utils");

module.exports = {
  async heap_identity_identify(node, msg, inputs, opts) {
    return utils.run("heap_identity_identify", inputs || {}, opts || {});
  }
};
