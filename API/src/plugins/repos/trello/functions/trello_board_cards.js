const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_board_cards(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/boards/{idBoard}/cards', inputs, opts?.credentials, {
        pathParams: ['idBoard'],
        queryParams: ['fields']
      });
    }
};
