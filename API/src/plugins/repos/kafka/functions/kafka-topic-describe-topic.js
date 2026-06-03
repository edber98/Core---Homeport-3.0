const { utils } = require('./utils');

module.exports = {
  async kafka_topic_describe_topic(node, msg, inputs, opts) {
    return utils.run('kafka_topic_describe_topic', inputs || {}, opts || {});
  }
};
