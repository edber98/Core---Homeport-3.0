const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_label_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/labels/{idLabel}', inputs, opts?.credentials, {
        pathParams: ['idLabel']
      });
    }
};
