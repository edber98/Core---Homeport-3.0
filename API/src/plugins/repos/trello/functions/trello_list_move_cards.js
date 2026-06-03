const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_list_move_cards(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/lists/{idList}/moveAllCards', inputs, opts?.credentials, {
        pathParams: ['idList'],
        bodyParams: ['idBoard']
      });
    }
};
