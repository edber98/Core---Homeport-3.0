const { utils } = require('./utils');

module.exports = {
  async chromadb_document_peek(node, msg, inputs, opts) {
    return utils.run('chromadb_document_peek', inputs || {}, opts || {});
  }
};
