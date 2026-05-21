const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_count(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_count", inputs || {}, opts || {});
  }
};
