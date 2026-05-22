const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_get_settings(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_get_settings", inputs || {}, opts || {});
  }
};
