const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_board_lists(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/boards/{idBoard}/lists', inputs, opts?.credentials, {
        pathParams: ['idBoard'],
        queryParams: ['filter', 'fields']
      });
    }
};
