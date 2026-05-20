const { trelloApi } = require("./utils").utils;

module.exports = {
  async trello_card_add_comment(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      return trelloApi('POST', '/cards/{idCard}/actions/comments', inputs, opts?.credentials, {
        pathParams: ['idCard'],
        bodyParams: ['text']
      });
    }
};
