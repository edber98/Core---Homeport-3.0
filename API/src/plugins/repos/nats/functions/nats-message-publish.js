const { utils } = require('./utils');

module.exports = {
  async nats_message_publish(node, msg, inputs, opts) {
    return utils.run('nats_message_publish', inputs || {}, opts || {});
  }
};
