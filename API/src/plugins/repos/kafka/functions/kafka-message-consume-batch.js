const { utils } = require('./utils');

module.exports = {
  async kafka_message_consume_batch(node, msg, inputs, opts) {
    return utils.run('kafka_message_consume_batch', inputs || {}, opts || {});
  }
};
