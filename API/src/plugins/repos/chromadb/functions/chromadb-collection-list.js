const { utils } = require('./utils');

module.exports = {
  async chromadb_collection_list(node, msg, inputs, opts) {
    return utils.run('chromadb_collection_list', inputs || {}, opts || {});
  }
};
