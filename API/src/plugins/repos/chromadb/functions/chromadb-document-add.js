const { utils } = require('./utils');

module.exports = {
  async chromadb_document_add(node, msg, inputs, opts) {
    return utils.run('chromadb_document_add', inputs || {}, opts || {});
  }
};
