const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/cards/{idCard}', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        queryParams: ['fields', 'attachments', 'members']
      });
    }
};
