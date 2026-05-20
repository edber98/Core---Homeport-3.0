const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_webhook_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/webhooks', inputs, opts?.credentials, {
        bodyParams: ['callbackURL', 'idModel', 'description', 'active']
      });
    }
};
