const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_org_members(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/organizations/{idOrg}/members', inputs, opts?.credentials, {
        pathParams: ['idOrg'],
        queryParams: ['fields']
      });
    }
};
