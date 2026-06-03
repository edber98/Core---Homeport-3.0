const { utils } = require('./utils');

module.exports = {
  async nats_jetstream_js_consumers_list(node, msg, inputs, opts) {
    return utils.run('nats_jetstream_js_consumers_list', inputs || {}, opts || {});
  }
};
