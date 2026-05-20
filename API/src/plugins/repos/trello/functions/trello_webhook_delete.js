const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_webhook_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/webhooks/{idWebhook}', inputs, opts?.credentials, {
        pathParams: ['idWebhook']
      });
    }
};
