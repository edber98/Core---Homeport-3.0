const { utils } = require('./utils');

module.exports = {
  async nats_jetstream_js_fetch(node, msg, inputs, opts) {
    return utils.run('nats_jetstream_js_fetch', inputs || {}, opts || {});
  }
};
