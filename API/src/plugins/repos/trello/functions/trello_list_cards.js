const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_list_cards(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/lists/{idList}/cards', inputs, opts?.credentials, {
        pathParams: ['idList'],
        queryParams: ['fields']
      });
    }
};
