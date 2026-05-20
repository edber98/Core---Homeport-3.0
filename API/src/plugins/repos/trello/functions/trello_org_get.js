const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_org_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/organizations/{idOrg}', inputs, opts?.credentials, {
        pathParams: ['idOrg'],
        queryParams: ['fields']
      });
    }
};
