const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_member_cards(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/members/{idMember}/cards', inputs, opts?.credentials, {
        pathParams: ['idMember'],
        queryParams: ['fields']
      });
    }
};
