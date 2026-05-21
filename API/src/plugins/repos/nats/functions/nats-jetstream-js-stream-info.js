const { utils } = require('./utils');

module.exports = {
  async nats_jetstream_js_stream_info(node, msg, inputs, opts) {
    return utils.run('nats_jetstream_js_stream_info', inputs || {}, opts || {});
  }
};
