const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_board_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/boards/{idBoard}', inputs, opts?.credentials, {
        pathParams: ['idBoard'],
        bodyParams: ['name', 'desc', 'closed']
      });
    }
};
