const { utils } = require('./utils');

module.exports = {
  async chromadb_document_query(node, msg, inputs, opts) {
    return utils.run('chromadb_document_query', inputs || {}, opts || {});
  }
};
