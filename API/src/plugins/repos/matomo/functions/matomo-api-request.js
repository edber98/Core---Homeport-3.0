const { utils } = require("./utils");

module.exports = {
  async matomo_api_request(node, msg, inputs, opts) {
    return utils.run("matomo_api_request", inputs || {}, opts || {});
  }
};
