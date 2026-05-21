const { utils } = require("./utils");

module.exports = {
  async elasticsearch_alias_update(node, msg, inputs, opts) {
    return utils.run("elasticsearch_alias_update", inputs || {}, opts || {});
  }
};
