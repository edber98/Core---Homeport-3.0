const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_attachments(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/cards/{idCard}/attachments', inputs, opts?.credentials, {
        pathParams: ['idCard']
      });
    }
};
