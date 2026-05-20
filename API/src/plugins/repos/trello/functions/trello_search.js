const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_search(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/search', inputs, opts?.credentials, {
        queryParams: ['query', 'idBoards', 'idOrganizations', 'modelTypes', 'cards_limit', 'boards_limit']
      });
    }
};
