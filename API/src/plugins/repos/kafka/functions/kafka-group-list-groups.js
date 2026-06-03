const { utils } = require('./utils');
module.exports = { async kafka_group_list_groups(node, msg, inputs, opts) { return utils.run('kafka_group_list_groups', inputs || {}, opts || {}); } };
