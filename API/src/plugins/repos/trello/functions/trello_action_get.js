const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_action_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/actions/{idAction}', inputs, opts?.credentials, {
        pathParams: ['idAction'],
        queryParams: ['fields']
      });
    }
};
