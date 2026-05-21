const { utils } = require("./utils");

module.exports = {
  async elasticsearch_search_msearch(node, msg, inputs, opts) {
    return utils.run("elasticsearch_search_msearch", inputs || {}, opts || {});
  }
};
