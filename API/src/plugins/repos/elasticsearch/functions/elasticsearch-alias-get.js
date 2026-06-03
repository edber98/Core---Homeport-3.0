const { utils } = require("./utils");

module.exports = {
  async elasticsearch_alias_get(node, msg, inputs, opts) {
    return utils.run("elasticsearch_alias_get", inputs || {}, opts || {});
  }
};
