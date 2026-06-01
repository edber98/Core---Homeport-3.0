const { utils } = require('./utils');
module.exports = { async langchain_keywords_extract(node, msg, inputs, opts) { return utils.run('langchain_keywords_extract', inputs || {}, opts || {}); } };
