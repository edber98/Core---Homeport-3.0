const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards', inputs, opts?.credentials, {
        bodyParams: ['idList', 'name', 'desc', 'pos', 'due', 'dueComplete', 'idMembers', 'idLabels', 'urlSource']
      });
    }
};
