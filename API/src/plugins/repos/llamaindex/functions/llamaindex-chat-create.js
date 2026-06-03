const { utils } = require('./utils');

module.exports = {
  async llamaindex_chat_create(node, msg, inputs, opts) {
    return utils.run('llamaindex_chat_create', inputs || {}, opts || {});
  }
};
