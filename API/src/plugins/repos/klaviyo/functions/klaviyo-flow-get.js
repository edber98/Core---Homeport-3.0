const { utils } = require('./utils');
module.exports = { async klaviyo_flow_get(node, msg, inputs, opts) { return utils.run('klaviyo_flow_get', inputs || {}, opts || {}); } };
