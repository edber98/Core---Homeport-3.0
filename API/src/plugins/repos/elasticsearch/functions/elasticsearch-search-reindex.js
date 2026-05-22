const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_reindex(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_reindex", inputs || {}, opts || {});
  }
};
