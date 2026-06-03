const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_member_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/members/{idMember}', inputs, opts?.credentials, {
        pathParams: ['idMember'],
        queryParams: ['fields']
      });
    }
};
