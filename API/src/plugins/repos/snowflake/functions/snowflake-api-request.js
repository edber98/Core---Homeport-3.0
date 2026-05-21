const { utils } = require("./utils");

module.exports = {
  async snowflake_api_request(node, msg, inputs, opts) {
    return utils.run("snowflake_api_request", inputs || {}, opts || {});
  }
};
