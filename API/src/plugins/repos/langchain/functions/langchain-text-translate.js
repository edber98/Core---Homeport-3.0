const { utils } = require('./utils');
module.exports = { async langchain_text_translate(node, msg, inputs, opts) { return utils.run('langchain_text_translate', inputs || {}, opts || {}); } };
