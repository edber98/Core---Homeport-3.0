const { utils } = require('./utils');
module.exports = { async kafka_topic_create_topic(node, msg, inputs, opts) { return utils.run('kafka_topic_create_topic', inputs || {}, opts || {}); } };
