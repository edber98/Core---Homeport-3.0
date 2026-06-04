const { utils } = require("./utils");

module.exports = {
  async fullstory_custom_request(node, msg, inputs, opts) {
    return utils.run("fullstory_custom_request", inputs || {}, opts || {});
  }
};
