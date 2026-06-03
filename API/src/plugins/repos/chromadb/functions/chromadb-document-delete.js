const { utils } = require('./utils');

module.exports = {
  async chromadb_document_delete(node, msg, inputs, opts) {
    return utils.run('chromadb_document_delete', inputs || {}, opts || {});
  }
};
