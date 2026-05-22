const { utils } = require("./utils");

module.exports = {
  async elasticsearch_api_request(node, msg, inputs, opts) {
    return utils.run("elasticsearch_api_request", inputs || {}, opts || {});
  }
};
