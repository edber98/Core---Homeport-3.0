const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_bulk(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_bulk", inputs || {}, opts || {});
  }
};
