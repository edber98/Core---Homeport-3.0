const { utils } = require('./utils');
module.exports = { async kafka_topic_delete_topic(node, msg, inputs, opts) { return utils.run('kafka_topic_delete_topic', inputs || {}, opts || {}); } };
