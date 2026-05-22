const { utils } = require('./utils');

module.exports = {
  async chromadb_collection_update(node, msg, inputs, opts) {
    return utils.run('chromadb_collection_update', inputs || {}, opts || {});
  }
};
