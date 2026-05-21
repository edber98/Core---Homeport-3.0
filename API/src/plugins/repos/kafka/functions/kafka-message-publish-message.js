const { utils } = require('./utils');

module.exports = {
  async kafka_message_publish_message(node, msg, inputs, opts) {
    return utils.run('kafka_message_publish_message', inputs || {}, opts || {});
  }
};
