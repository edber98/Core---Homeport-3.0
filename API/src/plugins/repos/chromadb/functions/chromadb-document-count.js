const { utils } = require('./utils');

module.exports = {
  async chromadb_document_count(node, msg, inputs, opts) {
    return utils.run('chromadb_document_count', inputs || {}, opts || {});
  }
};
