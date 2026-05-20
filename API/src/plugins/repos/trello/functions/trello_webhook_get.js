const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_webhook_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
        pathParams: ['idWebhook']
      });
    }
};
