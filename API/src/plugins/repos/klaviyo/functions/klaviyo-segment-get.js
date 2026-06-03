const { utils } = require('./utils');
module.exports = { async klaviyo_segment_get(node, msg, inputs, opts) { return utils.run('klaviyo_segment_get', inputs || {}, opts || {}); } };
