const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/cards/{idCard}', inputs, opts?.credentials, {
        pathParams: ['idCard']
      });
    }
};
