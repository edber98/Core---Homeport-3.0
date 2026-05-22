const { utils } = require('./utils');

module.exports = {
  async kafka_topic_list_topics(node, msg, inputs, opts) {
    return utils.run('kafka_topic_list_topics', inputs || {}, opts || {});
  }
};
