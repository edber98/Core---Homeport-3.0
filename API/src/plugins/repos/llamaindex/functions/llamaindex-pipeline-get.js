const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_get(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_get', inputs || {}, opts || {});
  }
};
