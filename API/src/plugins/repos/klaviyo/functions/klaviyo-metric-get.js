const { utils } = require('./utils');
module.exports = { async klaviyo_metric_get(node, msg, inputs, opts) { return utils.run('klaviyo_metric_get', inputs || {}, opts || {}); } };
