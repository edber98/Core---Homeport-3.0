const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_retrieve(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_retrieve', inputs || {}, opts || {});
  }
};
