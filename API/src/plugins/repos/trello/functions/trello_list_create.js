const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_list_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/lists', inputs, opts?.credentials, {
        bodyParams: ['name', 'idBoard', 'pos']
      });
    }
};
