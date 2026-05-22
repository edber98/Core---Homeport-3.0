const { utils } = require("./utils");

module.exports = {
  async clickhouse_api_request(node, msg, inputs, opts) {
    return utils.run("clickhouse_api_request", inputs || {}, opts || {});
  }
};
