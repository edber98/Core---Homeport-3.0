const { utils } = require("./utils");

module.exports = {
  async heap_api_request(node, msg, inputs, opts) {
    return utils.run("heap_api_request", inputs || {}, opts || {});
  }
};
