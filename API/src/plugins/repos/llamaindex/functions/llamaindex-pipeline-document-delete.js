const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_document_delete(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_document_delete', inputs || {}, opts || {});
  }
};
