const { utils } = require("./utils");

module.exports = {
  async plausible_custom_request(node, msg, inputs, opts) {
    return utils.run("plausible_custom_request", inputs || {}, opts || {});
  }
};
