const { utils } = require('./utils');

module.exports = {
  async llamaindex_chat_list(node, msg, inputs, opts) {
    return utils.run('llamaindex_chat_list', inputs || {}, opts || {});
  }
};
