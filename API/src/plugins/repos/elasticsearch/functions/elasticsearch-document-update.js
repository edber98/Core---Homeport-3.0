const { utils } = require("./utils");

module.exports = {
  async elasticsearch_document_update(node, msg, inputs, opts) {
    return utils.run("elasticsearch_document_update", inputs || {}, opts || {});
  }
};
