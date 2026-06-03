const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_remove_label(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/cards/{idCard}/idLabels/{idLabel}', inputs, opts?.credentials, {
        pathParams: ['idCard', 'idLabel']
      });
    }
};
