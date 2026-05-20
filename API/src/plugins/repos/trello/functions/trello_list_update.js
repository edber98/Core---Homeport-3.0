const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_list_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/lists/{idList}', inputs, opts?.credentials, {
        pathParams: ['idList'],
        bodyParams: ['name', 'closed', 'pos', 'subscribed']
      });
    }
};
