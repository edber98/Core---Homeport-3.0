const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_label_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/labels/{idLabel}', inputs, opts?.credentials, {
        pathParams: ['idLabel'],
        queryParams: ['fields']
      });
    }
};
