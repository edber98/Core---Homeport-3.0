const { utils } = require('./utils');
module.exports = { async langchain_sentiment_analyze(node, msg, inputs, opts) { return utils.run('langchain_sentiment_analyze', inputs || {}, opts || {}); } };
