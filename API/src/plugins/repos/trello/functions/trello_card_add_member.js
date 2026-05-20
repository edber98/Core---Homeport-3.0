const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_add_member(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards/{idCard}/idMembers', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['value']
      });
    }
};
