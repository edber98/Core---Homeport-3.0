const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_label_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/labels/{idLabel}', inputs, opts?.credentials, {
        pathParams: ['idLabel'],
        bodyParams: ['name', 'color']
      });
    }
};
