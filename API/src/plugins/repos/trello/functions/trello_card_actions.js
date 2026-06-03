const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_actions(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/cards/{idCard}/actions', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        queryParams: ['filter', 'limit']
      });
    }
};
