const { utils } = require('./utils');

module.exports = {
  async chromadb_document_upsert(node, msg, inputs, opts) {
    return utils.run('chromadb_document_upsert', inputs || {}, opts || {});
  }
};
