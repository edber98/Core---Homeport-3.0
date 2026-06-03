const { utils } = require('./utils');

module.exports = {
  async nats_jetstream_js_streams_list(node, msg, inputs, opts) {
    return utils.run('nats_jetstream_js_streams_list', inputs || {}, opts || {});
  }
};
