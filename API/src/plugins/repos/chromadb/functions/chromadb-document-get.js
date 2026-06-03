const { utils } = require('./utils');

module.exports = {
  async chromadb_document_get(node, msg, inputs, opts) {
    return utils.run('chromadb_document_get', inputs || {}, opts || {});
  }
};
