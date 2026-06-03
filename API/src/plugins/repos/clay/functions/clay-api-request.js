const { utils } = require("./utils");

module.exports = {
  async clay_api_request(node, msg, inputs, opts) {
    return utils.run("clay_api_request", inputs || {}, opts || {});
  }
};
