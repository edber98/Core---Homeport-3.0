const { utils } = require('./utils');

module.exports = {
  async llamaindex_chat_delete(node, msg, inputs, opts) {
    return utils.run('llamaindex_chat_delete', inputs || {}, opts || {});
  }
};
