const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_action_delete(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/actions/{idAction}', inputs, opts?.credentials, {
        pathParams: ['idAction']
      });
    }
};
