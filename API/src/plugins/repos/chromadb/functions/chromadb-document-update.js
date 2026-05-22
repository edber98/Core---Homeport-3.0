const { utils } = require('./utils');

module.exports = {
  async chromadb_document_update(node, msg, inputs, opts) {
    return utils.run('chromadb_document_update', inputs || {}, opts || {});
  }
};
