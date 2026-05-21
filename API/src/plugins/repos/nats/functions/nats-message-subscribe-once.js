const { utils } = require('./utils');

module.exports = {
  async nats_message_subscribe_once(node, msg, inputs, opts) {
    return utils.run('nats_message_subscribe_once', inputs || {}, opts || {});
  }
};
