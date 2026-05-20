const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_board_members(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/boards/{idBoard}/members', inputs, opts?.credentials, {
        pathParams: ['idBoard'],
        queryParams: ['fields']
      });
    }
};
