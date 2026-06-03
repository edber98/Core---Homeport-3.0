const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_webhook_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
        pathParams: ['idWebhook'],
        bodyParams: ['callbackURL', 'idModel', 'description', 'active']
      });
    }
};
