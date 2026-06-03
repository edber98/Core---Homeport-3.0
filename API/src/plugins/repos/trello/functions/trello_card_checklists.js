const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_checklists(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('GET', '/cards/{idCard}/checklists', inputs, opts?.credentials, {
        pathParams: ['idCard']
      });
    }
};
