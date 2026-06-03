const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_move(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/cards/{idCard}', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['idList', 'idBoard', 'pos']
      });
    }
};
