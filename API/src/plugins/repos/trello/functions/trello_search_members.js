const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_search_members(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/search/members', inputs, opts?.credentials, {
        queryParams: ['query', 'limit', 'idBoard', 'idOrganization']
      });
    }
};
