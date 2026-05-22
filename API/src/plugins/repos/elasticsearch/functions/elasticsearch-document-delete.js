const { utils } = require("./utils");

module.exports = {
  async elasticsearch_document_delete(node, msg, inputs, opts) {
    return utils.run("elasticsearch_document_delete", inputs || {}, opts || {});
  }
};
