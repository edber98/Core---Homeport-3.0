const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_member_boards(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/members/{idMember}/boards', inputs, opts?.credentials, {
        pathParams: ['idMember'],
        queryParams: ['filter', 'fields']
      });
    }
};
