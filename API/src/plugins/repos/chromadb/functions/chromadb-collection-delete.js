const { utils } = require('./utils');

module.exports = {
  async chromadb_collection_delete(node, msg, inputs, opts) {
    return utils.run('chromadb_collection_delete', inputs || {}, opts || {});
  }
};
