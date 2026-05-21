const { utils } = require("./utils");

module.exports = {
  async fullstory_api_request(node, msg, inputs, opts) {
    return utils.run("fullstory_api_request", inputs || {}, opts || {});
  }
};
