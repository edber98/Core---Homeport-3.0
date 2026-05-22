const { utils } = require("./utils");

module.exports = {
  async elasticsearch_document_get(node, msg, inputs, opts) {
    return utils.run("elasticsearch_document_get", inputs || {}, opts || {});
  }
};
