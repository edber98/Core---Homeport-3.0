const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_document_get(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_document_get', inputs || {}, opts || {});
  }
};
