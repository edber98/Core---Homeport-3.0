const { utils } = require('./utils');

module.exports = {
  async chromadb_collection_get(node, msg, inputs, opts) {
    return utils.run('chromadb_collection_get', inputs || {}, opts || {});
  }
};
