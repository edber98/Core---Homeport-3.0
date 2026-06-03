const { utils } = require('./utils');
module.exports = { async klaviyo_template_get(node, msg, inputs, opts) { return utils.run('klaviyo_template_get', inputs || {}, opts || {}); } };
