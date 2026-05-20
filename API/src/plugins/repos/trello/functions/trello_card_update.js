const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('PUT', '/cards/{idCard}', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['name', 'desc', 'closed', 'idList', 'idBoard', 'pos', 'due', 'dueComplete', 'idMembers', 'idLabels']
      });
    }
};
