const { utils } = require("./utils");

module.exports = {
  async plausible_api_request(node, msg, inputs, opts) {
    return utils.run("plausible_api_request", inputs || {}, opts || {});
  }
};
