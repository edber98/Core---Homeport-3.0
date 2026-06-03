const { utils } = require('./utils');

module.exports = {
  async kafka_offset_fetch_topic_offsets(node, msg, inputs, opts) {
    return utils.run('kafka_offset_fetch_topic_offsets', inputs || {}, opts || {});
  }
};
