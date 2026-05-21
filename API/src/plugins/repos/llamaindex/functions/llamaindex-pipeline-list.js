const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_list(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_list', inputs || {}, opts || {});
  }
};
