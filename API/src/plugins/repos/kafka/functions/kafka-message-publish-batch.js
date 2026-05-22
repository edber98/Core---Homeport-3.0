const { utils } = require('./utils');

module.exports = {
  async kafka_message_publish_batch(node, msg, inputs, opts) {
    return utils.run('kafka_message_publish_batch', inputs || {}, opts || {});
  }
};
