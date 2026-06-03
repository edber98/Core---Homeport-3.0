const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_update_by_query(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_update_by_query", inputs || {}, opts || {});
  }
};
