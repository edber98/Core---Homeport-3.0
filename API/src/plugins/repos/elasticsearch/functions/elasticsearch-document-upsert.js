const { utils } = require("./utils");

module.exports = {
  async elasticsearch_document_upsert(node, msg, inputs, opts) {
    return utils.run("elasticsearch_document_upsert", inputs || {}, opts || {});
  }
};
