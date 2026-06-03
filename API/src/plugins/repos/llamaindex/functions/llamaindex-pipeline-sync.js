const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_sync(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_sync', inputs || {}, opts || {});
  }
};
