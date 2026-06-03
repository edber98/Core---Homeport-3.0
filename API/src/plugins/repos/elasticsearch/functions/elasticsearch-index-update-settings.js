const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_update_settings(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_update_settings", inputs || {}, opts || {});
  }
};
