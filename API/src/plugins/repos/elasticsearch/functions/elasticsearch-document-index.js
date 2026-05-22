const { utils } = require("./utils");

module.exports = {
  async elasticsearch_document_index(node, msg, inputs, opts) {
    return utils.run("elasticsearch_document_index", inputs || {}, opts || {});
  }
};
