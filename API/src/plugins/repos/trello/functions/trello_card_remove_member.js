const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_remove_member(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('DELETE', '/cards/{idCard}/idMembers/{idMember}', inputs, opts?.credentials, {
        pathParams: ['idCard', 'idMember']
      });
    }
};
