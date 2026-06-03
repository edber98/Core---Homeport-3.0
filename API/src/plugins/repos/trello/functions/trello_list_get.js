const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_list_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/lists/{idList}', inputs, opts?.credentials, {
        pathParams: ['idList'],
        queryParams: ['fields']
      });
    }
};
