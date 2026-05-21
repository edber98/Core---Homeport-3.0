const { utils } = require("./utils");

module.exports = {
  async elasticsearch_index_create(node, msg, inputs, opts) {
    return utils.run("elasticsearch_index_create", inputs || {}, opts || {});
  }
};
