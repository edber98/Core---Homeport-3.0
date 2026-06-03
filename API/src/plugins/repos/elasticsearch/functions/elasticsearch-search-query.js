const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_query(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_query", inputs || {}, opts || {});
  }
};
