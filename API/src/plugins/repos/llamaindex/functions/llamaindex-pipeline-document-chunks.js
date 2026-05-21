const { utils } = require('./utils');

module.exports = {
  async llamaindex_pipeline_document_chunks(node, msg, inputs, opts) {
    return utils.run('llamaindex_pipeline_document_chunks', inputs || {}, opts || {});
  }
};
