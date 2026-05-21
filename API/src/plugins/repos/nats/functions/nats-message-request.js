const { utils } = require('./utils');

module.exports = {
  async nats_message_request(node, msg, inputs, opts) {
    return utils.run('nats_message_request', inputs || {}, opts || {});
  }
};
